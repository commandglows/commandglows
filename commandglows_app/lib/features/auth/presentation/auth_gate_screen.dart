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
  bool _isStartingTrial = false;
  bool _trialNeedsAccessVerification = false;
  bool _isPurchasing = false;
  bool _checkoutOpened = false;
  String? _restartError;
  String? _trialStartError;
  String? _purchaseError;

  Uri get _offersUri => Uri.https(
    'www.commandglows.com',
    Localizations.localeOf(context).languageCode == 'fr'
        ? '/fr/commandglows-founder'
        : '/commandglows-founder',
  );

  Future<void> _viewOffers() async {
    try {
      if (!await launchUrl(_offersUri, mode: LaunchMode.externalApplication)) {
        throw StateError('offers_unavailable');
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _purchaseError =
              'La page des offres ne peut pas être ouverte pour le moment.';
        });
      }
    }
  }

  Future<void> _startTrial() async {
    var bridgeRequestStarted = false;
    setState(() {
      _isStartingTrial = true;
      _trialStartError = null;
      _trialNeedsAccessVerification = false;
    });
    try {
      final session = await ref.read(authSessionProvider.future);
      final user = session.user;
      if (!session.isSignedIn || session.isLocalFallback || user == null) {
        throw StateError('signed_in_account_required');
      }
      final bridgeClient = ref.read(suiteIdentityBridgeClientProvider);
      final installationId = await ref
          .read(installationIdStoreProvider)
          .readOrCreate();
      bridgeRequestStarted = true;
      final identity = await bridgeClient.resolveFromFirebaseSession(
        bridgeConfig: SuiteIdentityBridgeBootstrap.config,
        firebaseAccount: SuiteIdentityAccount(
          provider: SuiteIdentityProvider.firebase,
          providerUserId: user.id,
          email: user.email,
        ),
        resolveIdToken: ref.read(firebaseIdTokenResolverProvider),
        installationId: installationId,
        requestTrialStart: true,
      );
      if (identity.statusFor(ProductId.commandglowsApp) !=
          SuiteAccountStatus.accessActive) {
        if (mounted) {
          setState(() {
            _trialStartError = _trialRequestFeedback(identity.trialRequest);
            _trialNeedsAccessVerification =
                switch (identity.trialRequest?.state) {
                  TrialRequestState.noResponse ||
                  TrialRequestState.httpError ||
                  TrialRequestState.granted ||
                  TrialRequestState.alreadyActive ||
                  TrialRequestState.responseUnknown => true,
                  _ => false,
                };
          });
        }
        return;
      }
      ref.invalidate(suiteIdentityProvider);
    } catch (_) {
      if (mounted) {
        setState(() {
          _trialStartError = bridgeRequestStarted
              ? 'Nous n’avons pas reçu de confirmation. La demande a peut-être été enregistrée : vérifiez votre accès avant de réessayer.'
              : 'La demande n’a pas été envoyée. Vérifiez votre connexion ou votre session, puis réessayez. Vous pouvez aussi consulter les offres.';
          _trialNeedsAccessVerification = bridgeRequestStarted;
        });
      }
    } finally {
      if (mounted) setState(() => _isStartingTrial = false);
    }
  }

  String _trialRequestFeedback(TrialRequestResult? result) {
    if (result == null || result.state == TrialRequestState.notSent) {
      return 'La demande n’a pas été envoyée. Vérifiez votre connexion ou votre session, puis réessayez. Vous pouvez aussi consulter les offres.';
    }

    final correlation = result.responseReceived && result.requestId != null
        ? ' Référence support : ${result.requestId}.'
        : '';
    switch (result.state) {
      case TrialRequestState.notSent:
        return 'La demande n’a pas été envoyée. Vérifiez votre connexion ou votre session, puis réessayez. Vous pouvez aussi consulter les offres.';
      case TrialRequestState.noResponse:
        return 'Nous n’avons pas reçu de confirmation. La demande a peut-être été enregistrée. Vérifiez votre accès avant de recommencer.$correlation';
      case TrialRequestState.httpError:
        final recovery = switch (result.machineErrorCode) {
          'invalid_firebase_token' =>
            'Votre session n’a pas pu être vérifiée. Reconnectez-vous, puis réessayez.',
          'trial_installation_signal_unavailable' =>
            'Nous n’avons pas pu vérifier cette installation. Réessayez plus tard ou contactez le support.',
          _ =>
            'Le service d’essai n’a pas pu terminer la demande. Vérifiez votre accès avant de recommencer, ou réessayez plus tard.',
        };
        return '$recovery$correlation';
      case TrialRequestState.denied:
        final reason = switch (result.reasonCode) {
          'installation_not_eligible' =>
            'Cette installation ne peut pas bénéficier d’un essai gratuit. Nous ne pouvons pas préciser davantage. Consultez les offres ou contactez le support.',
          'previous_trial_exists' =>
            'Un essai gratuit a déjà été utilisé pour ce compte. Consultez les offres pour continuer.',
          'trial_cycles_exhausted' =>
            'Les périodes d’essai disponibles ont toutes été utilisées pour ce compte. Consultez les offres pour continuer.',
          'temporary_rate_limit' =>
            'Le service limite le nombre de demandes sur une courte période. Réessayez plus tard ou consultez les offres.',
          'active_paid_access' =>
            'Un accès payant est déjà associé à ce compte. Actualisez votre accès ou contactez le support.',
          _ =>
            'Le serveur n’a pas accordé l’essai. Votre accès à l’app n’a pas changé. Consultez les offres ou contactez le support.',
        };
        return '$reason$correlation';
      case TrialRequestState.granted:
      case TrialRequestState.alreadyActive:
      case TrialRequestState.responseUnknown:
        return 'La réponse ne confirme pas encore l’accès à l’app. Vérifiez votre accès avant de recommencer.$correlation';
    }
  }

  Future<void> _startPurchase(String? checkoutIdentityToken) async {
    if (checkoutIdentityToken == null) {
      await _viewOffers();
      return;
    }
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
        await _viewOffers();
        return;
      }
      if (mounted) setState(() => _checkoutOpened = true);
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

  void _retryAccess() {
    setState(() {
      _restartError = null;
      _purchaseError = null;
    });
    ref.invalidate(suiteIdentityProvider);
  }

  Future<void> _changeAccount() async {
    await ref.read(authSessionStoreProvider).signOut();
    ref.invalidate(suiteIdentityProvider);
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
          error: (error, stackTrace) => _AccessUnavailableScreen(
            onRetry: _retryAccess,
            onChangeAccount: _changeAccount,
            detail: AuthFailure.redact(error),
          ),
          data: (identity) {
            final accessStatus = identity.statusFor(ProductId.commandglowsApp);
            if (accessStatus == SuiteAccountStatus.accessActive) {
              return const AppShellScreen();
            }
            if (accessStatus == SuiteAccountStatus.unavailable ||
                accessStatus == SuiteAccountStatus.unknown ||
                accessStatus == SuiteAccountStatus.linkingRequired) {
              return _AccessUnavailableScreen(
                onRetry: _retryAccess,
                onChangeAccount: _changeAccount,
                detail: identity.supportSummary,
              );
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
              purchaseActionLabel: identity.checkoutIdentityToken == null
                  ? 'Voir les offres et acheter'
                  : 'Acheter CommandGlows',
              onViewOffers: _viewOffers,
              onStartTrial: (commandGlowsEntitlement?.trialAttempt ?? 0) == 0
                  ? _startTrial
                  : null,
              isStartingTrial: _isStartingTrial,
              trialStartError: _trialStartError,
              showTrialAccessVerification: _trialNeedsAccessVerification,
              onRestart: _restartTrial,
              restartError: _restartError,
              purchaseError: _purchaseError,
              checkoutOpened: _checkoutOpened,
              onVerifyAccess: _retryAccess,
              onChangeAccount: _changeAccount,
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
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Semantics(
        liveRegion: true,
        label: 'Nous vérifions ton accès à CommandGlows.',
        child: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            AppGaps.x2,
            Text('Nous vérifions ton accès à CommandGlows.'),
          ],
        ),
      ),
    ),
  );
}

class _AccessUnavailableScreen extends StatelessWidget {
  const _AccessUnavailableScreen({
    required this.onRetry,
    required this.onChangeAccount,
    required this.detail,
  });

  final VoidCallback onRetry;
  final Future<void> Function() onChangeAccount;
  final String detail;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Padding(
        padding: AppInsets.screen,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: AppSectionCard(
            leading: const Icon(Icons.cloud_off_outlined),
            title: 'Impossible de vérifier ton accès',
            subtitle:
                'La connexion à notre service d’accès a été interrompue. Aucun achat n’est nécessaire tant que la vérification n’a pas abouti.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Réessayer'),
                ),
                AppGaps.x2,
                OutlinedButton(
                  onPressed: onChangeAccount,
                  child: const Text('Changer de compte'),
                ),
                AppGaps.x2,
                ExpansionTile(
                  title: const Text('Détails techniques'),
                  children: [
                    Padding(
                      padding: AppInsets.card,
                      child: SelectableText(detail),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
