import 'package:supabase_flutter/supabase_flutter.dart';

class DictionaryTermRecord {
  const DictionaryTermRecord({
    required this.id,
    required this.term,
    required this.replacement,
    required this.caseSensitive,
    required this.createdAt,
  });

  final String id;
  final String term;
  final String replacement;
  final bool caseSensitive;
  final DateTime createdAt;

  factory DictionaryTermRecord.fromMap(Map<String, dynamic> row) {
    final createdAtRaw = row['created_at'] as String?;
    return DictionaryTermRecord(
      id: row['id'] as String,
      term: (row['term'] as String?) ?? '',
      replacement: (row['replacement'] as String?) ?? '',
      caseSensitive: (row['case_sensitive'] as bool?) ?? false,
      createdAt: createdAtRaw == null
          ? DateTime.fromMillisecondsSinceEpoch(0)
          : DateTime.tryParse(createdAtRaw)?.toLocal() ??
                DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class DictionaryRepository {
  const DictionaryRepository(this._client);

  final SupabaseClient _client;

  Future<List<DictionaryTermRecord>> list() async {
    final rows = await _client
        .from('dictionary_terms')
        .select()
        .isFilter('deleted_at', null)
        .order('created_at', ascending: false)
        .limit(100);
    return rows
        .map<DictionaryTermRecord>(
          (row) => DictionaryTermRecord.fromMap(Map<String, dynamic>.from(row)),
        )
        .toList(growable: false);
  }

  Future<void> insert({
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) async {
    final normalizedTerm = term.trim();
    final normalizedReplacement = replacement.trim();
    if (normalizedTerm.isEmpty || normalizedReplacement.isEmpty) {
      throw const FormatException(
        'Dictionary term/replacement cannot be empty.',
      );
    }
    await _client.from('dictionary_terms').insert({
      'term': normalizedTerm,
      'replacement': normalizedReplacement,
      'case_sensitive': caseSensitive,
    });
  }

  Future<void> update({
    required String id,
    required String term,
    required String replacement,
    required bool caseSensitive,
  }) async {
    final normalizedTerm = term.trim();
    final normalizedReplacement = replacement.trim();
    if (normalizedTerm.isEmpty || normalizedReplacement.isEmpty) {
      throw const FormatException(
        'Dictionary term/replacement cannot be empty.',
      );
    }
    await _client
        .from('dictionary_terms')
        .update({
          'term': normalizedTerm,
          'replacement': normalizedReplacement,
          'case_sensitive': caseSensitive,
        })
        .eq('id', id);
  }

  Future<void> softDelete(String id) async {
    await _client
        .from('dictionary_terms')
        .update({'deleted_at': DateTime.now().toUtc().toIso8601String()})
        .eq('id', id);
  }
}
