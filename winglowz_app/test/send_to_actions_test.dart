import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/features/clipboard/application/clipboard_store_provider.dart';
import 'package:commandglows_app/features/clipboard/application/keyboard_clipboard_event_importer.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_capture_event.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_store.dart';
import 'package:commandglows_app/features/clipboard/presentation/clipboard_screen.dart';
import 'package:commandglows_app/features/snippets/application/snippet_store_provider.dart';
import 'package:commandglows_app/features/snippets/domain/snippet_store.dart';
import 'package:commandglows_app/features/send_to/presentation/send_to_actions.dart';
import 'package:commandglows_app/features/voice/application/transcription_store.dart';
import 'package:commandglows_app/features/voice/application/transcription_store_provider.dart';
import 'package:commandglows_app/features/voice/domain/transcription_draft.dart';
import 'package:commandglows_app/features/voice/presentation/voice_screen.dart';

const _keyboardChannel = MethodChannel('commandglows_app/keyboard');
const _overlayChannel = MethodChannel('commandglows_app/overlay');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(_installPlatformMocks);
  tearDown(_clearPlatformMocks);

  testWidgets('voice send-to adds a transcription to Clipboard CommandGlows', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 5, 30, 20);
    final clipboardStore = _FakeClipboardStore();

    await _pumpPage(
      tester,
      const VoiceScreen(),
      overrides: [
        transcriptionStoreProvider.overrideWithValue(
          _FakeTranscriptionStore([
            TranscriptionRecord(
              id: 'voice-1',
              rawText: 'texte brut',
              cleanedText: 'Compte rendu nettoyé',
              language: 'fr-FR',
              source: 'keyboard',
              durationMs: 1400,
              createdAt: now,
              updatedAt: now,
              syncStatus: const SyncStatus(health: SyncHealth.synced),
            ),
          ]),
        ),
        clipboardStoreProvider.overrideWithValue(clipboardStore),
      ],
    );

    final menu = _sendToMenu(tester);
    menu.onSelected?.call(SendToTarget.clipboard);
    await tester.pump(const Duration(milliseconds: 250));

    expect(clipboardStore.inserted, hasLength(1));
    expect(clipboardStore.inserted.single.content, 'Compte rendu nettoyé');
    expect(
      clipboardStore.inserted.single.source,
      ClipboardCanonicalSource.voice,
    );
    expect(find.text('Transcription envoyée vers Clipboard.'), findsOneWidget);
  });

  testWidgets('voice send-to creates a snippet from cleaned text', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 5, 30, 20);
    final snippetStore = _FakeSnippetStore();

    await _pumpPage(
      tester,
      const VoiceScreen(),
      overrides: [
        transcriptionStoreProvider.overrideWithValue(
          _FakeTranscriptionStore([
            TranscriptionRecord(
              id: 'voice-1',
              rawText: 'texte brut',
              cleanedText: 'Réponse client prête',
              language: 'fr-FR',
              source: 'keyboard',
              durationMs: 1400,
              createdAt: now,
              updatedAt: now,
              syncStatus: const SyncStatus(health: SyncHealth.synced),
            ),
          ]),
        ),
        snippetStoreProvider.overrideWithValue(snippetStore),
      ],
    );

    final menu = _sendToMenu(tester);
    menu.onSelected?.call(SendToTarget.snippet);
    await tester.pump(const Duration(milliseconds: 250));

    await tester.enterText(
      find.widgetWithText(TextField, 'Déclencheur'),
      'repclient',
    );
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Créer le snippet'));
    await tester.pump(const Duration(milliseconds: 250));

    expect(snippetStore.inserted, hasLength(1));
    expect(snippetStore.inserted.single.trigger, 'repclient');
    expect(snippetStore.inserted.single.content, 'Réponse client prête');
    expect(snippetStore.inserted.single.label, 'Voix');
    expect(find.text('Snippet créé depuis la transcription.'), findsOneWidget);
  });

  testWidgets('voice send-to clipboard requires sensitive confirmation', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 5, 30, 20);
    final clipboardStore = _FakeClipboardStore();

    await _pumpPage(
      tester,
      const VoiceScreen(),
      overrides: [
        transcriptionStoreProvider.overrideWithValue(
          _FakeTranscriptionStore([
            TranscriptionRecord(
              id: 'voice-1',
              rawText: 'password: hunter2',
              cleanedText: 'password: hunter2',
              language: 'fr-FR',
              source: 'keyboard',
              durationMs: 1400,
              createdAt: now,
              updatedAt: now,
              syncStatus: const SyncStatus(health: SyncHealth.synced),
            ),
          ]),
        ),
        clipboardStoreProvider.overrideWithValue(clipboardStore),
      ],
    );

    final menu = _sendToMenu(tester);
    menu.onSelected?.call(SendToTarget.clipboard);
    await tester.pump(const Duration(milliseconds: 250));

    expect(find.text('Contenu sensible'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'Annuler').last);
    await tester.pump(const Duration(milliseconds: 250));

    expect(clipboardStore.inserted, isEmpty);

    menu.onSelected?.call(SendToTarget.clipboard);
    await tester.pump(const Duration(milliseconds: 250));
    await tester.tap(find.widgetWithText(FilledButton, 'Ajouter'));
    await tester.pump(const Duration(milliseconds: 250));

    expect(clipboardStore.inserted, hasLength(1));
    expect(clipboardStore.inserted.single.sensitiveConfirmed, isTrue);
  });

  testWidgets('clipboard send-to creates a snippet from clipboard content', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 5, 30, 20);
    final snippetStore = _FakeSnippetStore();

    await _pumpPage(
      tester,
      const ClipboardScreen(),
      overrides: [
        clipboardStoreProvider.overrideWithValue(
          _FakeClipboardStore([
            _clipboardItem(
              id: 'clip-1',
              content: 'Texte réutilisable clipboard',
              createdAt: now,
            ),
          ]),
        ),
        snippetStoreProvider.overrideWithValue(snippetStore),
        keyboardClipboardEventImporterProvider.overrideWith((ref) {
          return KeyboardClipboardEventImporter(
            ref.read(clipboardHistoryApiProvider),
            drainEvents: () async => const [],
          );
        }),
      ],
    );

    final menu = _sendToMenu(tester);
    menu.onSelected?.call(SendToTarget.snippet);
    await tester.pump(const Duration(milliseconds: 250));

    await tester.enterText(
      find.widgetWithText(TextField, 'Déclencheur'),
      'cliptxt',
    );
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Créer le snippet'));
    await tester.pump(const Duration(milliseconds: 250));

    expect(snippetStore.inserted, hasLength(1));
    expect(snippetStore.inserted.single.trigger, 'cliptxt');
    expect(
      snippetStore.inserted.single.content,
      'Texte réutilisable clipboard',
    );
    expect(snippetStore.inserted.single.label, 'Clipboard');
    expect(find.text('Snippet créé depuis le clipboard.'), findsOneWidget);
  });
}

PopupMenuButton<SendToTarget> _sendToMenu(WidgetTester tester) {
  expect(find.byTooltip('Envoyer vers'), findsOneWidget);
  return tester.widget<PopupMenuButton<SendToTarget>>(
    find.byType(PopupMenuButton<SendToTarget>).first,
  );
}

void _installPlatformMocks() {
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  messenger.setMockMethodCallHandler(_keyboardChannel, (call) async {
    switch (call.method) {
      case 'getKeyboardStatus':
        return <String, Object?>{
          'supported': true,
          'enabled': false,
          'active': false,
          'voiceEnabled': true,
          'voiceLanguageTag': 'fr-FR',
          'clipboardSyncDesired': false,
          'mediaControlsEnabled': true,
          'mediaSessionAccessGranted': false,
          'systemSettingsWriteGranted': false,
          'privacyMode': 'auto',
          'keyVibrationEnabled': true,
          'keySoundEnabled': false,
          'spellingSuggestionsEnabled': true,
          'specialKeyCornersEnabled': false,
          'autoCloseModesEnabled': true,
          'frenchLanguageEnabled': true,
          'englishLanguageEnabled': true,
        };
      case 'drainKeyboardClipboardEvents':
      case 'drainKeyboardVoiceEvents':
      case 'drainKeyboardVoiceRuntimeEvents':
        return <Object?>[];
      case 'setKeyboardSnippetRules':
      case 'setKeyboardDictionaryRules':
      case 'setKeyboardVoiceRuntimeConfig':
      case 'probeKeyboardLocalRuntimePath':
        return true;
    }
    return null;
  });
  messenger.setMockMethodCallHandler(_overlayChannel, (call) async {
    switch (call.method) {
      case 'getOverlayStatus':
        return <String, Object?>{
          'enabled': false,
          'requestedEnabled': false,
          'running': false,
          'serviceState': 'idle',
          'overlayPermissionGranted': false,
          'accessibilityPermissionGranted': false,
          'recordAudioGranted': false,
          'deliveryMode': 'clipboard_only',
          'sizeScale': 1.0,
          'opacity': 0.8,
        };
      case 'drainOverlayEvents':
        return <Object?>[];
    }
    return null;
  });
}

void _clearPlatformMocks() {
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  messenger.setMockMethodCallHandler(_keyboardChannel, null);
  messenger.setMockMethodCallHandler(_overlayChannel, null);
}

Future<void> _pumpPage(
  WidgetTester tester,
  Widget child, {
  List<Object> overrides = const [],
}) async {
  await tester.binding.setSurfaceSize(const Size(1100, 1700));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides.cast(),
      child: MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: child),
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 250));
}

class _InsertedClipboardItem {
  const _InsertedClipboardItem({
    required this.content,
    required this.source,
    required this.sensitiveConfirmed,
  });

  final String content;
  final ClipboardCanonicalSource source;
  final bool sensitiveConfirmed;
}

class _InsertedSnippet {
  const _InsertedSnippet({
    required this.trigger,
    required this.content,
    required this.label,
  });

  final String trigger;
  final String content;
  final String? label;
}

class _FakeTranscriptionStore implements TranscriptionStore {
  const _FakeTranscriptionStore(this.records);

  final List<TranscriptionRecord> records;

  @override
  Future<List<TranscriptionRecord>> list() async => records;

  @override
  Future<TranscriptionRecord> insert(TranscriptionDraft draft) {
    throw UnimplementedError();
  }

  @override
  Future<void> softDelete(String id) {
    throw UnimplementedError();
  }

  @override
  Future<void> updateCleanedText({
    required String id,
    required String cleanedText,
  }) {
    throw UnimplementedError();
  }
}

class _FakeSnippetStore implements SnippetStore {
  final List<_InsertedSnippet> inserted = [];

  @override
  Future<List<SnippetRecord>> list() async => const [];

  @override
  Future<void> insert({
    required String trigger,
    required String content,
    String? label,
  }) async {
    inserted.add(
      _InsertedSnippet(
        trigger: trigger.trim(),
        content: content.trim(),
        label: label?.trim().isEmpty == true ? null : label?.trim(),
      ),
    );
  }

  @override
  Future<void> softDelete(String id) {
    throw UnimplementedError();
  }

  @override
  Future<void> update({
    required String id,
    required String trigger,
    required String content,
    String? label,
  }) {
    throw UnimplementedError();
  }
}

class _FakeClipboardStore implements ClipboardHistoryStore {
  _FakeClipboardStore([List<ClipboardItemRecord>? records])
    : records = records ?? [];

  final List<ClipboardItemRecord> records;
  final List<_InsertedClipboardItem> inserted = [];

  @override
  Future<List<ClipboardItemRecord>> list() async => records;

  @override
  Future<void> insert({
    required String content,
    required ClipboardCanonicalSource source,
    String? originDeviceId,
    ClipboardSyncState syncState = ClipboardSyncState.synced,
    DateTime? capturedAtUtc,
    Map<String, Object?> sourceMetadata = const <String, Object?>{},
    bool sensitiveConfirmed = false,
  }) async {
    inserted.add(
      _InsertedClipboardItem(
        content: content.trim(),
        source: source,
        sensitiveConfirmed: sensitiveConfirmed,
      ),
    );
  }

  @override
  Future<ClipboardItemRecord> upsertAutomaticWithinWindow(
    ClipboardAutomaticUpsertDraft draft,
  ) {
    throw UnimplementedError();
  }

  @override
  Future<ClipboardItemRecord?> getById(String id) async => null;

  @override
  Future<void> markSyncState({
    required String id,
    required ClipboardSyncState state,
    String? syncError,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> softDelete(String id) {
    throw UnimplementedError();
  }

  @override
  Future<void> togglePin({required String id, required bool pinned}) {
    throw UnimplementedError();
  }

  @override
  Future<void> updateContent({
    required String id,
    required String content,
    bool sensitiveConfirmed = false,
  }) {
    throw UnimplementedError();
  }
}

ClipboardItemRecord _clipboardItem({
  required String id,
  required String content,
  required DateTime createdAt,
}) {
  return ClipboardItemRecord(
    id: id,
    content: content,
    source: ClipboardCanonicalSource.manual.databaseValue,
    pinned: false,
    createdAt: createdAt,
    capturedAt: createdAt,
    lastSeenAt: createdAt,
    modifiedAt: createdAt,
    updatedAt: createdAt,
    contentHash: null,
    normalizedHash: null,
    originSurface: ClipboardCanonicalSource.manual.originSurface,
    originDeviceId: null,
    captureMethod: ClipboardCanonicalSource.manual.captureMethod,
    syncState: ClipboardSyncState.synced,
    captureCount: 1,
    sourceMetadata: const <String, Object?>{},
  );
}
