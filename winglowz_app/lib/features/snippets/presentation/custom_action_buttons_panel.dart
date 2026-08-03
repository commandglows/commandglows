import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../../../core/widgets/confirm_action_dialog.dart';
import '../../custom_action_buttons/application/custom_action_bar_preferences.dart';
import '../../custom_action_buttons/application/custom_action_button_runner.dart';
import '../../custom_action_buttons/application/custom_action_button_store_provider.dart';
import '../../custom_action_buttons/presentation/custom_action_buttons_surface.dart';
import '../../custom_action_buttons/domain/custom_action_buttons.dart';
import '../../settings/application/settings_store_provider.dart';

class CustomActionButtonsPanel extends ConsumerStatefulWidget {
  const CustomActionButtonsPanel({
    super.key,
    required this.surfaceSelector,
    this.searchQuery = '',
    this.onItemsChanged,
  });

  final Widget surfaceSelector;
  final String searchQuery;
  final ValueChanged<List<CustomActionButtonRecord>>? onItemsChanged;

  @override
  ConsumerState<CustomActionButtonsPanel> createState() =>
      _CustomActionButtonsPanelState();
}

class _CustomActionButtonsPanelState
    extends ConsumerState<CustomActionButtonsPanel> {
  final _titleController = TextEditingController();
  final _valueController = TextEditingController();
  final _runner = const CustomActionButtonRunner();

  List<CustomActionButtonRecord> _items = const [];
  CustomActionKind _selectedKind = CustomActionKind.insertText;
  CustomActionButtonIcon _selectedIcon = CustomActionButtonIcon.spark;
  int _selectedRowIndex = 0;
  bool _busy = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(_load);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _valueController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final rows = await ref.read(customActionButtonStoreProvider).list();
      widget.onItemsChanged?.call(rows);
      if (mounted) {
        setState(() => _items = rows);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Chargement boutons impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _add() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await ref
          .read(customActionButtonStoreProvider)
          .insert(
            title: _titleController.text,
            icon: _selectedIcon,
            action: CustomActionButtonAction(
              kind: _selectedKind,
              value: _valueController.text,
            ),
            rowIndex: _selectedRowIndex,
          );
      _titleController.clear();
      _valueController.clear();
      _selectedKind = CustomActionKind.insertText;
      _selectedIcon = CustomActionButtonIcon.spark;
      _selectedRowIndex = 0;
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Création bouton impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _edit(CustomActionButtonRecord item) async {
    final titleController = TextEditingController(text: item.title);
    final valueController = TextEditingController(text: item.action.value);
    var kind = item.action.kind;
    var icon = item.icon;
    var rowIndex = item.rowIndex;
    final submit = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setLocalState) {
            return AlertDialog(
              title: const Text('Modifier le bouton'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(labelText: 'Nom'),
                    ),
                    AppGaps.x2,
                    _ActionKindSelector(
                      selected: kind,
                      onSelected: (next) {
                        setLocalState(() {
                          kind = next;
                          if (!next.requiresFreeText) {
                            valueController.text = next.defaultValue;
                          }
                        });
                      },
                    ),
                    AppGaps.x2,
                    _ActionValueField(controller: valueController, kind: kind),
                    AppGaps.x2,
                    _IconSelector(
                      selected: icon,
                      onSelected: (next) => setLocalState(() => icon = next),
                    ),
                    AppGaps.x2,
                    _RowSelector(
                      selected: rowIndex,
                      onSelected: (next) =>
                          setLocalState(() => rowIndex = next),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Annuler'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Enregistrer'),
                ),
              ],
            );
          },
        );
      },
    );

    if (submit != true) {
      titleController.dispose();
      valueController.dispose();
      return;
    }

    setState(() => _busy = true);
    try {
      await ref
          .read(customActionButtonStoreProvider)
          .update(
            id: item.id,
            title: titleController.text,
            icon: icon,
            action: CustomActionButtonAction(
              kind: kind,
              value: valueController.text,
            ),
            rowIndex: rowIndex,
            orderIndex: item.orderIndex,
          );
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Mise à jour bouton impossible: $error');
      }
    } finally {
      titleController.dispose();
      valueController.dispose();
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _remove(CustomActionButtonRecord item) async {
    final settings = await ref.read(settingsStoreProvider).load();
    if (!mounted) {
      return;
    }
    final confirmed = await showConfirmActionDialog(
      context: context,
      title: 'Supprimer le bouton ?',
      message:
          'Cette action retire définitivement ce bouton personnalisé de ta bibliothèque.',
      confirmLabel: 'Supprimer',
      destructive: true,
      confirmationEnabled: settings.confirmDestructiveActions,
    );
    if (!mounted || !confirmed) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(customActionButtonStoreProvider).softDelete(item.id);
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Suppression bouton impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _run(CustomActionButtonRecord item) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    final result = await _runner.run(item);
    if (!mounted) {
      return;
    }
    setState(() {
      _busy = false;
      _message = result.message;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isActionBarEnabled = ref.watch(customActionBarEnabledProvider);
    final visibleItems = _visibleItems(widget.searchQuery);
    return ListView(
      padding: AppInsets.screen,
      children: [
        widget.surfaceSelector,
        AppGaps.x2,
        _ActionBarActivationToggle(
          isEnabled: isActionBarEnabled,
          onChanged: (value) {
            ref.read(customActionBarEnabledProvider.notifier).setEnabled(value);
          },
        ),
        AppGaps.x2,
        ProductSummaryStrip(
          children: [
            const AppLocalModeStatusPill(),
            AppMetricPill(
              icon: Icons.smart_button_outlined,
              label: '${_items.length}',
              value: _items.length > 1 ? 'boutons' : 'bouton',
            ),
            AppMetricPill(
              icon: Icons.view_week_outlined,
              label: '${CustomActionBarLayout.fromButtons(_items).rows.length}',
              value: 'rangées',
            ),
            AppMetricPill(
              icon: Icons.desktop_windows_outlined,
              label: _desktopSupportLabel,
              value: 'exécution',
            ),
          ],
        ),
        AppGaps.x2,
        CustomActionBarSurface(
          layout: CustomActionBarLayout.fromButtons(_items),
          busy: _busy,
          onRun: _run,
          isEnabled: isActionBarEnabled,
        ),
        AppGaps.x2,
        AppSectionCard(
          title: 'Nouveau bouton',
          subtitle:
              'Crée un bouton de barre d’action avec icône, rangée et action typée.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppFieldRow(
                children: [
                  TextField(
                    key: const Key('custom-button-title-field'),
                    controller: _titleController,
                    decoration: const InputDecoration(
                      labelText: 'Nom du bouton',
                    ),
                  ),
                  _ActionKindSelector(
                    selected: _selectedKind,
                    onSelected: _selectActionKind,
                  ),
                ],
              ),
              AppGaps.x2,
              _ActionValueField(
                controller: _valueController,
                kind: _selectedKind,
              ),
              AppGaps.x2,
              _IconSelector(
                selected: _selectedIcon,
                onSelected: (next) => setState(() => _selectedIcon = next),
              ),
              AppGaps.x2,
              _RowSelector(
                selected: _selectedRowIndex,
                onSelected: (next) => setState(() => _selectedRowIndex = next),
              ),
              AppGaps.x2,
              Align(
                alignment: Alignment.centerLeft,
                child: FilledButton.icon(
                  key: const Key('custom-button-create-button'),
                  onPressed: _busy ? null : _add,
                  icon: const Icon(Icons.add_circle_outline),
                  label: const Text('Créer le bouton'),
                ),
              ),
            ],
          ),
        ),
        AppGaps.x2,
        if (_message != null)
          AppBannerCard(
            icon: _message!.contains('impossible') || _message!.contains('non')
                ? Icons.info_outline
                : Icons.check_circle_outline,
            title: 'Statut boutons',
            message: _message!,
          ),
        if (_message != null) AppGaps.x2,
        if (_items.isEmpty)
          const AppEmptyStateCard(
            title: 'Aucun bouton',
            message:
                'Crée ton premier bouton pour lancer un texte, une expression clavier ou une séquence desktop.',
          )
        else if (visibleItems.isEmpty)
          const AppEmptyStateCard(
            title: 'Aucun résultat',
            message: 'Aucune action ne correspond à cette recherche.',
          )
        else
          AppSectionCard(
            title: 'Boutons personnalisés',
            padding: AppInsets.compactCard,
            stretch: false,
            child: Column(
              children: [
                for (final item in visibleItems) ...[
                  AppEntityCard(
                    leading: Icon(item.icon.iconData),
                    title: Text(item.title),
                    subtitle: Text(_subtitle(item)),
                    bodyMaxLines: 3,
                    actions: [
                      IconButton(
                        tooltip: 'Lancer',
                        onPressed: _busy ? null : () => _run(item),
                        icon: const Icon(Icons.play_arrow_outlined),
                      ),
                      IconButton(
                        tooltip: 'Modifier',
                        onPressed: _busy ? null : () => _edit(item),
                        icon: const Icon(Icons.edit_outlined),
                      ),
                      IconButton(
                        tooltip: 'Supprimer',
                        onPressed: _busy ? null : () => _remove(item),
                        icon: const Icon(Icons.delete_outline),
                      ),
                    ],
                  ),
                  AppGaps.x1,
                ],
              ],
            ),
          ),
      ],
    );
  }

  void _selectActionKind(CustomActionKind next) {
    setState(() {
      _selectedKind = next;
      if (!next.requiresFreeText) {
        _valueController.text = next.defaultValue;
      }
    });
  }

  String _subtitle(CustomActionButtonRecord item) {
    final actionLabel = item.action.kind.label;
    final valueLabel = _valueLabel(item.action);
    final imeSummary = item.action.imeCompatibilitySummary;
    return 'Rangée ${item.rowIndex + 1} · $actionLabel · $valueLabel · $imeSummary';
  }

  List<CustomActionButtonRecord> _visibleItems(String rawQuery) {
    final query = rawQuery.trim().toLowerCase();
    if (query.isEmpty) {
      return _items;
    }
    return _items
        .where((item) {
          final subtitle = _subtitle(item).toLowerCase();
          return item.title.toLowerCase().contains(query) ||
              subtitle.contains(query) ||
              item.action.value.toLowerCase().contains(query);
        })
        .toList(growable: false);
  }

  String _valueLabel(CustomActionButtonAction action) {
    return switch (action.kind) {
      CustomActionKind.clipboardCommand =>
        CustomClipboardCommandPresentation.fromName(action.value).label,
      CustomActionKind.mediaCommand => CustomMediaCommandPresentation.fromName(
        action.value,
      ).label,
      _ => action.value,
    };
  }

  String get _desktopSupportLabel {
    if (PlatformCapabilities.isWindows || PlatformCapabilities.isMacOS) {
      return 'desktop natif';
    }
    if (PlatformCapabilities.isLinux) {
      return 'linux limité';
    }
    return 'hors desktop';
  }
}

class _ActionBarActivationToggle extends StatelessWidget {
  const _ActionBarActivationToggle({
    required this.isEnabled,
    required this.onChanged,
  });

  final bool isEnabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final isImeSupported = PlatformCapabilities.keyboardImeSupported;

    return SwitchListTile(
      title: const Text('Barre d’action Android IME'),
      subtitle: Text(
        isImeSupported
            ? 'Les boutons compatibles apparaissent dans le clavier CommandGlows.'
            : PlatformCapabilities.keyboardImeUnavailableReason,
      ),
      value: isImeSupported && isEnabled,
      onChanged: isImeSupported ? onChanged : null,
    );
  }
}

class _ActionKindSelector extends StatelessWidget {
  const _ActionKindSelector({required this.selected, required this.onSelected});

  final CustomActionKind selected;
  final ValueChanged<CustomActionKind> onSelected;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<CustomActionKind>(
      key: const Key('custom-button-action-kind-field'),
      initialValue: selected,
      decoration: const InputDecoration(labelText: 'Action du bouton'),
      items: [
        for (final kind in CustomActionKind.values)
          DropdownMenuItem(
            value: kind,
            child: Row(
              children: [
                Icon(kind.iconData),
                AppGaps.horizontalX2,
                Text(kind.label),
              ],
            ),
          ),
      ],
      onChanged: (next) {
        if (next != null) {
          onSelected(next);
        }
      },
    );
  }
}

class _ActionValueField extends StatelessWidget {
  const _ActionValueField({required this.controller, required this.kind});

  final TextEditingController controller;
  final CustomActionKind kind;

  @override
  Widget build(BuildContext context) {
    if (kind == CustomActionKind.clipboardCommand) {
      final selected = CustomClipboardCommandPresentation.fromName(
        controller.text,
      );
      return DropdownButtonFormField<CustomClipboardCommand>(
        initialValue: selected,
        decoration: const InputDecoration(labelText: 'Commande presse-papiers'),
        items: [
          for (final command in CustomClipboardCommand.values)
            DropdownMenuItem(
              value: command,
              child: Row(
                children: [
                  Icon(command.iconData),
                  AppGaps.horizontalX2,
                  Text(command.label),
                ],
              ),
            ),
        ],
        onChanged: (next) {
          if (next != null) {
            controller.text = next.name;
          }
        },
      );
    }
    if (kind == CustomActionKind.mediaCommand) {
      final selected = CustomMediaCommandPresentation.fromName(controller.text);
      return DropdownButtonFormField<CustomMediaCommand>(
        initialValue: selected,
        decoration: const InputDecoration(labelText: 'Commande média'),
        items: [
          for (final command in CustomMediaCommand.values)
            DropdownMenuItem(
              value: command,
              child: Row(
                children: [
                  Icon(command.iconData),
                  AppGaps.horizontalX2,
                  Text(command.label),
                ],
              ),
            ),
        ],
        onChanged: (next) {
          if (next != null) {
            controller.text = next.name;
          }
        },
      );
    }

    final (label, hint) = switch (kind) {
      CustomActionKind.insertText => (
        'Texte ou snippet',
        'Réponse prête à coller',
      ),
      CustomActionKind.keySequence => ('Séquence clavier desktop', 'Ctrl+W, N'),
      CustomActionKind.keyboardExpression => (
        'Expression clavier CommandGlows',
        'action:Undo',
      ),
      CustomActionKind.macro => (
        'Macro',
        'insertText:Bonjour; keySequence:Enter',
      ),
      CustomActionKind.clipboardCommand ||
      CustomActionKind.mediaCommand => ('', ''),
    };
    return TextField(
      key: const Key('custom-button-value-field'),
      controller: controller,
      minLines: 2,
      maxLines: 4,
      decoration: InputDecoration(labelText: label, hintText: hint),
    );
  }
}

class _RowSelector extends StatelessWidget {
  const _RowSelector({required this.selected, required this.onSelected});

  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<int>(
      segments: const [
        ButtonSegment(value: 0, label: Text('Rangée 1')),
        ButtonSegment(value: 1, label: Text('Rangée 2')),
        ButtonSegment(value: 2, label: Text('Rangée 3')),
      ],
      selected: {selected},
      onSelectionChanged: (values) {
        final next = values.isEmpty ? selected : values.first;
        onSelected(next);
      },
    );
  }
}

class _IconSelector extends StatelessWidget {
  const _IconSelector({required this.selected, required this.onSelected});

  final CustomActionButtonIcon selected;
  final ValueChanged<CustomActionButtonIcon> onSelected;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.x2,
      runSpacing: AppSpacing.x1,
      children: [
        for (final icon in CustomActionButtonIcon.values)
          ChoiceChip(
            label: Text(icon.label),
            avatar: Icon(icon.iconData, size: 18),
            selected: selected == icon,
            onSelected: (_) => onSelected(icon),
          ),
      ],
    );
  }
}
