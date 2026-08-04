import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/core/widgets/app_components.dart';
import 'package:commandglows_app/features/clipboard/application/clipboard_store_provider.dart';
import 'package:commandglows_app/features/clipboard/application/keyboard_clipboard_event_importer.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_capture_event.dart';
import 'package:commandglows_app/features/clipboard/domain/clipboard_store.dart';
import 'package:commandglows_app/features/clipboard/presentation/clipboard_screen.dart';
import 'package:commandglows_app/features/dictionary/application/dictionary_store_provider.dart';
import 'package:commandglows_app/features/dictionary/domain/dictionary_store.dart';
import 'package:commandglows_app/features/dictionary/presentation/dictionary_screen.dart';
import 'package:commandglows_app/features/snippets/application/snippet_store_provider.dart';
import 'package:commandglows_app/features/snippets/domain/snippet_store.dart';
import 'package:commandglows_app/features/snippets/presentation/snippets_screen.dart';
import 'package:commandglows_app/features/voice/application/transcription_store.dart';
import 'package:commandglows_app/features/voice/application/transcription_store_provider.dart';
import 'package:commandglows_app/features/voice/domain/transcription_draft.dart';
import 'package:commandglows_app/features/voice/presentation/voice_screen.dart';

const _keyboardChannel = MethodChannel('commandglows_app/keyboard');
const _overlayChannel = MethodChannel('commandglows_app/overlay');
const _secureStorageChannel = MethodChannel(
  'plugins.it_nomads.com/flutter_secure_storage',
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(_installPlatformMocks);
  tearDown(_clearPlatformMocks);

  testWidgets('snippets page uses shared scoped search and refresh status', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 5, 30, 8);
    await _pumpPage(
      tester,
      const SnippetsScreen(),
      overrides: [
        snippetStoreProvider.overrideWithValue(
          _FakeSnippetStore([
            SnippetRecord(
              id: 'snippet-1',
              trigger: 'addr',
              content: '42 Rue des Lilas',
              label: 'Adresse',
              createdAt: now,
            ),
            SnippetRecord(
              id: 'snippet-2',
              trigger: 'mail',
              content: 'Signature pro',
              label: 'Email',
              createdAt: now,
            ),
          ]),
        ),
      ],
    );

    expect(find.byType(ProductPageScaffold), findsOneWidget);
    _expectPageHero(
      tester,
      scope: 'Snippets',
      statusKind: AppSyncStatusKind.idle,
      expectedMetrics: const [
        (label: '2', value: 'snippets'),
        (label: '2', value: 'libellés'),
      ],
      recencyValue: 'dernier ajout',
    );
    expect(
      tester.getTopLeft(find.widgetWithText(TextField, 'Déclencheur')).dy,
      tester
          .getTopLeft(find.widgetWithText(TextField, 'Libellé (optionnel)'))
          .dy,
    );

    await tester.enterText(find.byKey(const Key('app-search-field')), 'lilas');
    await tester.pump();

    expect(find.text('addr'), findsOneWidget);
    expect(find.text('mail'), findsNothing);
  });

  testWidgets('dictionary page uses shared scoped search and refresh status', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 5, 30, 8);
    await _pumpPage(
      tester,
      const DictionaryScreen(),
      overrides: [
        dictionaryStoreProvider.overrideWithValue(
          _FakeDictionaryStore([
            DictionaryTermRecord(
              id: 'dict-1',
              term: 'bjr',
              replacement: 'bonjour',
              caseSensitive: false,
              createdAt: now,
            ),
            DictionaryTermRecord(
              id: 'dict-2',
              term: 'rdv',
              replacement: 'rendez-vous',
              caseSensitive: true,
              createdAt: now,
            ),
          ]),
        ),
      ],
    );

    expect(find.byType(ProductPageScaffold), findsOneWidget);
    _expectPageHero(
      tester,
      scope: 'Dictionnaire',
      statusKind: AppSyncStatusKind.idle,
      expectedMetrics: const [
        (label: '2', value: 'termes'),
        (label: '1', value: 'casse stricte'),
      ],
      recencyValue: 'dernier ajout',
    );
    expect(
      tester.getTopLeft(find.widgetWithText(TextField, 'Terme').first).dy,
      tester
          .getTopLeft(find.widgetWithText(TextField, 'Remplacement').first)
          .dy,
    );

    await tester.enterText(find.byKey(const Key('app-search-field')), 'rendez');
    await tester.pump();

    expect(find.text('rdv'), findsOneWidget);
    expect(find.text('bjr'), findsNothing);
  });

  testWidgets('clipboard page keeps search scoped and exposes pending status', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 5, 30, 8);
    await _pumpPage(
      tester,
      const ClipboardScreen(),
      overrides: [
        clipboardStoreProvider.overrideWithValue(
          _FakeClipboardStore([
            _clipboardItem(
              id: 'clip-1',
              content: 'Facture Alpha',
              createdAt: now,
              syncState: ClipboardSyncState.pending,
            ),
            _clipboardItem(
              id: 'clip-2',
              content: 'Note Beta',
              createdAt: now,
              syncState: ClipboardSyncState.synced,
            ),
          ]),
        ),
        keyboardClipboardEventImporterProvider.overrideWith((ref) {
          return KeyboardClipboardEventImporter(
            ref.read(clipboardHistoryApiProvider),
            drainEvents: () async => const [],
          );
        }),
      ],
    );

    expect(find.byType(ProductPageScaffold), findsOneWidget);
    _expectPageHero(
      tester,
      scope: 'Clipboard',
      statusKind: AppSyncStatusKind.pending,
      expectedMetrics: const [
        (label: '2', value: 'items'),
        (label: '0', value: 'épinglés'),
      ],
      recencyValue: 'dernier vu',
    );
    expect(
      tester
          .getSize(
            find.byType(DropdownButtonFormField<ClipboardCanonicalSource>),
          )
          .height,
      greaterThanOrEqualTo(AppInputMetrics.minHeight),
    );

    await tester.enterText(find.byKey(const Key('app-search-field')), 'beta');
    await tester.pump();

    expect(find.textContaining('Note Beta'), findsOneWidget);
    expect(find.textContaining('Facture Alpha'), findsNothing);
  });

  testWidgets(
    'voice page uses scoped search without replacing overlay controls',
    (tester) async {
      final now = DateTime.utc(2026, 5, 30, 8);
      await _pumpPage(
        tester,
        const VoiceScreen(),
        overrides: [
          transcriptionStoreProvider.overrideWithValue(
            _FakeTranscriptionStore([
              TranscriptionRecord(
                id: 'voice-1',
                rawText: 'dictée brute',
                cleanedText: 'Compte rendu Alpha',
                language: 'fr-FR',
                source: 'keyboard',
                durationMs: 1400,
                createdAt: now,
                updatedAt: now,
                syncStatus: const SyncStatus(health: SyncHealth.synced),
              ),
              TranscriptionRecord(
                id: 'voice-2',
                rawText: 'raw beta',
                cleanedText: 'Mémo Beta',
                language: 'en-US',
                source: 'overlay',
                durationMs: 2200,
                createdAt: now,
                updatedAt: now,
                syncStatus: const SyncStatus(health: SyncHealth.pending),
              ),
            ]),
          ),
        ],
      );

      expect(find.byType(ProductPageScaffold), findsOneWidget);
      _expectPageHero(
        tester,
        scope: 'Voix',
        statusKind: AppSyncStatusKind.idle,
        expectedMetrics: const [
          (label: '2', value: 'captures'),
          (label: 'Overlay désactivé', value: 'Overlay à autoriser'),
        ],
        recencyValue: 'dernier ajout',
      );

      await tester.enterText(
        find.byKey(const Key('app-search-field')),
        'overlay',
      );
      await tester.pump();

      expect(find.textContaining('Mémo Beta'), findsOneWidget);
      expect(find.textContaining('Compte rendu Alpha'), findsNothing);
    },
  );
}

void _expectPageHero(
  WidgetTester tester, {
  required String scope,
  required AppSyncStatusKind statusKind,
  required List<({String label, String value})> expectedMetrics,
  required String recencyValue,
}) {
  final heroFinder = find.byType(AppPageHeroCard);
  expect(heroFinder, findsOneWidget);

  final hero = tester.widget<AppPageHeroCard>(heroFinder);
  expect(hero.title, isNotEmpty);
  expect(hero.subtitle, isNotEmpty);
  expect(hero.leadingIcon, isNotNull);
  expect(hero.trailing, isNotNull);
  expect(hero.metrics, hasLength(4));

  final statusPill = hero.metrics.whereType<AppStatusPill>().single;
  expect(statusPill.label, 'Statut');
  expect(statusPill.status.kind, statusKind);

  final metrics = hero.metrics.whereType<AppMetricPill>().toList();
  expect(metrics, hasLength(3));
  for (final expected in expectedMetrics) {
    expect(
      metrics.any(
        (metric) =>
            metric.label == expected.label && metric.value == expected.value,
      ),
      isTrue,
      reason:
          'Expected hero metric "${expected.label} · ${expected.value}" for $scope.',
    );
  }
  expect(metrics.last.label, isNotEmpty);
  expect(metrics.last.value, recencyValue);

  final searchField = hero.searchField;
  expect(searchField, isA<AppSearchField>());
  final scopedSearch = searchField! as AppSearchField;
  expect(scopedSearch.scopeLabel, scope);
  expect(scopedSearch.enabled, isTrue);

  final syncAction = hero.syncAction;
  expect(syncAction, isA<AppSyncStatusAction>());
  final statusAction = syncAction! as AppSyncStatusAction;
  expect(statusAction.scopeLabel, scope);
  expect(statusAction.status.kind, statusKind);
  expect(statusAction.onPressed, isNotNull);

  expect(
    find.descendant(of: heroFinder, matching: find.byType(AppPageToolbar)),
    findsOneWidget,
  );
  expect(
    find.descendant(of: heroFinder, matching: find.byType(AppSearchField)),
    findsOneWidget,
  );
  expect(
    find.descendant(
      of: heroFinder,
      matching: find.widgetWithText(
        OutlinedButton,
        statusAction.status.statusLabel(),
      ),
    ),
    findsOneWidget,
  );
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
  await tester.pumpAndSettle();
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
  messenger.setMockMethodCallHandler(_secureStorageChannel, (call) async {
    switch (call.method) {
      case 'containsKey':
        return false;
      case 'read':
        return null;
      case 'readAll':
        return <String, String>{};
      case 'write':
      case 'delete':
      case 'deleteAll':
        return null;
    }
    return null;
  });
}

void _clearPlatformMocks() {
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  messenger.setMockMethodCallHandler(_keyboardChannel, null);
  messenger.setMockMethodCallHandler(_overlayChannel, null);
  messenger.setMockMethodCallHandler(_secureStorageChannel, null);
}

ClipboardItemRecord _clipboardItem({
  required String id,
  required String content,
  required DateTime createdAt,
  required ClipboardSyncState syncState,
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
    originSurface: 'test',
    originDeviceId: null,
    captureMethod: 'manual',
    syncState: syncState,
    captureCount: 1,
    sourceMetadata: const {},
  );
}

class _FakeSnippetStore implements SnippetStore {
  const _FakeSnippetStore(this.records);

  final List<SnippetRecord> records;

  @override
  Future<List<SnippetRecord>> list() async => records;

  @override
  Future<void> insert({
    required String trigger,
    required String content,
    String? label,
  }) {
    throw UnimplementedError();
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

class _FakeDictionaryStore implements DictionaryStore {
  const _FakeDictionaryStore(this.records);

  final List<DictionaryTermRecord> records;

  @override
  Future<List<DictionaryTermRecord>> list() async => records;

  @override
  Future<void> insert({
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> softDelete(String id) {
    throw UnimplementedError();
  }

  @override
  Future<void> update({
    required String id,
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) {
    throw UnimplementedError();
  }
}

class _FakeClipboardStore implements ClipboardHistoryStore {
  const _FakeClipboardStore(this.records);

  final List<ClipboardItemRecord> records;

  @override
  Future<List<ClipboardItemRecord>> list() async => records;

  @override
  Future<ClipboardItemRecord?> getById(String id) {
    throw UnimplementedError();
  }

  @override
  Future<void> insert({
    required String content,
    required ClipboardCanonicalSource source,
    String? originDeviceId,
    ClipboardSyncState syncState = ClipboardSyncState.synced,
    DateTime? capturedAtUtc,
    Map<String, Object?> sourceMetadata = const <String, Object?>{},
    bool sensitiveConfirmed = false,
  }) {
    throw UnimplementedError();
  }

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

  @override
  Future<ClipboardItemRecord> upsertAutomaticWithinWindow(
    ClipboardAutomaticUpsertDraft draft,
  ) {
    throw UnimplementedError();
  }
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
