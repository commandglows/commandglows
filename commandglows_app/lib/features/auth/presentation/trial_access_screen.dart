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
    this.restartError,
    this.purchaseError,
  });

  final ProductEntitlement? entitlement;
  final bool isRestarting;
  final Future<void> Function() onRestart;
  final bool isPurchasing;
  final Future<void> Function()? onPurchase;
  final String? restartError;
  final String? purchaseError;

  bool get _canRestart => entitlement?.canRestartTrial ?? false;

  String get _message {
    if (_canRestart) {
      final remaining = entitlement?.trialRestartsRemaining ?? 0;
      return 'Votre période d’essai est terminée. Il vous reste $remaining relance${remaining > 1 ? 's' : ''} de 30 jours.';
    }
    if ((entitlement?.trialAttempt ?? 0) >= 3) {
      return 'Vos deux relances d’essai ont été utilisées. Choisissez une offre pour continuer à utiliser CommandGlows.';
    }
    return 'Votre accès d’essai n’est pas actif. Choisissez une offre pour continuer à utiliser CommandGlows.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: AppInsets.screen,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
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
                      accentColor: Theme.of(context).colorScheme.error,
                    ),
                  ],
                  if (purchaseError != null) ...[
                    AppGaps.x2,
                    AppBannerCard(
                      icon: Icons.error_outline,
                      title: 'Achat indisponible',
                      message: purchaseError!,
                      accentColor: Theme.of(context).colorScheme.error,
                    ),
                  ],
                  AppGaps.x3,
                  FilledButton.icon(
                    onPressed: isPurchasing ? null : onPurchase,
                    icon: isPurchasing
                        ? const SizedBox.square(
                            dimension: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.shopping_bag_outlined),
                    label: Text(
                      isPurchasing ? 'Ouverture…' : 'Acheter CommandGlows',
                    ),
                  ),
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
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.refresh),
                      label: Text(
                        isRestarting
                            ? 'Vérification…'
                            : 'Demander une relance de 30 jours',
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
