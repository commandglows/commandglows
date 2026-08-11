import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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

  Future<void> _restartTrial() async {
    setState(() => _isRestarting = true);
    try {
      final session = await ref.read(authSessionProvider.future);
      if (!session.isSignedIn ||
          session.isLocalFallback ||
          session.user == null) {
        return;
      }
      final bridgeClient = ref.read(suiteIdentityBridgeClientProvider);
      final resolveIdToken = ref.read(firebaseIdTokenResolverProvider);
      final installationIdStore = ref.read(installationIdStoreProvider);
      final user = session.user!;
      await bridgeClient.resolveFromFirebaseSession(
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
      ref.invalidate(suiteIdentityProvider);
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
          return const AppShellScreen();
        }
        final identityAsync = ref.watch(suiteIdentityProvider);
        return identityAsync.when(
          loading: () => const _AccessLoadingScreen(),
          error: (error, stackTrace) => TrialAccessScreen(
            entitlement: null,
            isRestarting: _isRestarting,
            onRestart: _restartTrial,
          ),
          data: (identity) {
            if (identity.statusFor(ProductId.commandglowsApp) ==
                SuiteAccountStatus.accessActive) {
              return const AppShellScreen();
            }
            ProductEntitlement? commandGlowsEntitlement;
            for (final entitlement in identity.entitlements) {
              if (entitlement.productId == ProductId.commandglowsApp) {
                commandGlowsEntitlement = entitlement;
                break;
              }
            }
            return TrialAccessScreen(
              entitlement: commandGlowsEntitlement,
              isRestarting: _isRestarting,
              onRestart: _restartTrial,
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
