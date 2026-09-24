import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../domain/product_entitlement.dart';

class TrialAccessScreen extends StatelessWidget {
  const TrialAccessScreen({
    super.key,
    required this.entitlement,
    required this.isRestarting,
    required this.onRestart,
    required this.isPurchasing,
    this.onPurchase,
    this.purchaseActionLabel = 'Acheter CommandGlows',
    this.onViewOffers,
    this.onStartTrial,
    this.isStartingTrial = false,
    this.trialStartError,
    this.showTrialAccessVerification = false,
    this.restartError,
    this.purchaseError,
    this.checkoutOpened = false,
    this.onVerifyAccess,
    this.onChangeAccount,
  });

  final ProductEntitlement? entitlement;
  final bool isRestarting;
  final Future<void> Function() onRestart;
  final bool isPurchasing;
  final Future<void> Function()? onPurchase;
  final String purchaseActionLabel;
  final VoidCallback? onViewOffers;
  final Future<void> Function()? onStartTrial;
  final bool isStartingTrial;
  final String? trialStartError;
  final bool showTrialAccessVerification;
  final String? restartError;
  final String? purchaseError;
  final bool checkoutOpened;
  final VoidCallback? onVerifyAccess;
  final Future<void> Function()? onChangeAccount;

  bool get _canRestart => entitlement?.canRestartTrial ?? false;
  bool get _canStartTrial => (entitlement?.trialAttempt ?? 0) == 0;

  String get _message {
    if (_canRestart) {
      final remaining = entitlement?.trialRestartsRemaining ?? 0;
      return 'Votre période d’essai est terminée. Il vous reste $remaining relance${remaining > 1 ? 's' : ''} de 30 jours.';
    }
    if ((entitlement?.trialAttempt ?? 0) >= 3) {
      return 'Vos deux relances d’essai ont été utilisées. Choisissez une offre pour continuer à utiliser CommandGlows.';
    }
    return _canStartTrial
        ? 'Votre compte est prêt. Démarrez votre essai gratuit ou découvrez les offres.'
        : 'Votre accès d’essai n’est pas actif. Choisissez une offre pour continuer à utiliser CommandGlows.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final screenInsets = AppInsets.screen;
            final availableHeight =
                constraints.maxHeight > screenInsets.vertical
                ? constraints.maxHeight - screenInsets.vertical
                : 0.0;
            return SingleChildScrollView(
              padding: screenInsets,
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: availableHeight),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 480),
                    child: IntrinsicHeight(
                      child: AppSectionCard(
                        leading: const Icon(Icons.lock_clock_outlined),
                        title: 'Accès CommandGlows',
                        subtitle: _message,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (entitlement?.trialExpiresAt != null)
                              Text(
                                'Dernière échéance : ${MaterialLocalizations.of(context).formatMediumDate(entitlement!.trialExpiresAt!.toLocal())}',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            if (restartError != null) ...[
                              AppGaps.x2,
                              AppBannerCard(
                                icon: Icons.error_outline,
                                title: 'Relance impossible',
                                message: restartError!,
                                accentColor: Theme.of(
                                  context,
                                ).colorScheme.error,
                              ),
                            ],
                            if (purchaseError != null) ...[
                              AppGaps.x2,
                              AppBannerCard(
                                icon: Icons.error_outline,
                                title: 'Achat indisponible',
                                message: purchaseError!,
                                accentColor: Theme.of(
                                  context,
                                ).colorScheme.error,
                              ),
                            ],
                            if (trialStartError != null) ...[
                              AppGaps.x2,
                              AppBannerCard(
                                icon: Icons.error_outline,
                                title: 'Demande d’essai non confirmée',
                                message: trialStartError!,
                                accentColor: Theme.of(
                                  context,
                                ).colorScheme.error,
                              ),
                              if (showTrialAccessVerification &&
                                  onVerifyAccess != null) ...[
                                AppGaps.x2,
                                OutlinedButton.icon(
                                  onPressed: onVerifyAccess,
                                  icon: const Icon(Icons.refresh),
                                  label: const Text('Vérifier mon accès'),
                                ),
                              ],
                            ],
                            AppGaps.x3,
                            if (_canStartTrial && onStartTrial != null) ...[
                              FilledButton.icon(
                                onPressed: isStartingTrial
                                    ? null
                                    : onStartTrial,
                                icon: isStartingTrial
                                    ? const SizedBox.square(
                                        dimension: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.play_arrow),
                                label: Text(
                                  isStartingTrial
                                      ? 'Activation…'
                                      : 'Démarrer mon essai gratuit',
                                ),
                              ),
                              AppGaps.x2,
                            ],
                            if (checkoutOpened) ...[
                              AppBannerCard(
                                icon: Icons.open_in_browser_outlined,
                                title: 'Vérification nécessaire',
                                message:
                                    'Le paiement a été ouvert, mais ton accès n’est pas encore confirmé.',
                                accentColor: Theme.of(
                                  context,
                                ).colorScheme.primary,
                              ),
                              AppGaps.x2,
                              FilledButton.icon(
                                onPressed: onVerifyAccess,
                                icon: const Icon(Icons.verified_user_outlined),
                                label: const Text('Vérifier mon accès'),
                              ),
                              AppGaps.x2,
                            ],
                            OutlinedButton.icon(
                              onPressed: isPurchasing
                                  ? null
                                  : (onPurchase ?? onViewOffers),
                              icon: isPurchasing
                                  ? const SizedBox.square(
                                      dimension: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Icon(Icons.shopping_bag_outlined),
                              label: Text(
                                isPurchasing
                                    ? 'Ouverture…'
                                    : purchaseActionLabel,
                              ),
                            ),
                            if (onViewOffers != null && onPurchase != null) ...[
                              AppGaps.x2,
                              TextButton.icon(
                                onPressed: onViewOffers,
                                icon: const Icon(
                                  Icons.open_in_browser_outlined,
                                ),
                                label: const Text('Voir toutes les offres'),
                              ),
                            ],
                            if (_canRestart) ...[
                              AppGaps.x2,
                              OutlinedButton.icon(
                                onPressed: isRestarting
                                    ? null
                                    : () async {
                                        await onRestart();
                                      },
                                icon: isRestarting
                                    ? const SizedBox.square(
                                        dimension: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.refresh),
                                label: Text(
                                  isRestarting
                                      ? 'Vérification…'
                                      : 'Demander une relance de 30 jours',
                                ),
                              ),
                            ],
                            if (onChangeAccount != null) ...[
                              AppGaps.x2,
                              TextButton(
                                onPressed: onChangeAccount,
                                child: const Text('Changer de compte'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
