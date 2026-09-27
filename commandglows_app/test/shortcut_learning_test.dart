import 'package:commandglows_app/core/storage/local_json_persistence.dart';
import 'package:commandglows_app/core/sync/sync_status.dart';
import 'package:commandglows_app/features/auth/domain/auth_session_store.dart';
import 'package:commandglows_app/features/shortcut_learning/data/local_shortcut_repository.dart';
import 'package:commandglows_app/features/shortcut_learning/domain/shortcut_entry.dart';
import 'package:commandglows_app/features/shortcut_learning/application/shortcut_repository_provider.dart';
import 'package:commandglows_app/features/shortcut_learning/presentation/shortcut_sheet_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

class _MemoryPersistence extends LocalJsonPersistence {
  _MemoryPersistence() : super('test_shortcuts');

  List<Map<String, dynamic>> rows = [];

  @override
  Future<List<Map<String, dynamic>>> read() async =>
      rows.map((row) => Map<String, dynamic>.from(row)).toList();

  @override
  Future<void> write(List<Map<String, Object?>> items) async {
    rows = items.map((item) => Map<String, dynamic>.from(item)).toList();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('captures and compares one chord', (tester) async {
    final keyboard = HardwareKeyboard.instance;
    await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await tester.sendKeyDownEvent(LogicalKeyboardKey.keyK);
    final chord = ShortcutChord.fromKeyEvent(
      KeyDownEvent(
        physicalKey: PhysicalKeyboardKey.keyK,
        logicalKey: LogicalKeyboardKey.keyK,
        timeStamp: Duration.zero,
      ),
    );
    expect(keyboard.isControlPressed, isTrue);
    expect(chord?.label, 'Ctrl + K');
    expect(
      chord?.matches(
        ShortcutChord(
          keyId: LogicalKeyboardKey.keyK.keyId,
          keyLabel: 'K',
          control: true,
        ),
      ),
      isTrue,
    );
    expect(
      chord?.matches(
        ShortcutChord(keyId: LogicalKeyboardKey.keyK.keyId, keyLabel: 'K'),
      ),
      isFalse,
    );
    await tester.sendKeyUpEvent(LogicalKeyboardKey.keyK);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
  });

  test('persists, updates, groups by app data and deletes entries', () async {
    final persistence = _MemoryPersistence();
    final repository = LocalShortcutRepository(
      persistence: persistence,
      clock: () => DateTime.utc(2026, 9, 27),
    );
    const chord = ShortcutChord(keyId: 75, keyLabel: 'K', control: true);
    await repository.save(
      appName: ' YouTube ',
      description: ' Lecture ',
      chord: chord,
    );
    await repository.save(
      appName: 'Chrome',
      description: 'Onglet',
      chord: chord,
    );
    var rows = await LocalShortcutRepository(persistence: persistence).list();
    expect(rows.map((item) => item.appName), ['Chrome', 'YouTube']);
    final id = rows.last.id;
    await repository.save(
      id: id,
      appName: 'YouTube',
      description: 'Pause',
      chord: chord,
    );
    rows = await repository.list();
    expect(rows.last.description, 'Pause');
    await repository.delete(id);
    expect((await repository.list()).single.appName, 'Chrome');
  });

  test('rejects blank fields and skips malformed saved rows', () async {
    final persistence = _MemoryPersistence();
    final repository = LocalShortcutRepository(persistence: persistence);
    const chord = ShortcutChord(keyId: 75, keyLabel: 'K');
    await expectLater(
      repository.save(appName: ' ', description: 'Action', chord: chord),
      throwsFormatException,
    );
    persistence.rows = [
      {'id': 'broken'},
      {
        'id': 'valid',
        'appName': 'App',
        'description': 'Action',
        'chord': chord.toJson(),
        'createdAt': DateTime.utc(2026).toIso8601String(),
      },
    ];
    expect((await repository.list()).single.id, 'valid');
  });

  test('local storage keys isolate accounts and local mode', () {
    AuthSessionSnapshot session(String id) => AuthSessionSnapshot(
      user: AuthUserSnapshot(id: id, provider: AuthProviderKind.emailPassword),
      syncStatus: const SyncStatus(health: SyncHealth.synced),
    );
    final alice = shortcutStorageKeyForSession(session('alice'));
    final bob = shortcutStorageKeyForSession(session('bob'));
    expect(alice, isNot(bob));
    expect(
      alice,
      isNot(
        shortcutStorageKeyForSession(const AuthSessionSnapshot.localFallback()),
      ),
    );
    expect(shortcutStorageKeyForSession(session('alice')), alice);
    expect(
      shortcutStorageKeyForSession(
        const AuthSessionSnapshot(
          user: null,
          syncStatus: SyncStatus.unavailable(),
        ),
      ),
      isNull,
    );
  });

  test('manual parser handles system shortcuts and rejects sequences', () {
    final winLock = ShortcutChord.tryParse('Win+L');
    expect(winLock?.label, 'Win + L');
    expect(winLock?.requiresSelfAssessment, isTrue);
    final switchApp = ShortcutChord.tryParse('Alt+Tab');
    expect(switchApp?.label, 'Alt + Tab');
    expect(switchApp?.requiresSelfAssessment, isTrue);
    expect(
      ShortcutChord.tryParse('Ctrl+Alt+K')?.requiresSelfAssessment,
      isTrue,
    );
    expect(
      ShortcutChord.tryParse('Ctrl+Alt+G')?.requiresSelfAssessment,
      isTrue,
    );
    expect(
      ShortcutChord.tryParse('Ctrl+Alt+Espace')?.requiresSelfAssessment,
      isTrue,
    );
    expect(ShortcutChord.tryParse('Ctrl+K Ctrl+S'), isNull);
  });

  test(
    'imports a source idempotently and keeps manual entries separate',
    () async {
      final repository = LocalShortcutRepository(
        persistence: _MemoryPersistence(),
      );
      final first = ShortcutChord.fromDisplayLabel('Ctrl+Alt+G');
      await repository.save(
        appName: 'CommandGlows · Grille du bureau',
        description: 'Mon rappel manuel',
        chord: first,
      );
      await repository.upsertSource(
        sourceId: 'desktop-grid:activation',
        appName: 'CommandGlows · Grille du bureau',
        description: 'Afficher la grille',
        chord: first,
        selfAssessmentOnly: true,
      );
      await repository.upsertSource(
        sourceId: 'desktop-grid:activation',
        appName: 'CommandGlows · Grille du bureau',
        description: 'Afficher la grille',
        chord: ShortcutChord.fromDisplayLabel('Ctrl+Alt+H'),
        selfAssessmentOnly: true,
      );
      final rows = await repository.list();
      expect(rows.length, 2);
      expect(
        rows.singleWhere((row) => row.sourceId == null).description,
        'Mon rappel manuel',
      );
      final linked = rows.singleWhere((row) => row.sourceId != null);
      expect(linked.chord.label, 'Ctrl + Alt + H');
      expect(linked.requiresSelfAssessment, isTrue);
    },
  );

  test('unknown physical labels remain self-assessed', () {
    expect(
      ShortcutChord.fromDisplayLabel('F2').requiresSelfAssessment,
      isFalse,
    );
    final unknown = ShortcutChord.fromDisplayLabel('Touche 0x56');
    expect(unknown.label, 'Touche 0x56');
    expect(unknown.requiresSelfAssessment, isTrue);
  });

  test(
    'reconciles only linked grid sources and removes shifted slots',
    () async {
      final repository = LocalShortcutRepository(
        persistence: _MemoryPersistence(),
      );
      final space = ShortcutChord.fromDisplayLabel('Espace');
      final f1 = ShortcutChord.fromDisplayLabel('F1');
      await repository.save(
        appName: 'CommandGlows',
        description: 'Manuel',
        chord: f1,
      );
      await repository.upsertSource(
        sourceId: 'desktop-grid:leftClick:0',
        appName: 'CommandGlows',
        description: 'Clic gauche',
        chord: space,
      );
      await repository.upsertSource(
        sourceId: 'desktop-grid:leftClick:1',
        appName: 'CommandGlows',
        description: 'Clic gauche',
        chord: f1,
      );
      await repository.reconcileSources(
        prefix: 'desktop-grid:',
        current: {
          'desktop-grid:leftClick:0': ShortcutSourceDraft(
            appName: 'CommandGlows',
            description: 'Clic gauche',
            chord: f1,
          ),
        },
      );
      final rows = await repository.list();
      expect(rows, hasLength(2));
      expect(
        rows.singleWhere((row) => row.sourceId == null).description,
        'Manuel',
      );
      expect(rows.singleWhere((row) => row.sourceId != null).chord.label, 'F1');
      expect(
        rows.where((row) => row.sourceId == 'desktop-grid:leftClick:1'),
        isEmpty,
      );
    },
  );

  test(
    'manual edit detaches an imported source from later reconciliation',
    () async {
      final repository = LocalShortcutRepository(
        persistence: _MemoryPersistence(),
      );
      await repository.upsertSource(
        sourceId: 'desktop-grid:activation',
        appName: 'CommandGlows',
        description: 'Afficher la grille',
        chord: ShortcutChord.fromDisplayLabel('Ctrl+Alt+G'),
        selfAssessmentOnly: true,
      );
      final imported = (await repository.list()).single;
      await repository.save(
        id: imported.id,
        appName: 'Mon application',
        description: 'Mon action',
        chord: ShortcutChord.fromDisplayLabel('F2'),
      );
      await repository.reconcileSources(
        prefix: 'desktop-grid:',
        current: {
          'desktop-grid:activation': ShortcutSourceDraft(
            appName: 'CommandGlows',
            description: 'Afficher la grille',
            chord: ShortcutChord.fromDisplayLabel('Ctrl+Alt+H'),
            selfAssessmentOnly: true,
          ),
        },
      );
      final rows = await repository.list();
      expect(rows, hasLength(1));
      expect(rows.single.sourceId, isNull);
      expect(rows.single.description, 'Mon action');
      expect(rows.single.chord.label, 'F2');
      expect(rows.single.requiresSelfAssessment, isFalse);
    },
  );

  test(
    'description-only edit keeps imported global hotkey self-assessed',
    () async {
      final repository = LocalShortcutRepository(
        persistence: _MemoryPersistence(),
      );
      await repository.upsertSource(
        sourceId: 'desktop-grid:activation',
        appName: 'CommandGlows',
        description: 'Afficher la grille',
        chord: ShortcutChord.fromDisplayLabel('Ctrl+Alt+G'),
        selfAssessmentOnly: true,
      );
      final entry = (await repository.list()).single;
      await repository.save(
        id: entry.id,
        appName: entry.appName,
        description: 'Mon aide mémoire',
        chord: entry.chord,
      );
      final edited = (await repository.list()).single;
      expect(edited.sourceId, isNull);
      expect(edited.requiresSelfAssessment, isTrue);
    },
  );

  test(
    'parses grid labels for backspace, pages, and extended function keys',
    () {
      for (final label in [
        'Retour arrière',
        'Page précédente',
        'Page suivante',
        'F13',
        'F24',
      ]) {
        final chord = ShortcutChord.fromDisplayLabel(label);
        expect(chord.keyId, isNot(0), reason: label);
        expect(chord.requiresSelfAssessment, isFalse, reason: label);
      }
    },
  );

  testWidgets('adds a shortcut and practices the captured combination', (
    tester,
  ) async {
    final repository = LocalShortcutRepository(
      persistence: _MemoryPersistence(),
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [shortcutRepositoryProvider.overrideWithValue(repository)],
        child: const MaterialApp(home: ShortcutSheetScreen()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ajouter un raccourci'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).at(0), 'YouTube');
    await tester.enterText(find.byType(TextField).at(1), 'Lecture/Pause');
    await tester.tap(find.text('Saisir la combinaison'));
    await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await tester.sendKeyDownEvent(LogicalKeyboardKey.keyK);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.keyK);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
    await tester.pump();
    expect(find.text('Ctrl + K'), findsOneWidget);
    await tester.tap(find.text('Enregistrer'));
    await tester.pumpAndSettle();
    expect(find.text('YouTube'), findsOneWidget);
    expect(find.text('Lecture/Pause'), findsOneWidget);
    await tester.tap(find.text('S’entraîner'));
    await tester.pumpAndSettle();
    await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await tester.sendKeyDownEvent(LogicalKeyboardKey.keyK);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.keyK);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
    await tester.pump();
    expect(find.textContaining('Bravo !'), findsOneWidget);
  });

  testWidgets('manually enters a reserved chord and self-assesses', (
    tester,
  ) async {
    final repository = LocalShortcutRepository(
      persistence: _MemoryPersistence(),
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [shortcutRepositoryProvider.overrideWithValue(repository)],
        child: const MaterialApp(home: ShortcutSheetScreen()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ajouter un raccourci'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).at(0), 'Windows');
    await tester.enterText(find.byType(TextField).at(1), 'Verrouiller');
    await tester.enterText(find.byType(TextField).at(2), 'Win+L');
    await tester.tap(find.text('Enregistrer'));
    await tester.pumpAndSettle();
    expect(find.text('Win + L'), findsOneWidget);
    await tester.tap(find.text('S’entraîner'));
    await tester.pumpAndSettle();
    expect(find.textContaining('interceptée'), findsOneWidget);
    await tester.tap(find.text('Je l’ai réussi'));
    await tester.pump();
    expect(find.textContaining('Réussi :'), findsOneWidget);
    expect(find.text('Réponse : Win + L'), findsOneWidget);
  });
}
