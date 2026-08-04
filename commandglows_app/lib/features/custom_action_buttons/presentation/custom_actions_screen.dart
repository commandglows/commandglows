import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/diagnostics/app_diagnostics.dart';
import '../../../core/platform/android_keyboard_bridge.dart';
import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../../../core/widgets/app_profile_menu_button.dart';
import '../../settings/application/settings_store_provider.dart';
import '../application/custom_action_bar_preferences.dart';
import '../domain/custom_action_buttons.dart';
import '../../snippets/presentation/custom_action_buttons_panel.dart';

class CustomActionsScreen extends ConsumerStatefulWidget {
  const CustomActionsScreen({super.key});

  @override
  ConsumerState<CustomActionsScreen> createState() =>
      _CustomActionsScreenState();
}

class _CustomActionsScreenState extends ConsumerState<CustomActionsScreen> {
  final _searchController = TextEditingController();
  List<CustomActionButtonRecord> _items = const [];
  bool _itemsLoaded = false;
  bool _syncBusy = false;
  bool? _pendingSyncEnabled;
  String? _syncMessage;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearchChanged);
    Future<void>.microtask(() {
      ref.read(customActionBarEnabledProvider.notifier).syncFromSettings();
    });
  }

  @override
  void dispose() {
    _searchController.removeListener(_handleSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _handleSearchChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<bool>(customActionBarEnabledProvider, (previous, next) {
      if (previous != null && previous != next) {
        _requestKeyboardConfigSync(enabled: next);
      }
    });
    return CustomActionButtonsPanel(
      surfaceSelector: _ActionsPageHeader(
        searchController: _searchController,
        searchQuery: _searchController.text,
        syncBusy: _syncBusy,
        syncMessage: _syncMessage,
        compatibleCount: _items.toAndroidImeActions().length,
        totalCount: _items.length,
        visibleCount: _visibleItems().length,
        onSync: () {
          final enabled = ref.read(customActionBarEnabledProvider);
          _requestKeyboardConfigSync(enabled: enabled, force: true);
        },
      ),
      searchQuery: _searchController.text.trim().toLowerCase(),
      onItemsChanged: (items) {
        if (mounted) {
          setState(() {
            _items = items;
            _itemsLoaded = true;
          });
        } else {
          _items = items;
          _itemsLoaded = true;
        }
        final enabled = ref.read(customActionBarEnabledProvider);
        _requestKeyboardConfigSync(enabled: enabled);
      },
    );
  }

  List<CustomActionButtonRecord> _visibleItems() {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) {
      return _items;
    }
    return _items
        .where((item) {
          final subtitle =
              'rangée ${item.rowIndex + 1} · ${item.action.kind.label} · ${item.action.value} · ${item.action.imeCompatibilitySummary}'
                  .toLowerCase();
          return item.title.toLowerCase().contains(query) ||
              subtitle.contains(query) ||
              item.action.value.toLowerCase().contains(query);
        })
        .toList(growable: false);
  }

  void _requestKeyboardConfigSync({required bool enabled, bool force = false}) {
    if (!_itemsLoaded && !force) {
      _pendingSyncEnabled = enabled;
      return;
    }
    if (_syncBusy) {
      _pendingSyncEnabled = enabled;
      return;
    }
    _pendingSyncEnabled = null;
    unawaited(_syncKeyboardConfig(enabled: enabled));
  }

  Future<void> _syncKeyboardConfig({required bool enabled}) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    setState(() {
      _syncBusy = true;
      _syncMessage = null;
    });
    try {
      final settingsStore = ref.read(settingsStoreProvider);
      final current = await settingsStore.load();
      if (current.customActionBarEnabled != enabled) {
        await settingsStore.save(
          current.copyWith(customActionBarEnabled: enabled),
        );
      }
      final status = await AndroidKeyboardBridge.setCustomActionBarConfig(
        CustomActionButtonImeConfig(
          enabled: enabled,
          actions: _items.toAndroidImeActions(),
        ),
      );
      if (!mounted) {
        return;
      }
      setState(
        () => _syncMessage = status.customActionBarEnabled
            ? 'Barre synchronisée avec le clavier Android.'
            : 'Barre désactivée dans le clavier Android.',
      );
      AppDiagnostics.record(
        'custom_action_bar_sync',
        'enabled=$enabled; actions=${_items.toAndroidImeActions().length}',
      );
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _syncMessage =
            'Synchronisation clavier impossible (${error.code}) : ${error.message}',
      );
      AppDiagnostics.record('custom_action_bar_sync_error', error);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _syncMessage = 'Synchronisation clavier impossible: $error',
      );
      AppDiagnostics.record('custom_action_bar_sync_error', error);
    } finally {
      if (mounted) {
        setState(() => _syncBusy = false);
      }
      final pending = _pendingSyncEnabled;
      _pendingSyncEnabled = null;
      if (pending != null && pending != enabled) {
        _requestKeyboardConfigSync(enabled: pending, force: true);
      } else if (pending != null && _itemsLoaded) {
        _requestKeyboardConfigSync(enabled: pending, force: true);
      }
    }
  }
}

class _ActionsPageHeader extends StatelessWidget {
  const _ActionsPageHeader({
    required this.searchController,
    required this.searchQuery,
    required this.syncBusy,
    required this.syncMessage,
    required this.compatibleCount,
    required this.totalCount,
    required this.visibleCount,
    required this.onSync,
  });

  final TextEditingController searchController;
  final String searchQuery;
  final bool syncBusy;
  final String? syncMessage;
  final int compatibleCount;
  final int totalCount;
  final int visibleCount;
  final VoidCallback onSync;

  @override
  Widget build(BuildContext context) {
    return AppPageHeroCard(
      title: 'Fil actions',
      subtitle:
          'Compose et retrouve tes actions avec le même point d’entrée que sur l’accueil, puis filtre la bibliothèque par titre, type ou commande.',
      leadingIcon: Icons.smart_button_outlined,
      trailing: const AppProfileMenuButton(),
      metrics: [
        AppMetricPill(
          icon: Icons.view_week_outlined,
          label: '$totalCount',
          value: totalCount > 1 ? 'boutons' : 'bouton',
        ),
        AppMetricPill(
          icon: Icons.keyboard_outlined,
          label: '$compatibleCount',
          value: 'compatibles IME',
        ),
        AppMetricPill(
          icon: Icons.search_outlined,
          label: '$visibleCount',
          value: visibleCount > 1 ? 'résultats' : 'résultat',
        ),
      ],
      searchField: AppSearchField(
        controller: searchController,
        query: searchQuery,
        enabled: totalCount > 0,
        scopeLabel: 'Actions',
        hintText: 'Rechercher une action',
        onChanged: (_) {},
        onClear: searchController.clear,
      ),
      syncAction: OutlinedButton.icon(
        onPressed: syncBusy ? null : onSync,
        icon: syncBusy
            ? const SizedBox.square(
                dimension: AppIconMetrics.sm,
                child: CircularProgressIndicator(
                  strokeWidth: AppIconMetrics.progressStroke,
                ),
              )
            : const Icon(Icons.sync_outlined),
        label: const Text('Synchroniser le clavier'),
      ),
      footer: syncMessage == null
          ? null
          : AppBannerCard(
              icon: syncMessage!.contains('impossible')
                  ? Icons.info_outline
                  : Icons.check_circle_outline,
              title: 'Synchronisation clavier',
              message: syncMessage!,
            ),
    );
  }
}
