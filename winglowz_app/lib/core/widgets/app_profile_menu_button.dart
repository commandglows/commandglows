import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/commandglows_app.dart';
import '../theme/app_theme.dart';

enum AppProfileMenuAction {
  account,
  voice,
  keyboard,
  overlay,
  localKeys,
  maintenance,
  themeSystem,
  themeLight,
  themeDark,
}

class AppProfileMenuButton extends ConsumerWidget {
  const AppProfileMenuButton({super.key});
  static const double _webScale = 1.5;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeTheme = ref.watch(appThemeModeProvider);

    return PopupMenuButton<AppProfileMenuAction>(
      tooltip: 'Mon espace',
      onSelected: (value) => _handleAction(context, ref, value),
      itemBuilder: (context) => [
        const PopupMenuItem<AppProfileMenuAction>(
          value: AppProfileMenuAction.account,
          child: ListTile(
            dense: true,
            leading: Icon(Icons.cloud_sync_outlined),
            title: Text('Mon compte'),
            subtitle: Text('Compte et synchronisation'),
          ),
        ),
        const PopupMenuItem<AppProfileMenuAction>(
          value: AppProfileMenuAction.voice,
          child: ListTile(
            dense: true,
            leading: Icon(Icons.graphic_eq_outlined),
            title: Text('Voix'),
            subtitle: Text('Dictée et packs locaux'),
          ),
        ),
        const PopupMenuItem<AppProfileMenuAction>(
          value: AppProfileMenuAction.keyboard,
          child: ListTile(
            dense: true,
            leading: Icon(Icons.keyboard_outlined),
            title: Text('Clavier'),
            subtitle: Text('Réglages du clavier'),
          ),
        ),
        const PopupMenuItem<AppProfileMenuAction>(
          value: AppProfileMenuAction.overlay,
          child: ListTile(
            dense: true,
            leading: Icon(Icons.bubble_chart_outlined),
            title: Text('Overlay'),
            subtitle: Text('Bulle et permissions'),
          ),
        ),
        const PopupMenuItem<AppProfileMenuAction>(
          value: AppProfileMenuAction.localKeys,
          child: ListTile(
            dense: true,
            leading: Icon(Icons.key_outlined),
            title: Text('Clés IA locales'),
            subtitle: Text('Secrets sur l’appareil'),
          ),
        ),
        const PopupMenuItem<AppProfileMenuAction>(
          value: AppProfileMenuAction.maintenance,
          child: ListTile(
            dense: true,
            leading: Icon(Icons.admin_panel_settings_outlined),
            title: Text('Maintenance'),
            subtitle: Text('Support et diagnostics'),
          ),
        ),
        const PopupMenuDivider(),
        CheckedPopupMenuItem<AppProfileMenuAction>(
          value: AppProfileMenuAction.themeSystem,
          checked: activeTheme == AppThemeMode.system,
          child: const Text('Thème système'),
        ),
        CheckedPopupMenuItem<AppProfileMenuAction>(
          value: AppProfileMenuAction.themeLight,
          checked: activeTheme == AppThemeMode.light,
          child: const Text('Thème clair'),
        ),
        CheckedPopupMenuItem<AppProfileMenuAction>(
          value: AppProfileMenuAction.themeDark,
          checked: activeTheme == AppThemeMode.dark,
          child: const Text('Thème sombre'),
        ),
      ],
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: kIsWeb ? 22 * _webScale : 22,
            backgroundColor: Theme.of(
              context,
            ).colorScheme.primary.withValues(alpha: 0.12),
            foregroundColor: Theme.of(context).colorScheme.primary,
            child: Icon(
              Icons.people_alt_outlined,
              size: kIsWeb ? 22 * _webScale : 22,
            ),
          ),
        ],
      ),
    );
  }

  static void _handleAction(
    BuildContext context,
    WidgetRef ref,
    AppProfileMenuAction action,
  ) {
    switch (action) {
      case AppProfileMenuAction.account:
        context.push('/settings?section=account_cloud');
      case AppProfileMenuAction.voice:
        context.push('/settings?section=voice_packs');
      case AppProfileMenuAction.keyboard:
        context.push('/settings?section=keyboard');
      case AppProfileMenuAction.overlay:
        context.push('/settings?section=overlay');
      case AppProfileMenuAction.localKeys:
        context.push('/settings?section=keys');
      case AppProfileMenuAction.maintenance:
        context.push('/settings?section=maintenance');
      case AppProfileMenuAction.themeSystem:
        ref.read(appThemeModeProvider.notifier).setMode(AppThemeMode.system);
      case AppProfileMenuAction.themeLight:
        ref.read(appThemeModeProvider.notifier).setMode(AppThemeMode.light);
      case AppProfileMenuAction.themeDark:
        ref.read(appThemeModeProvider.notifier).setMode(AppThemeMode.dark);
    }
  }
}
