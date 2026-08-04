import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../domain/custom_action_buttons.dart';

class CustomActionBarSurface extends StatelessWidget {
  const CustomActionBarSurface({
    super.key,
    required this.layout,
    required this.busy,
    required this.onRun,
    required this.isEnabled,
  });

  final CustomActionBarLayout layout;
  final bool busy;
  final ValueChanged<CustomActionButtonRecord> onRun;
  final bool isEnabled;

  @override
  Widget build(BuildContext context) {
    final rows = layout.rows;
    if (rows.isEmpty) {
      return const AppEmptyStateCard(
        title: 'Barre d’action vide',
        message: 'Ajoute un bouton pour voir une barre d’action globale.',
      );
    }

    final buttons = rows
        .expand((row) => row.slots)
        .map((slot) => slot.button)
        .toList(growable: false);

    return AppSectionCard(
      title: 'Barre d’action',
      subtitle: 'Prévisualisation horizontale pour la surface dédiée.',
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final button in buttons) ...[
              _ActionSurfaceChip(
                button: button,
                busy: busy,
                onRun: onRun,
                isEnabled: isEnabled,
              ),
              AppGaps.horizontalX2,
            ],
          ],
        ),
      ),
    );
  }
}

class _ActionSurfaceChip extends StatelessWidget {
  const _ActionSurfaceChip({
    required this.button,
    required this.busy,
    required this.onRun,
    required this.isEnabled,
  });

  final bool busy;
  final CustomActionButtonRecord button;
  final ValueChanged<CustomActionButtonRecord> onRun;
  final bool isEnabled;

  @override
  Widget build(BuildContext context) {
    final compatible = button.action.isImeCompatible;
    final canRun = compatible && isEnabled && !busy;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: AppLayoutMetrics.customActionChipWidth,
          child: Tooltip(
            message: button.action.imeCompatibilityReason,
            child: FilledButton.tonalIcon(
              onPressed: canRun ? () => onRun(button) : null,
              icon: Icon(button.icon.iconData),
              label: Text(button.title, overflow: TextOverflow.ellipsis),
            ),
          ),
        ),
        AppGaps.x1,
        SizedBox(
          width: AppLayoutMetrics.customActionChipWidth,
          child: Text(
            button.action.imeCompatibilitySummary,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ),
      ],
    );
  }
}
