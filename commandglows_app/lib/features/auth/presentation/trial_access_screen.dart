import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../domain/product_entitlement.dart';

class TrialAccessScreen extends StatelessWidget {
  const TrialAccessScreen({
    super.key,
    required this.entitlement,
    required this.isRestarting,
    required this.onRestart,
  });

  final ProductEntitlement? entitlement;
  final bool isRestarting;
  final Future<void> Function() onRestart;

  bool get _canRestart =>
      entitlement?.status == ProductEntitlementStatus.trialing &&
      !entitlement!.grantsAccess;

  String get _message {
    if (_canRestart) {
      return 'Votre période d’essai est terminée. Vous pouvez demander une nouvelle période si elle est encore disponible.';
    }
    return 'Votre accès d’essai n’est pas actif. Choisissez une offre pour continuer à utiliser CommandGlows.';
  }

  Future<void> _openPurchase() async {
    await launchUrl(
      Uri.parse('https://www.commandglows.com/commandglows-founder'),
      mode: LaunchMode.externalApplication,
    );
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
                  AppGaps.x3,
                  FilledButton.icon(
                    onPressed: _openPurchase,
                    icon: const Icon(Icons.shopping_bag_outlined),
                    label: const Text('Voir les offres'),
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
                            : 'Demander une relance de 14 jours',
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
