import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/platform/desktop_control_bridge.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';

class DesktopControlSettingsSection extends StatefulWidget {
  const DesktopControlSettingsSection({super.key, this.preferenceStore});

  final DesktopControlPreference? preferenceStore;

  @override
  State<DesktopControlSettingsSection> createState() =>
      _DesktopControlSettingsSectionState();
}

class _DesktopControlSettingsSectionState
    extends State<DesktopControlSettingsSection> {
  DesktopControlStatus? _status;
  bool _busy = true;
  String? _message;

  DesktopControlPreference get _preferences =>
      widget.preferenceStore ?? DesktopControlPreferenceStore();

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final optedIn = await _preferences.isEnabled();
      var status = await DesktopControlBridge.getStatus();
      if (optedIn &&
          status.supported &&
          (!status.enabled || !status.hotkeyRegistered)) {
        status = await DesktopControlBridge.setEnabled(true);
      }
      if (!mounted) return;
      setState(() {
        _status = status;
        _message = _statusMessage(status);
      });
    } on DesktopControlException catch (error) {
      if (!mounted) return;
      setState(() => _message = error.recoveryMessage);
    } catch (_) {
      if (!mounted) return;
      setState(() => _message = _unexpectedErrorMessage);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _setEnabled(bool enabled) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      // Save the explicit choice locally first, so opt-in survives a hotkey
      // collision and can be retried on the next launch.
      await _preferences.setEnabled(enabled);
      final status = await DesktopControlBridge.setEnabled(enabled);
      if (!mounted) return;
      setState(() {
        _status = status;
        _message = _statusMessage(status);
      });
    } on DesktopControlException catch (error) {
      if (!mounted) return;
      setState(() => _message = error.recoveryMessage);
    } catch (_) {
      if (!mounted) return;
      setState(() => _message = _unexpectedErrorMessage);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _runAction(
    Future<DesktopControlStatus> Function() action,
  ) async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final status = await action();
      if (!mounted) return;
      setState(() {
        _status = status;
        _message = _statusMessage(status);
      });
    } on DesktopControlException catch (error) {
      if (!mounted) return;
      setState(() => _message = error.recoveryMessage);
    } catch (_) {
      if (!mounted) return;
      setState(() => _message = _unexpectedErrorMessage);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? _statusMessage(DesktopControlStatus status) {
    if (status.errorCode != null) {
      return DesktopControlBridge.recoveryMessageFor(status.errorCode!);
    }
    if (!status.supported) {
      return 'Le contrôle du bureau est disponible uniquement dans la version Windows native.';
    }
    if (status.enabled && !status.hotkeyRegistered) {
      return DesktopControlBridge.recoveryMessageFor('HOTKEY_UNAVAILABLE');
    }
    return null;
  }

  static const _unexpectedErrorMessage =
      'Une erreur inattendue a empêché cette action. Relancez CommandGlows puis réessayez.';

  @override
  Widget build(BuildContext context) {
    final status = _status;
    final enabled = status?.enabled ?? false;
    final supported = status?.supported ?? false;
    final active = status?.active ?? false;

    return AppSectionCard(
      title: 'Contrôle du bureau',
      subtitle:
          'Pilotez le pointeur dans vos applications Windows avec une grille récursive au clavier.',
      leading: const Icon(Icons.grid_view_rounded),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SwitchListTile(
            key: const Key('desktop-control-enabled'),
            value: enabled,
            onChanged: _busy || !supported ? null : _setEnabled,
            title: const Text('Activer le contrôle du bureau'),
            subtitle: const Text(
              'Après activation, Ctrl+Alt+G affiche la grille sur l’écran du pointeur. Désactivé au premier lancement.',
            ),
          ),
          const ListTile(
            leading: Icon(Icons.keyboard_outlined),
            title: Text('Commandes de la grille'),
            subtitle: Text(
              'Choisissez une case avec une touche. Retour arrière remonte d’un niveau, Espace réinitialise et Échap ferme la grille.',
            ),
          ),
          ListTile(
            leading: Icon(
              active
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
            ),
            title: const Text('Raccourci global'),
            subtitle: Text(
              !supported
                  ? 'État non disponible.'
                  : status?.hotkeyRegistered == true
                  ? 'Ctrl+Alt+G est enregistré.'
                  : enabled
                  ? 'Ctrl+Alt+G n’est pas enregistré.'
                  : 'Ctrl+Alt+G sera enregistré à l’activation.',
            ),
          ),
          if (_message != null)
            AppBannerCard(
              key: const Key('desktop-control-recovery'),
              icon: Icons.info_outline,
              title: 'Contrôle du bureau',
              message: _message!,
            ),
          if (supported) ...[
            AppGaps.x2,
            AppActionRail(
              children: [
                FilledButton.icon(
                  key: const Key('desktop-control-activate'),
                  onPressed: _busy || !enabled || active
                      ? null
                      : () => _runAction(DesktopControlBridge.activate),
                  icon: const Icon(Icons.grid_on_outlined),
                  label: const Text('Afficher la grille'),
                ),
                OutlinedButton.icon(
                  key: const Key('desktop-control-cancel'),
                  onPressed: _busy || !active
                      ? null
                      : () => _runAction(DesktopControlBridge.cancel),
                  icon: const Icon(Icons.close),
                  label: const Text('Fermer la grille'),
                ),
              ],
            ),
          ],
          if (_busy) ...[AppGaps.x2, const LinearProgressIndicator()],
        ],
      ),
    );
  }
}
