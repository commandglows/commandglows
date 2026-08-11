import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/bootstrap/suite_identity_bridge_bootstrap.dart';
import '../../../core/diagnostics/app_diagnostics.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../domain/auth_failure.dart';
import '../application/auth_session_provider.dart';
import '../application/suite_identity_provider.dart';
import '../domain/product_entitlement.dart';
import '../domain/suite_identity.dart';
import '../../shell/presentation/app_shell_screen.dart';
import 'sign_in_screen.dart';
import 'trial_access_screen.dart';

class AuthGateScreen extends ConsumerStatefulWidget {
  const AuthGateScreen({super.key});

  @override
  ConsumerState<AuthGateScreen> createState() => _AuthGateScreenState();
}

class _AuthGateScreenState extends ConsumerState<AuthGateScreen> {
  bool _isRestarting = false;
  bool _isPurchasing = false;
  String? _restartError;
  String? _purchaseError;

  Future<void> _startPurchase(String? checkoutIdentityToken) async {
    if (checkoutIdentityToken == null) return;
    setState(() {
      _isPurchasing = true;
      _purchaseError = null;
    });
    try {
      final checkoutUri = await ref
          .read(suiteIdentityBridgeClientProvider)
          .startStripeCheckout(
            bridgeConfig: SuiteIdentityBridgeBootstrap.config,
            checkoutIdentityToken: checkoutIdentityToken,
          );
      if (checkoutUri == null ||
          !await launchUrl(checkoutUri, mode: LaunchMode.externalApplication)) {
        throw StateError('checkout_unavailable');
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _purchaseError =
              'Le checkout Stripe ne peut pas être ouvert pour le moment.';
        });
      }
    } finally {
      if (mounted) setState(() => _isPurchasing = false);
    }
  }

  Future<void> _restartTrial() async {
    setState(() {
      _isRestarting = true;
      _restartError = null;
    });
    try {
      final session = await ref.read(authSessionProvider.future);
      if (!session.isSignedIn ||
          session.isLocalFallback ||
          session.user == null) {
        setState(() {
          _restartError =
              'Reconnectez-vous à votre compte pour demander une relance.';
        });
        return;
      }
      final bridgeClient = ref.read(suiteIdentityBridgeClientProvider);
      final resolveIdToken = ref.read(firebaseIdTokenResolverProvider);
      final installationIdStore = ref.read(installationIdStoreProvider);
      final user = session.user!;
      final identity = await bridgeClient.resolveFromFirebaseSession(
        bridgeConfig: SuiteIdentityBridgeBootstrap.config,
        firebaseAccount: SuiteIdentityAccount(
          provider: SuiteIdentityProvider.firebase,
          providerUserId: user.id,
          email: user.email,
        ),
        resolveIdToken: resolveIdToken,
        installationId: await installationIdStore.readOrCreate(),
        requestTrialRestart: true,
      );
      if (identity.statusFor(ProductId.commandglowsApp) !=
          SuiteAccountStatus.accessActive) {
        final entitlement = identity.entitlementFor(ProductId.commandglowsApp);
        setState(() {
          _restartError = (entitlement?.trialAttempt ?? 0) >= 3
              ? 'Les deux relances autorisées ont déjà été utilisées. L’achat est désormais nécessaire.'
              : 'La relance n’a pas pu être accordée. Vérifiez votre connexion ou choisissez une offre.';
        });
      }
      ref.invalidate(suiteIdentityProvider);
    } catch (_) {
      if (mounted) {
        setState(() {
          _restartError =
              'La relance n’a pas pu être vérifiée. Réessayez dans quelques instants.';
        });
      }
    } finally {
      if (mounted) setState(() => _isRestarting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(authSessionProvider);
    return sessionAsync.when(
      data: (session) {
        if (!session.isSignedIn && !session.isLocalFallback) {
          return const SignInScreen();
        }
        if (session.isLocalFallback) {
          return const SignInScreen(remoteOnly: true);
        }
        final identityAsync = ref.watch(suiteIdentityProvider);
        return identityAsync.when(
          loading: () => const _AccessLoadingScreen(),
          error: (error, stackTrace) => TrialAccessScreen(
            entitlement: null,
            isRestarting: _isRestarting,
            isPurchasing: _isPurchasing,
            onRestart: _restartTrial,
            restartError: _restartError,
            purchaseError: _purchaseError,
          ),
          data: (identity) {
            if (identity.statusFor(ProductId.commandglowsApp) ==
                SuiteAccountStatus.accessActive) {
              return const AppShellScreen();
            }
            final commandGlowsEntitlement = identity.entitlementFor(
              ProductId.commandglowsApp,
            );
            return TrialAccessScreen(
              entitlement: commandGlowsEntitlement,
              isRestarting: _isRestarting,
              isPurchasing: _isPurchasing,
              onPurchase: identity.checkoutIdentityToken == null
                  ? null
                  : () => _startPurchase(identity.checkoutIdentityToken),
              onRestart: _restartTrial,
              restartError: _restartError,
              purchaseError: _purchaseError,
            );
          },
        );
      },
      loading: () => const Scaffold(
        body: Center(
          child: Padding(
            padding: AppInsets.screen,
            child: SizedBox(
              width: AppLayoutMetrics.authGateLoadingCardWidth,
              child: AppSectionCard(
                title: 'Session',
                subtitle: 'Vérification de la session en cours.',
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          ),
        ),
      ),
      error: (error, stack) {
        final detail = AuthFailure.redact(error);
        AppDiagnostics.record('auth_state_error', detail);
        return Scaffold(
          body: Center(
            child: Padding(
              padding: AppInsets.screen,
              child: SizedBox(
                width: AppLayoutMetrics.authGateErrorCardWidth,
                child: AppBannerCard(
                  icon: Icons.error_outline,
                  title: 'Session indisponible',
                  message: 'Session indisponible pour le moment. $detail',
                  accentColor: Theme.of(context).colorScheme.error,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _AccessLoadingScreen extends StatelessWidget {
  const _AccessLoadingScreen();

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}
