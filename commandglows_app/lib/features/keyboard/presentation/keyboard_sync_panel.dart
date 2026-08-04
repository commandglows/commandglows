import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/application/auth_session_provider.dart';
import '../../auth/application/suite_identity_provider.dart';
import '../application/keyboard_sync_controller.dart';
import '../application/keyboard_sync_providers.dart';

class KeyboardSyncPanel extends ConsumerStatefulWidget {
  const KeyboardSyncPanel({super.key});

  @override
  ConsumerState<KeyboardSyncPanel> createState() => _KeyboardSyncPanelState();
}

class _KeyboardSyncPanelState extends ConsumerState<KeyboardSyncPanel> {
  KeyboardSyncControllerState _state =
      const KeyboardSyncControllerState.initial();
  bool _syncing = false;
  bool _rerunRequested = false;
  bool _initialized = false;
  DateTime? _lastSyncAtUtc;
  String? _message;

  Future<void> _runSync({bool userInitiated = false}) async {
    if (_syncing) {
      _rerunRequested = true;
      return;
    }
    setState(() => _syncing = true);
    final authContext = ref.read(keyboardSyncAuthContextProvider);
    if (!PlatformCapabilities.keyboardImeSupported ||
        !authContext.remoteSyncActive) {
      if (!mounted) {
        return;
      }
      setState(() {
        _state = const KeyboardSyncControllerState.initial();
        _syncing = false;
        if (userInitiated) {
          _message = 'Aucune sauvegarde cloud active pour ce profil clavier.';
        }
      });
      return;
    }
    final nextState = await _safeSynchronize(authContext);
    if (!mounted) {
      return;
    }
    if (nextState == null) {
      setState(() {
        _syncing = false;
        _message = 'Synchronisation clavier indisponible pour cette session.';
      });
      return;
    }
    setState(() {
      _state = nextState;
      if (nextState.status == KeyboardSyncControllerStatus.ready &&
          !nextState.hasPendingQueue) {
        _lastSyncAtUtc = DateTime.now().toUtc();
      }
      _syncing = false;
    });
    if (_rerunRequested) {
      _rerunRequested = false;
      unawaited(_runSync(userInitiated: userInitiated));
    }
  }

  Future<KeyboardSyncControllerState?> _safeSynchronize(
    KeyboardSyncAuthContext authContext,
  ) async {
    try {
      final controller = ref.read(keyboardSyncControllerProvider);
      return await controller.synchronize(authContext);
    } catch (_) {
      return null;
    }
  }

  Future<KeyboardSyncControllerState?> _safeKeepProfile(
    KeyboardSyncAuthContext authContext,
  ) async {
    try {
      final controller = ref.read(keyboardSyncControllerProvider);
      return await controller.keepLocalProfile(authContext);
    } catch (_) {
      return null;
    }
  }

  Future<KeyboardSyncControllerState?> _safeUseCloudProfile(
    KeyboardSyncAuthContext authContext,
  ) async {
    try {
      final controller = ref.read(keyboardSyncControllerProvider);
      return await controller.useCloudProfile(authContext);
    } catch (_) {
      return null;
    }
  }

  Future<void> _exportBackup() async {
    final backupService = ref.read(keyboardProfileBackupServiceProvider);
    try {
      final backup = await backupService.exportBackup();
      if (!mounted) {
        return;
      }
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Export profil clavier'),
          content: SizedBox(
            width: AppLayoutMetrics.keyboardSyncDialogWidth,
            child: SelectableText(
              backup.toJson(pretty: true),
              key: const Key('keyboard-sync-export-json'),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Fermer'),
            ),
          ],
        ),
      );
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Export prêt. Le JSON exclut les éléments sensibles local-only.',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _message = 'Export impossible: $error');
    }
  }

  Future<void> _importBackup() async {
    final controller = TextEditingController();
    final raw = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Importer un profil clavier'),
        content: SizedBox(
          width: AppLayoutMetrics.keyboardSyncDialogWidth,
          child: TextField(
            key: const Key('keyboard-sync-import-json-field'),
            controller: controller,
            minLines: 8,
            maxLines: 12,
            decoration: const InputDecoration(
              hintText: '{"backupVersion":1,"profile":{...}}',
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('Prévisualiser'),
          ),
        ],
      ),
    );
    if (raw == null || raw.trim().isEmpty) {
      return;
    }
    final backupService = ref.read(keyboardProfileBackupServiceProvider);
    try {
      final preview = await backupService.previewImport(raw);
      if (!mounted) {
        return;
      }
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Confirmer l’import'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Taille: ${preview.payloadBytes} octets'),
              Text('Sections modifiées: ${preview.changedSections.join(', ')}'),
              const SizedBox(height: AppSpacing.x2),
              const Text('Application tout-ou-rien sur le clavier Android.'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Appliquer'),
            ),
          ],
        ),
      );
      if (confirmed != true) {
        return;
      }
      await backupService.applyImport(preview);
      if (!mounted) {
        return;
      }
      ref
          .read(keyboardSyncChangeNotifierProvider.notifier)
          .markKeyboardProfileChanged();
      setState(() => _message = 'Profil importé avec succès.');
      await _runSync();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _message = 'Import refusé: $error');
    }
  }

  Future<void> _keepThisPhone() async {
    if (_syncing) {
      return;
    }
    setState(() => _syncing = true);
    final authContext = ref.read(keyboardSyncAuthContextProvider);
    final nextState = await _safeKeepProfile(authContext);
    if (!mounted) {
      return;
    }
    setState(() {
      if (nextState == null) {
        _syncing = false;
        _message = 'Synchronisation clavier indisponible pour cette session.';
        return;
      }
      _state = nextState;
      _syncing = false;
      _message = nextState.status == KeyboardSyncControllerStatus.ready
          ? 'Profil de ce téléphone conservé et envoyé au cloud.'
          : nextState.issueMessage;
    });
  }

  Future<void> _useCloudProfile() async {
    if (_syncing) {
      return;
    }
    setState(() => _syncing = true);
    final authContext = ref.read(keyboardSyncAuthContextProvider);
    final nextState = await _safeUseCloudProfile(authContext);
    if (!mounted) {
      return;
    }
    setState(() {
      if (nextState == null) {
        _syncing = false;
        _message = 'Synchronisation clavier indisponible pour cette session.';
        return;
      }
      _state = nextState;
      _syncing = false;
      _message = nextState.status == KeyboardSyncControllerStatus.ready
          ? 'Profil cloud appliqué à ce téléphone.'
          : nextState.issueMessage;
    });
  }

  (_KeyboardSyncPanelStatus, String, String, IconData) _panelStatus() {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return (
        _KeyboardSyncPanelStatus.unsupported,
        'Clavier Android indisponible sur ${PlatformCapabilities.currentPlatformLabel}',
        PlatformCapabilities.keyboardImeUnavailableReason,
        Icons.phonelink_erase_outlined,
      );
    }
    final authContext = ref.read(keyboardSyncAuthContextProvider);
    if (!authContext.remoteSyncActive) {
      return (
        _KeyboardSyncPanelStatus.localOnly,
        'Mode local uniquement',
        'Utile seulement pour sauvegarder ou restaurer le profil clavier entre plusieurs appareils.',
        Icons.save_outlined,
      );
    }
    switch (_state.status) {
      case KeyboardSyncControllerStatus.ready:
        if (_state.hasPendingQueue) {
          return (
            _KeyboardSyncPanelStatus.pending,
            'Synchronisation en attente',
            'Des changements locaux seront renvoyés automatiquement.',
            Icons.schedule_outlined,
          );
        }
        return (
          _KeyboardSyncPanelStatus.synced,
          'Clavier synchronisé',
          'Profil cloud prêt pour récupération sur un autre appareil.',
          Icons.cloud_done_outlined,
        );
      case KeyboardSyncControllerStatus.failed:
        return (
          _KeyboardSyncPanelStatus.failed,
          'Échec de synchronisation',
          _state.issueMessage ?? 'La synchronisation clavier a échoué.',
          Icons.error_outline,
        );
      case KeyboardSyncControllerStatus.partial:
        return (
          _KeyboardSyncPanelStatus.pending,
          'Restauration partielle',
          _state.issueMessage ??
              'Le profil clavier est restauré sans tous les assets du thème.',
          Icons.schedule_outlined,
        );
      case KeyboardSyncControllerStatus.decisionNeeded:
        return (
          _KeyboardSyncPanelStatus.conflict,
          'Conflit détecté',
          'Le cloud et ce téléphone divergent. Aucune donnée n’a été écrasée.',
          Icons.warning_amber_outlined,
        );
      case KeyboardSyncControllerStatus.waitingCloud:
      case KeyboardSyncControllerStatus.dataReceived:
      case KeyboardSyncControllerStatus.applying:
        return (
          _KeyboardSyncPanelStatus.waiting,
          'Synchronisation en cours',
          'Vérification du profil local et cloud.',
          Icons.sync_outlined,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(authSessionProvider);
    ref.watch(suiteIdentityProvider);
    ref.listen(authSessionProvider, (previous, next) {
      unawaited(_runSync());
    });
    ref.listen(suiteIdentityProvider, (previous, next) {
      unawaited(_runSync());
    });
    ref.listen<int>(keyboardSyncChangeNotifierProvider, (previous, next) {
      if (previous != next) {
        unawaited(_runSync());
      }
    });
    if (!_initialized) {
      _initialized = true;
      unawaited(_runSync());
    }

    final (status, title, detail, icon) = _panelStatus();
    final conflictVisible = status == _KeyboardSyncPanelStatus.conflict;
    return Card(
      child: Padding(
        padding: AppInsets.card,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(icon),
              title: Text('Profil clavier'),
              subtitle: Text(title),
              trailing: _syncing
                  ? const SizedBox.square(
                      dimension: AppIconMetrics.sm,
                      child: CircularProgressIndicator(
                        strokeWidth: AppIconMetrics.progressStroke,
                      ),
                    )
                  : null,
            ),
            Text(detail, style: Theme.of(context).textTheme.bodySmall),
            if (_lastSyncAtUtc != null) ...[
              const SizedBox(height: AppSpacing.x1),
              Text(
                'Dernière sync: ${_lastSyncAtUtc!.toLocal()}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            if (_message != null) ...[
              const SizedBox(height: AppSpacing.x1),
              Text(_message!, style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: AppSpacing.x2),
            Wrap(
              spacing: AppSpacing.x2,
              runSpacing: AppSpacing.x1,
              children: [
                FilledButton.icon(
                  onPressed:
                      status == _KeyboardSyncPanelStatus.unsupported || _syncing
                      ? null
                      : () => unawaited(_runSync(userInitiated: true)),
                  icon: const Icon(Icons.sync),
                  label: Text(
                    status == _KeyboardSyncPanelStatus.failed
                        ? 'Réessayer'
                        : 'Synchroniser',
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: PlatformCapabilities.keyboardImeSupported
                      ? _exportBackup
                      : null,
                  icon: const Icon(Icons.upload_file_outlined),
                  label: const Text('Exporter'),
                ),
                OutlinedButton.icon(
                  onPressed: PlatformCapabilities.keyboardImeSupported
                      ? _importBackup
                      : null,
                  icon: const Icon(Icons.download_outlined),
                  label: const Text('Importer'),
                ),
              ],
            ),
            if (conflictVisible) ...[
              const SizedBox(height: AppSpacing.x2),
              Wrap(
                spacing: AppSpacing.x2,
                runSpacing: AppSpacing.x1,
                children: [
                  OutlinedButton(
                    onPressed: _syncing ? null : _keepThisPhone,
                    child: const Text('Garder ce téléphone'),
                  ),
                  OutlinedButton(
                    onPressed: _syncing ? null : _useCloudProfile,
                    child: const Text('Utiliser le cloud'),
                  ),
                  FilledButton.tonal(
                    onPressed: _exportBackup,
                    child: const Text('Exporter avant remplacement'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

enum _KeyboardSyncPanelStatus {
  unsupported,
  localOnly,
  waiting,
  synced,
  pending,
  failed,
  conflict,
}
