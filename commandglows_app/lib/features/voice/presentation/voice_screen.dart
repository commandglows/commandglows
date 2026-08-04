import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/diagnostics/app_diagnostics.dart';
import '../../../core/platform/android_keyboard_bridge.dart';
import '../../../core/platform/android_overlay_bridge.dart';
import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../../../core/widgets/app_profile_menu_button.dart';
import '../../../core/widgets/confirm_action_dialog.dart';
import '../../clipboard/application/clipboard_store_provider.dart';
import '../../clipboard/domain/clipboard_capture_event.dart';
import '../../clipboard/domain/clipboard_normalizer.dart';
import '../../keyboard/domain/keyboard_models.dart';
import '../../send_to/presentation/send_to_actions.dart';
import '../../settings/application/settings_store_provider.dart';
import '../../snippets/application/snippet_store_provider.dart';
import '../application/language_pack_catalog_provider.dart';
import '../application/transcription_store.dart';
import '../application/transcription_store_provider.dart';
import '../domain/language_pack_catalog.dart';
import '../domain/transcription_draft.dart';

class VoiceScreen extends ConsumerStatefulWidget {
  const VoiceScreen({super.key});

  @override
  ConsumerState<VoiceScreen> createState() => _VoiceScreenState();
}

class _VoiceScreenState extends ConsumerState<VoiceScreen> {
  final _searchController = TextEditingController();
  bool _busy = false;
  bool _overlayBusy = false;
  AndroidOverlayStatus? _overlayStatus;
  AndroidKeyboardStatus? _keyboardStatus;
  String? _message;
  List<TranscriptionRecord> _items = const [];

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_handleSearchChanged);
    Future<void>.microtask(_load);
    Future<void>.microtask(_loadOverlayStatus);
    Future<void>.microtask(_loadKeyboardStatus);
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

  Future<void> _load() async {
    if (!mounted) {
      return;
    }
    setState(() => _busy = true);
    try {
      await _syncKeyboardVoiceRuntimeEvents();
      final store = ref.read(transcriptionStoreProvider);
      await _importKeyboardVoiceEvents(store);
      await _importOverlayVoiceEvents(store);
      final rows = await store.list();
      AppDiagnostics.record(
        'voice_load',
        'store=${store.runtimeType}; items=${rows.length}',
      );
      if (mounted) {
        setState(() {
          _items = rows;
          _message = null;
        });
      }
    } catch (error) {
      AppDiagnostics.record('voice_load_error', error);
      if (mounted) {
        setState(() => _message = 'Erreur chargement transcriptions: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _syncKeyboardVoiceRuntimeEvents() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    final events =
        await AndroidKeyboardBridge.drainKeyboardVoiceRuntimeEvents();
    if (events.isEmpty) {
      return;
    }
    final notifier = ref.read(languagePackCatalogProvider.notifier);
    for (final event in events) {
      notifier.applyNativeRuntimeStatus(
        runtimeState: event.runtimeState,
        fallbackReason: event.fallbackReason,
        activePackId: event.activePackId,
        lastErrorCode: event.lastErrorCode,
        languageTag: event.languageTag,
        engine: event.engine,
        observedAtUtc: event.capturedAtUtc,
      );
    }
    await _loadKeyboardStatus();
    AppDiagnostics.record(
      'voice_runtime_events_import',
      'events=${events.length}',
    );
  }

  Future<void> _importKeyboardVoiceEvents(TranscriptionStore store) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    final events = await AndroidKeyboardBridge.drainKeyboardVoiceEvents();
    for (final event in events) {
      final draft = TranscriptionDraft(
        rawText: event.rawText,
        cleanedText: event.cleanedText,
        language: event.language,
        source: event.source,
        durationMs: event.durationMs,
      );
      if (draft.isValid) {
        await store.insert(draft);
      }
    }
    if (events.isNotEmpty) {
      AppDiagnostics.record('voice_keyboard_import', 'events=${events.length}');
    }
  }

  Future<void> _importOverlayVoiceEvents(TranscriptionStore store) async {
    if (!PlatformCapabilities.overlaySupported) {
      return;
    }
    final events = await AndroidOverlayBridge.drainEvents();
    var imported = 0;
    if (events.isEmpty) {
      return;
    }
    final existing = await store.list();
    final seen = existing
        .map(
          (item) =>
              '${item.rawText}|${item.cleanedText}|${item.language}|${item.source}|${item.durationMs}',
        )
        .toSet();
    for (final event in events) {
      final draftEvent = AndroidOverlayEventTextDelivery.fromOverlayEvent(
        event,
      );
      if (draftEvent == null) {
        continue;
      }
      final draft = TranscriptionDraft(
        rawText: draftEvent.rawText,
        cleanedText: draftEvent.cleanedText,
        language: draftEvent.language,
        source: draftEvent.source,
        durationMs: draftEvent.durationMs,
      );
      if (!draft.isValid) {
        continue;
      }
      final key =
          '${draft.rawText}|${draft.cleanedText}|${draft.language}|${draft.source}|${draft.durationMs}';
      if (seen.contains(key)) {
        continue;
      }
      await store.insert(draft);
      imported += 1;
      seen.add(key);
    }
    if (events.isNotEmpty) {
      AppDiagnostics.record(
        'voice_overlay_import',
        'events=${events.length}; imported=$imported',
      );
    }
  }

  Future<void> _loadOverlayStatus() async {
    if (!PlatformCapabilities.overlaySupported) {
      return;
    }
    try {
      final status = await AndroidOverlayBridge.getStatus();
      if (!mounted) {
        return;
      }
      setState(() => _overlayStatus = status);
    } on AndroidOverlayBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Erreur de statut overlay (${error.code}): ${error.message}',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _message = 'Erreur de statut overlay: $error');
    }
  }

  Future<void> _loadKeyboardStatus() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    try {
      final status = await AndroidKeyboardBridge.getStatus();
      if (!mounted) {
        return;
      }
      setState(() => _keyboardStatus = status);
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Erreur de statut clavier (${error.code}): ${error.message}',
      );
    }
  }

  LanguagePackDeviceProfile _deviceProfile() {
    final status = _keyboardStatus ?? AndroidKeyboardStatus.unsupported();
    return LanguagePackDeviceProfile(
      androidSdk: status.deviceAndroidSdk,
      primaryAbi: status.devicePrimaryAbi,
      totalCapacityMb: status.deviceTotalCapacityMb,
      freeSpaceMb: status.deviceFreeSpaceMb,
      ramMb: status.deviceRamMb,
    );
  }

  String _activeLanguageTag() {
    final raw = _keyboardStatus?.voiceLanguageTag.trim();
    if (raw == null || raw.isEmpty || raw.toLowerCase() == 'und') {
      return 'fr-FR';
    }
    return raw;
  }

  bool _isLocalPackInstalled(
    LanguagePackCatalogState catalogState,
    LanguagePackCatalogEntry entry,
  ) {
    final installed = catalogState.installedStateFor(entry);
    return (installed.installState == InstalledLanguagePackState.installed ||
            installed.installState ==
                InstalledLanguagePackState.updateAvailable) &&
        installed.runtimeMode == LanguagePackRuntimeMode.local;
  }

  Future<void> _installRecommendedPack(
    LanguagePackCatalogEntry entry,
    LanguagePackCatalogState catalogState,
  ) async {
    final notifier = ref.read(languagePackCatalogProvider.notifier);
    final installStateBefore = catalogState
        .installedStateFor(entry)
        .installState;
    final installed =
        installStateBefore == InstalledLanguagePackState.failedDownload ||
            installStateBefore ==
                InstalledLanguagePackState.failedVerification ||
            installStateBefore ==
                InstalledLanguagePackState.blockedInsufficientStorage ||
            installStateBefore == InstalledLanguagePackState.corrupted
        ? await notifier.retryInstallWithPreflight(
            entry: entry,
            device: _deviceProfile(),
          )
        : await notifier.installPackWithPreflight(
            entry: entry,
            device: _deviceProfile(),
          );
    if (installed) {
      final installedPack = ref
          .read(languagePackCatalogProvider)
          .installedStateFor(entry);
      await AndroidKeyboardBridge.setKeyboardVoiceRuntimeConfig(
        languageTag: entry.languageTag,
        packId: entry.packId,
        engine: entry.engine.wireName,
        modelArtifactPath: installedPack.modelArtifactPath,
      );
      await AndroidKeyboardBridge.probeKeyboardLocalRuntimePath(
        languageTag: entry.languageTag,
        packId: entry.packId,
        engine: entry.engine.wireName,
        modelArtifactPath: installedPack.modelArtifactPath,
      );
      await _syncKeyboardVoiceRuntimeEvents();
    }
    if (!mounted) {
      return;
    }
    setState(() {
      _message = installed
          ? 'Pack local installé pour ${entry.languageTag}.'
          : 'Installation échouée ou bloquée pour ${entry.languageTag}.';
    });
  }

  void _useExplicitFallback(String languageTag) {
    final notifier = ref.read(languagePackCatalogProvider.notifier);
    final applied = notifier.setExplicitFallbackForLanguage(languageTag);
    unawaited(
      AndroidKeyboardBridge.probeKeyboardLocalRuntimePath(
        languageTag: languageTag,
        packId: 'none',
        engine: 'android_speech_recognizer',
        modelArtifactPath: 'none',
      ).then((_) => _syncKeyboardVoiceRuntimeEvents()),
    );
    setState(() {
      _message = applied
          ? 'Fallback explicite activé pour $languageTag.'
          : 'Aucun fallback disponible pour $languageTag.';
    });
  }

  Future<void> _startOverlay() async {
    setState(() => _overlayBusy = true);
    try {
      final status = await AndroidOverlayBridge.startRecording();
      if (!mounted) {
        return;
      }
      setState(() {
        _overlayStatus = status;
        _message = 'Overlay démarré depuis Voix.';
      });
      _refreshOverlayStatusSoon();
    } on AndroidOverlayBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Démarrage overlay impossible (${error.code}): ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _overlayBusy = false);
      }
    }
  }

  Future<void> _stopOverlay() async {
    setState(() => _overlayBusy = true);
    try {
      final status = await AndroidOverlayBridge.stopRecording();
      if (!mounted) {
        return;
      }
      setState(() {
        _overlayStatus = status;
        _message = 'Overlay arrêté depuis Voix.';
      });
      _refreshOverlayStatusSoon();
    } on AndroidOverlayBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Arrêt overlay impossible (${error.code}): ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _overlayBusy = false);
      }
    }
  }

  Future<void> _cancelOverlay() async {
    setState(() => _overlayBusy = true);
    try {
      final status = await AndroidOverlayBridge.cancelRecording();
      if (!mounted) {
        return;
      }
      setState(() {
        _overlayStatus = status;
        _message = 'Overlay annulé depuis Voix.';
      });
      _refreshOverlayStatusSoon();
    } on AndroidOverlayBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Annulation overlay impossible (${error.code}): ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _overlayBusy = false);
      }
    }
  }

  Future<void> _toggleOverlayRecording() async {
    if (_overlayStatus?.serviceState == 'recording') {
      await _stopOverlay();
    } else {
      await _startOverlay();
    }
  }

  void _refreshOverlayStatusSoon() {
    Future<void>.delayed(const Duration(milliseconds: 250), () {
      if (mounted) {
        _loadOverlayStatus();
      }
    });
  }

  Future<void> _delete(String id) async {
    final settings = await ref.read(settingsStoreProvider).load();
    if (!mounted) {
      return;
    }
    final confirmed = await showConfirmActionDialog(
      context: context,
      title: 'Supprimer la transcription ?',
      message:
          'La transcription sera retirée de l’historique actuel. Cette action ne peut pas être annulée depuis cet écran.',
      confirmLabel: 'Supprimer',
      destructive: true,
      confirmationEnabled: settings.confirmDestructiveActions,
    );
    if (!mounted || !confirmed) {
      return;
    }
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final store = ref.read(transcriptionStoreProvider);
      await store.softDelete(id);
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Suppression impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _quickEdit(TranscriptionRecord item) async {
    final controller = TextEditingController(text: item.cleanedText);
    final updated = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Modifier le texte nettoyé'),
          content: TextField(
            controller: controller,
            minLines: 2,
            maxLines: 6,
            decoration: const InputDecoration(),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(controller.text),
              child: const Text('Enregistrer'),
            ),
          ],
        );
      },
    );
    if (updated == null) {
      return;
    }
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final store = ref.read(transcriptionStoreProvider);
      await store.updateCleanedText(id: item.id, cleanedText: updated);
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Mise à jour impossible: $error');
      }
    } finally {
      controller.dispose();
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  String _reusableText(TranscriptionRecord item) {
    final cleaned = item.cleanedText.trim();
    if (cleaned.isNotEmpty) {
      return cleaned;
    }
    return item.rawText.trim();
  }

  Future<void> _sendToClipboard(TranscriptionRecord item) async {
    final content = _reusableText(item);
    if (content.isEmpty) {
      setState(() => _message = 'Aucun texte vocal à envoyer.');
      return;
    }

    var sensitiveConfirmed = false;
    final classification = classifySensitiveContent(content);
    if (classification != ClipboardSensitiveClassification.none) {
      sensitiveConfirmed = await confirmSensitiveSendToClipboard(
        context: context,
        classification: classification,
      );
      if (!sensitiveConfirmed || !mounted) {
        return;
      }
    }

    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await ref
          .read(clipboardHistoryApiProvider)
          .addManualItem(
            content: content,
            source: ClipboardCanonicalSource.voice,
            sensitiveConfirmed: sensitiveConfirmed,
          );
      ref.read(clipboardHistoryRefreshSignalProvider.notifier).markChanged();
      if (mounted) {
        setState(() => _message = 'Transcription envoyée vers Clipboard.');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Envoi vers Clipboard impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _sendToSnippet(TranscriptionRecord item) async {
    final content = _reusableText(item);
    if (content.isEmpty) {
      setState(() => _message = 'Aucun texte vocal à envoyer.');
      return;
    }

    final draft = await showSendToSnippetDialog(
      context: context,
      initialContent: content,
      sourceLabel: 'Voix',
      initialLabel: 'Voix',
    );
    if (draft == null || !mounted) {
      return;
    }

    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await ref
          .read(snippetStoreProvider)
          .insert(
            trigger: draft.trigger,
            content: draft.content,
            label: draft.label,
          );
      ref.read(snippetRefreshSignalProvider.notifier).markChanged();
      if (mounted) {
        setState(() => _message = 'Snippet créé depuis la transcription.');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Création snippet impossible: $error');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  AppSyncStatus _pageStatus() {
    if (_busy) {
      return const AppSyncStatus(
        kind: AppSyncStatusKind.loading,
        message: 'Chargement de l’historique vocal.',
      );
    }
    if (_hasErrorMessage) {
      return AppSyncStatus(kind: AppSyncStatusKind.error, message: _message);
    }
    return const AppSyncStatus(
      kind: AppSyncStatusKind.idle,
      message: 'Historique vocal prêt.',
    );
  }

  bool get _hasErrorMessage {
    final value = _message?.toLowerCase() ?? '';
    return value.contains('erreur') ||
        value.contains('impossible') ||
        value.contains('échec') ||
        value.contains('failed');
  }

  List<TranscriptionRecord> _visibleItems() {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isEmpty) {
      return _items;
    }
    return _items
        .where((item) {
          final language = _languageLabel(item.language).toLowerCase();
          final source = _sourceLabel(item.source).toLowerCase();
          final duration = _formatDuration(item.durationMs).toLowerCase();
          return item.cleanedText.toLowerCase().contains(query) ||
              item.rawText.toLowerCase().contains(query) ||
              language.contains(query) ||
              source.contains(query) ||
              duration.contains(query);
        })
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int>(transcriptionHistoryRefreshSignalProvider, (
      previous,
      next,
    ) {
      if (previous != null && previous != next) {
        Future<void>.microtask(_load);
      }
    });
    AppDiagnostics.record('screen_build', 'Voice');
    final catalogState = ref.watch(languagePackCatalogProvider);
    final activeLanguageTag = _activeLanguageTag();
    final recommendedEntry = catalogState.catalog.recommendedForLanguage(
      activeLanguageTag,
    );
    final shouldShowNoPackPrompt =
        recommendedEntry != null &&
        !_isLocalPackInstalled(catalogState, recommendedEntry);
    final overlayStatus = _overlayStatus;
    final overlayRecording = overlayStatus?.serviceState == 'recording';
    final latest = _items.isEmpty ? null : _items.first;
    final visibleItems = _visibleItems();
    return ListView(
      padding: AppInsets.screen,
      children: [
        ProductPageScaffold(
          summary: AppPageHeroCard(
            title: 'Fil voix',
            subtitle:
                'Consulte les dernières entrées vocales avec le même repère que sur l’accueil, puis affine ta recherche sur l’historique voix.',
            leadingIcon: Icons.graphic_eq_outlined,
            trailing: const AppProfileMenuButton(),
            metrics: [
              AppStatusPill(status: _pageStatus(), label: 'Statut'),
              AppMetricPill(
                icon: Icons.multitrack_audio_outlined,
                label: '${_items.length}',
                value: _items.length == 1 ? 'capture' : 'captures',
              ),
              AppMetricPill(
                icon: overlayRecording ? Icons.mic : Icons.mic_none_outlined,
                label: _overlayStatusLabel(overlayStatus),
                value: _overlayPermissionLabel(overlayStatus),
              ),
              AppMetricPill(
                icon: Icons.schedule,
                label: latest == null
                    ? 'Aucune entrée'
                    : _formatShortDateTime(latest.createdAt),
                value: 'dernier ajout',
              ),
            ],
            searchField: AppSearchField(
              controller: _searchController,
              query: _searchController.text,
              enabled: _items.isNotEmpty,
              scopeLabel: 'Voix',
              hintText: 'Rechercher une transcription',
              onChanged: (_) {},
              onClear: _searchController.clear,
            ),
            syncAction: AppSyncStatusAction(
              status: _pageStatus(),
              scopeLabel: 'Voix',
              onPressed: _busy ? null : _load,
            ),
          ),
          primaryAction: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (shouldShowNoPackPrompt) ...[
                _MicroWithoutPackPromptCard(
                  languageTag: activeLanguageTag,
                  allowCloudFallback: catalogState.allowCloudFallback,
                  installedState: catalogState.installedStateFor(
                    recommendedEntry,
                  ),
                  onInstall: _busy
                      ? null
                      : () => _installRecommendedPack(
                          recommendedEntry,
                          catalogState,
                        ),
                  onUseFallback: _busy
                      ? null
                      : () => _useExplicitFallback(activeLanguageTag),
                ),
                AppGaps.x2,
              ],
              AppSectionCard(
                title: 'Capture automatique',
                leading: Icon(
                  Icons.auto_awesome_outlined,
                  color: Theme.of(context).colorScheme.primary,
                ),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Wrap(
                    spacing: AppSpacing.x2,
                    runSpacing: AppSpacing.x2,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      AppTag(
                        label: _items.isEmpty
                            ? 'Historique vide'
                            : '${_items.length} capture${_items.length == 1 ? '' : 's'}',
                      ),
                      AppTag(label: _overlayStatusLabel(overlayStatus)),
                      AppTag(label: _overlayPermissionLabel(overlayStatus)),
                    ],
                  ),
                ),
              ),
              if (PlatformCapabilities.overlaySupported) ...[
                AppGaps.x2,
                _OverlayControlCard(
                  status: overlayStatus,
                  isRecording: overlayRecording,
                  isBusy: _overlayBusy,
                  onToggleRecording: _overlayBusy
                      ? null
                      : _toggleOverlayRecording,
                  onStop: _overlayBusy ? null : _stopOverlay,
                  onCancel: _overlayBusy ? null : _cancelOverlay,
                  onRefresh: _overlayBusy ? null : _loadOverlayStatus,
                ),
              ],
            ],
          ),
          busy: _busy,
          message: _message,
          messageBuilder: (context, message) => _VoiceMessage(message: message),
          listToolbar: const SizedBox.shrink(),
          results: [
            if (_items.isEmpty) const _EmptyVoiceState(),
            if (_items.isNotEmpty && visibleItems.isEmpty)
              const AppEmptyStateCard(
                title: 'Aucun résultat',
                message:
                    'Aucune transcription ne correspond à cette recherche.',
              ),
            for (final item in visibleItems)
              _TranscriptionTile(
                item: item,
                sendToEnabled: !_busy,
                onSendToClipboard: _busy ? null : () => _sendToClipboard(item),
                onSendToSnippet: _busy ? null : () => _sendToSnippet(item),
                onEdit: _busy ? null : () => _quickEdit(item),
                onDelete: _busy ? null : () => _delete(item.id),
              ),
          ],
        ),
      ],
    );
  }
}

class _MicroWithoutPackPromptCard extends StatelessWidget {
  const _MicroWithoutPackPromptCard({
    required this.languageTag,
    required this.allowCloudFallback,
    required this.installedState,
    required this.onInstall,
    required this.onUseFallback,
  });

  final String languageTag;
  final bool allowCloudFallback;
  final InstalledLanguagePack installedState;
  final VoidCallback? onInstall;
  final VoidCallback? onUseFallback;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fallbackLabel = allowCloudFallback
        ? 'fallback cloud (explicite)'
        : 'fallback Android / indisponible';
    return AppSectionCard(
      title: 'Micro clavier: pack local manquant',
      subtitle:
          'Aucun pack local n’est installé pour $languageTag. Installe-le maintenant ou active le fallback explicite avant la dictée.',
      leading: Icon(
        Icons.priority_high_outlined,
        color: theme.colorScheme.primary,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'état=${installedState.installState.wireName} | fallback=$fallbackLabel | essais: 3 max',
            style: theme.textTheme.bodySmall,
          ),
          AppGaps.x2,
          AppActionRail(
            children: [
              FilledButton.icon(
                onPressed: onInstall,
                icon: const Icon(Icons.download_outlined),
                label: const Text('Installer le pack local'),
              ),
              OutlinedButton.icon(
                onPressed: onUseFallback,
                icon: const Icon(Icons.alt_route_outlined),
                label: const Text('Utiliser le fallback explicite'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

String _overlayStatusLabel(AndroidOverlayStatus? status) {
  if (status == null) {
    return 'Statut en cours';
  }
  if (status.serviceState == 'recording') {
    return 'Enregistrement';
  }
  if (status.running) {
    return 'Overlay actif';
  }
  if (status.enabled || status.requestedEnabled) {
    return 'Overlay prêt';
  }
  return 'Overlay désactivé';
}

String _overlayPermissionLabel(AndroidOverlayStatus? status) {
  if (status == null) {
    return 'Permissions inconnues';
  }
  if (!status.overlayPermissionGranted) {
    return 'Overlay à autoriser';
  }
  if (!status.recordAudioGranted) {
    return 'Micro à autoriser';
  }
  if (!status.accessibilityPermissionGranted) {
    return 'Presse-papiers seulement';
  }
  return 'Permissions prêtes';
}

String _overlayDeliveryLabel(AndroidOverlayStatus? status) {
  return switch (status?.deliveryMode) {
    OverlayDeliveryMode.injectionAndClipboard => 'Insertion + presse-papiers',
    OverlayDeliveryMode.clipboardOnly => 'Presse-papiers',
    null => 'Livraison inconnue',
  };
}

String _languageLabel(String value) {
  final normalized = value.trim().toLowerCase();
  return switch (normalized) {
    'fr' || 'fr-fr' => 'Français',
    'en' || 'en-us' || 'en-gb' => 'Anglais',
    '' => 'Langue inconnue',
    _ => normalized.toUpperCase(),
  };
}

String _sourceLabel(String value) {
  return switch (value.trim().toLowerCase()) {
    'keyboard' => 'Clavier',
    'overlay' => 'Overlay',
    'advanced' => 'Mode avancé',
    'free' => 'Mode libre',
    '' => 'Source inconnue',
    _ => value,
  };
}

String _formatDuration(int durationMs) {
  if (durationMs <= 0) {
    return 'Durée inconnue';
  }
  if (durationMs < 1000) {
    return '$durationMs ms';
  }
  final seconds = durationMs / 1000;
  if (seconds < 60) {
    return '${seconds.toStringAsFixed(seconds < 10 ? 1 : 0)} s';
  }
  final minutes = seconds ~/ 60;
  final remainingSeconds = (seconds % 60).round();
  return '$minutes min ${remainingSeconds.toString().padLeft(2, '0')} s';
}

String _formatShortDateTime(DateTime value) {
  final local = value.toLocal();
  final day = local.day.toString().padLeft(2, '0');
  final month = local.month.toString().padLeft(2, '0');
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '$day/$month $hour:$minute';
}

class _OverlayControlCard extends StatelessWidget {
  const _OverlayControlCard({
    required this.status,
    required this.isRecording,
    required this.isBusy,
    required this.onToggleRecording,
    required this.onStop,
    required this.onCancel,
    required this.onRefresh,
  });

  final AndroidOverlayStatus? status;
  final bool isRecording;
  final bool isBusy;
  final VoidCallback? onToggleRecording;
  final VoidCallback? onStop;
  final VoidCallback? onCancel;
  final VoidCallback? onRefresh;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return AppSectionCard(
      title: 'Contrôle overlay Android',
      subtitle:
          'Démarre une dictée flottante, puis récupère le texte dans l’historique vocal.',
      leading: Icon(
        isRecording ? Icons.graphic_eq : Icons.mic_external_on_outlined,
        color: isRecording ? AppColors.danger : colorScheme.primary,
      ),
      padding: AppInsets.compactCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: AppSpacing.x2,
            runSpacing: AppSpacing.x2,
            children: [
              AppTag(
                label: _overlayStatusLabel(status),
                color: isRecording ? AppColors.danger : null,
                backgroundColor: isRecording
                    ? AppColors.danger.withValues(alpha: 0.1)
                    : null,
              ),
              AppTag(label: _overlayPermissionLabel(status)),
              AppTag(label: _overlayDeliveryLabel(status)),
              if ((status?.eventQueueSize ?? 0) > 0)
                AppTag(label: '${status!.eventQueueSize} événement(s)'),
            ],
          ),
          if (status?.accessibilityPermissionGranted == false) ...[
            AppGaps.x3,
            const _InlineNotice(
              icon: Icons.accessibility_new,
              text:
                  'Accessibilité désactivée: le texte reste copié dans le presse-papiers.',
            ),
          ],
          if (status?.recordAudioGranted == false) ...[
            AppGaps.x2,
            const _InlineNotice(
              icon: Icons.mic_off_outlined,
              text:
                  'Micro non autorisé: active la permission Android pour enregistrer.',
            ),
          ],
          AppGaps.x3,
          LayoutBuilder(
            builder: (context, constraints) {
              final stacked = constraints.maxWidth < 520;
              final primary = _RecordingMicAction(
                isRecording: isRecording,
                isBusy: isBusy,
                onPressed: onToggleRecording,
              );
              final secondary = AppActionRail(
                minActionWidth: 132,
                children: [
                  OutlinedButton.icon(
                    onPressed: onStop,
                    icon: const Icon(Icons.stop_circle_outlined),
                    label: const Text('Arrêter'),
                  ),
                  OutlinedButton.icon(
                    onPressed: onCancel,
                    icon: const Icon(Icons.close),
                    label: const Text('Annuler'),
                  ),
                  OutlinedButton.icon(
                    onPressed: onRefresh,
                    icon: const Icon(Icons.sync),
                    label: const Text('Rafraîchir'),
                  ),
                ],
              );

              if (stacked) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    primary,
                    AppGaps.x2,
                    Align(alignment: Alignment.centerLeft, child: secondary),
                  ],
                );
              }

              return Row(
                children: [
                  Expanded(child: primary),
                  AppGaps.horizontalX3,
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: secondary,
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _VoiceMessage extends StatelessWidget {
  const _VoiceMessage({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isError =
        message.toLowerCase().contains('error') ||
        message.toLowerCase().contains('erreur') ||
        message.toLowerCase().contains('failed') ||
        message.toLowerCase().contains('impossible');
    final accent = isError ? colorScheme.error : colorScheme.primary;
    return Container(
      padding: AppInsets.compactCard,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: accent.withValues(alpha: 0.24)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isError ? Icons.error_outline : Icons.check_circle_outline,
            color: accent,
          ),
          AppGaps.horizontalX2,
          Expanded(child: Text(message)),
        ],
      ),
    );
  }
}

class _InlineNotice extends StatelessWidget {
  const _InlineNotice({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: AppInsets.compactCard,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: colorScheme.primary),
          AppGaps.horizontalX2,
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class _EmptyVoiceState extends StatelessWidget {
  const _EmptyVoiceState();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: AppInsets.card,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.mic_none, color: colorScheme.primary),
            AppGaps.horizontalX3,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Aucune transcription pour le moment.',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  AppGaps.x1,
                  Text(
                    'Lance une dictée depuis le clavier ou l’overlay Android. Les textes validés apparaîtront ici.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TranscriptionTile extends StatelessWidget {
  const _TranscriptionTile({
    required this.item,
    required this.sendToEnabled,
    required this.onSendToClipboard,
    required this.onSendToSnippet,
    required this.onEdit,
    required this.onDelete,
  });

  final TranscriptionRecord item;
  final bool sendToEnabled;
  final VoidCallback? onSendToClipboard;
  final VoidCallback? onSendToSnippet;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final hasRawDiff = item.rawText.trim() != item.cleanedText.trim();

    return AppEntityCard(
      title: Text(item.cleanedText),
      bodyMaxLines: 5,
      tags: [
        AppTag(label: _languageLabel(item.language)),
        AppTag(label: _sourceLabel(item.source)),
        AppTag(label: _formatDuration(item.durationMs)),
        AppTag(label: _formatShortDateTime(item.createdAt)),
      ],
      notice: hasRawDiff
          ? Text(
              'Brut: ${item.rawText}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            )
          : null,
      actions: [
        SendToMenu(
          enabled: sendToEnabled,
          targets: const [SendToTarget.snippet, SendToTarget.clipboard],
          onSelected: (target) {
            if (target == SendToTarget.snippet) {
              onSendToSnippet?.call();
            } else {
              onSendToClipboard?.call();
            }
          },
        ),
        IconButton(
          tooltip: 'Modifier le texte nettoyé',
          onPressed: onEdit,
          icon: const Icon(Icons.edit_outlined),
        ),
        IconButton(
          tooltip: 'Supprimer',
          onPressed: onDelete,
          icon: const Icon(Icons.delete_outline),
        ),
      ],
    );
  }
}

class _RecordingMicAction extends StatefulWidget {
  const _RecordingMicAction({
    required this.isRecording,
    required this.isBusy,
    required this.onPressed,
  });

  final bool isRecording;
  final bool isBusy;
  final VoidCallback? onPressed;

  @override
  State<_RecordingMicAction> createState() => _RecordingMicActionState();
}

class _RecordingMicActionState extends State<_RecordingMicAction>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    );
    _syncAnimation();
  }

  @override
  void didUpdateWidget(covariant _RecordingMicAction oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.isRecording != widget.isRecording) {
      _syncAnimation();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _syncAnimation() {
    if (widget.isRecording) {
      _controller.repeat();
    } else {
      _controller.stop();
      _controller.value = 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final activeColor = widget.isRecording
        ? AppColors.danger
        : colorScheme.primary;
    final foreground = widget.isRecording
        ? AppColors.white
        : colorScheme.onPrimary;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final pulse = widget.isRecording
            ? Curves.easeOut.transform(1 - _controller.value)
            : 0.0;
        final glowOpacity = 0.12 + (pulse * 0.22);
        final scale = widget.isRecording ? 1 + (pulse * 0.035) : 1.0;

        return Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: [
            if (widget.isRecording)
              Positioned.fill(
                child: Transform.scale(
                  scale: 1.06 + (pulse * 0.16),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(
                        AppVoiceMetrics.recordingSurfaceRadius,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: activeColor.withValues(alpha: glowOpacity),
                          blurRadius: 22 + (pulse * 16),
                          spreadRadius: 2 + (pulse * 8),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            Transform.scale(
              scale: scale,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: activeColor,
                  foregroundColor: foreground,
                  disabledBackgroundColor: colorScheme.surfaceContainerHighest,
                  disabledForegroundColor: colorScheme.onSurfaceVariant,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.x4,
                    vertical: AppSpacing.x3,
                  ),
                ),
                onPressed: widget.onPressed,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.max,
                  children: [
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 180),
                      child: widget.isBusy
                          ? SizedBox(
                              key: const ValueKey('busy'),
                              width: AppIconMetrics.sm,
                              height: AppIconMetrics.sm,
                              child: CircularProgressIndicator(
                                strokeWidth: AppIconMetrics.progressStroke,
                                color: foreground,
                              ),
                            )
                          : Icon(
                              widget.isRecording ? Icons.mic : Icons.mic_none,
                              key: ValueKey(widget.isRecording),
                            ),
                    ),
                    AppGaps.horizontalX2,
                    Flexible(
                      child: Text(
                        widget.isRecording ? 'Arrêter' : 'Démarrer',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (widget.isRecording) ...[
                      AppGaps.horizontalX2,
                      _RecordingBars(
                        progress: _controller.value,
                        color: foreground,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _RecordingBars extends StatelessWidget {
  const _RecordingBars({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: AppVoiceMetrics.recordingSurfaceWidth,
      height: AppVoiceMetrics.recordingSurfaceHeight,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: List.generate(4, (index) {
          final wave = (progress + (index * 0.18)) % 1;
          final height =
              AppVoiceMetrics.recordingBarHeightBase +
              (Curves.easeInOut.transform(wave) *
                  AppVoiceMetrics.recordingBarHeightRange);
          return AnimatedContainer(
            duration: const Duration(milliseconds: 90),
            width: AppVoiceMetrics.recordingBarWidth,
            height: height,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.72),
              borderRadius: BorderRadius.circular(3),
            ),
          );
        }),
      ),
    );
  }
}
