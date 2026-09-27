import 'package:uuid/uuid.dart';

import '../../../core/storage/local_json_persistence.dart';
import '../domain/shortcut_entry.dart';

abstract interface class ShortcutRepository {
  Future<List<ShortcutEntry>> list();
  Future<void> save({
    String? id,
    required String appName,
    required String description,
    required ShortcutChord chord,
  });
  Future<void> delete(String id);
  Future<void> upsertSource({
    required String sourceId,
    required String appName,
    required String description,
    required ShortcutChord chord,
    bool selfAssessmentOnly = false,
  });
  Future<void> reconcileSources({
    required String prefix,
    required Map<String, ShortcutSourceDraft> current,
  });
}

class ShortcutSourceDraft {
  const ShortcutSourceDraft({
    required this.appName,
    required this.description,
    required this.chord,
    this.selfAssessmentOnly = false,
  });

  final String appName;
  final String description;
  final ShortcutChord chord;
  final bool selfAssessmentOnly;
}

class LocalShortcutRepository implements ShortcutRepository {
  LocalShortcutRepository({
    LocalJsonPersistence persistence = const LocalJsonPersistence(
      'shortcut_learning_v1',
    ),
    DateTime Function()? clock,
  }) : _persistence = persistence,
       _clock = clock ?? DateTime.now;

  final LocalJsonPersistence _persistence;
  final DateTime Function() _clock;

  @override
  Future<List<ShortcutEntry>> list() async {
    final rows = await _persistence.read();
    final entries = <ShortcutEntry>[];
    for (final row in rows) {
      try {
        entries.add(ShortcutEntry.fromJson(row));
      } on FormatException {
        // Keep valid saved entries available if a row is damaged.
      } on TypeError {
        // Keep valid saved entries available if a row is damaged.
      }
    }
    entries.sort((a, b) {
      final app = a.appName.toLowerCase().compareTo(b.appName.toLowerCase());
      return app != 0
          ? app
          : a.description.toLowerCase().compareTo(b.description.toLowerCase());
    });
    return entries;
  }

  @override
  Future<void> save({
    String? id,
    required String appName,
    required String description,
    required ShortcutChord chord,
  }) async {
    final app = appName.trim();
    final text = description.trim();
    if (app.isEmpty || text.isEmpty || chord.keyLabel.trim().isEmpty) {
      throw const FormatException('Application, action et raccourci requis.');
    }
    final entries = await list();
    final index = id == null ? -1 : entries.indexWhere((item) => item.id == id);
    if (id != null && index < 0) throw StateError('Raccourci introuvable.');
    final previous = index < 0 ? null : entries[index];
    final now = _clock().toUtc();
    final entry = ShortcutEntry(
      id: previous?.id ?? 'local-${const Uuid().v4()}',
      appName: app,
      description: text,
      chord: chord,
      createdAt: previous?.createdAt ?? now,
      // Explicit editing turns an imported suggestion into a personal entry.
      sourceId: null,
      selfAssessmentOnly:
          previous != null &&
          previous.selfAssessmentOnly &&
          previous.chord.matches(chord) &&
          previous.chord.keyLabel == chord.keyLabel,
    );
    if (index < 0) {
      entries.add(entry);
    } else {
      entries[index] = entry;
    }
    await _persistence.write(entries.map((item) => item.toJson()).toList());
  }

  @override
  Future<void> upsertSource({
    required String sourceId,
    required String appName,
    required String description,
    required ShortcutChord chord,
    bool selfAssessmentOnly = false,
  }) async {
    final source = sourceId.trim();
    final app = appName.trim();
    final text = description.trim();
    if (source.isEmpty ||
        app.isEmpty ||
        text.isEmpty ||
        chord.keyLabel.trim().isEmpty) {
      throw const FormatException(
        'Source, application, action et raccourci requis.',
      );
    }
    final entries = await list();
    final index = entries.indexWhere((item) => item.sourceId == source);
    final previous = index < 0 ? null : entries[index];
    final entry = ShortcutEntry(
      id: previous?.id ?? 'local-${const Uuid().v4()}',
      sourceId: source,
      appName: app,
      description: text,
      chord: chord,
      createdAt: previous?.createdAt ?? _clock().toUtc(),
      selfAssessmentOnly: selfAssessmentOnly,
    );
    if (index < 0) {
      entries.add(entry);
    } else {
      entries[index] = entry;
    }
    await _persistence.write(entries.map((item) => item.toJson()).toList());
  }

  @override
  Future<void> reconcileSources({
    required String prefix,
    required Map<String, ShortcutSourceDraft> current,
  }) async {
    if (prefix.isEmpty || current.keys.any((id) => !id.startsWith(prefix))) {
      throw const FormatException('Préfixe de source invalide.');
    }
    final entries = await list();
    var changed = false;
    final reconciled = <ShortcutEntry>[];
    for (final entry in entries) {
      final sourceId = entry.sourceId;
      if (sourceId == null || !sourceId.startsWith(prefix)) {
        reconciled.add(entry);
        continue;
      }
      final draft = current[sourceId];
      if (draft == null) {
        changed = true;
        continue;
      }
      if (entry.appName == draft.appName &&
          entry.description == draft.description &&
          entry.chord.matches(draft.chord) &&
          entry.chord.keyLabel == draft.chord.keyLabel &&
          entry.selfAssessmentOnly == draft.selfAssessmentOnly) {
        reconciled.add(entry);
        continue;
      }
      changed = true;
      reconciled.add(
        ShortcutEntry(
          id: entry.id,
          sourceId: sourceId,
          appName: draft.appName,
          description: draft.description,
          chord: draft.chord,
          createdAt: entry.createdAt,
          selfAssessmentOnly: draft.selfAssessmentOnly,
        ),
      );
    }
    if (changed) {
      await _persistence.write(
        reconciled.map((item) => item.toJson()).toList(),
      );
    }
  }

  @override
  Future<void> delete(String id) async {
    final entries = await list();
    entries.removeWhere((item) => item.id == id);
    await _persistence.write(entries.map((item) => item.toJson()).toList());
  }
}
