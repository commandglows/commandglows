import 'package:supabase_flutter/supabase_flutter.dart';

class SnippetRecord {
  const SnippetRecord({
    required this.id,
    required this.trigger,
    required this.content,
    required this.label,
    required this.createdAt,
  });

  final String id;
  final String trigger;
  final String content;
  final String? label;
  final DateTime createdAt;

  factory SnippetRecord.fromMap(Map<String, dynamic> row) {
    final createdAtRaw = row['created_at'] as String?;
    return SnippetRecord(
      id: row['id'] as String,
      trigger: (row['trigger'] as String?) ?? '',
      content: (row['content'] as String?) ?? '',
      label: row['label'] as String?,
      createdAt: createdAtRaw == null
          ? DateTime.fromMillisecondsSinceEpoch(0)
          : DateTime.tryParse(createdAtRaw)?.toLocal() ??
                DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class SnippetRepository {
  const SnippetRepository(this._client);

  final SupabaseClient _client;

  Future<List<SnippetRecord>> list() async {
    final rows = await _client
        .from('snippets')
        .select()
        .isFilter('deleted_at', null)
        .order('created_at', ascending: false)
        .limit(100);
    return rows
        .map<SnippetRecord>(
          (row) => SnippetRecord.fromMap(Map<String, dynamic>.from(row)),
        )
        .toList(growable: false);
  }

  Future<void> insert({
    required String trigger,
    required String content,
    String? label,
  }) async {
    final normalizedTrigger = trigger.trim();
    final normalizedContent = content.trim();
    if (normalizedTrigger.isEmpty || normalizedContent.isEmpty) {
      throw const FormatException('Snippet trigger/content cannot be empty.');
    }

    await _client.from('snippets').insert({
      'trigger': normalizedTrigger,
      'content': normalizedContent,
      'label': label?.trim().isEmpty ?? true ? null : label!.trim(),
    });
  }

  Future<void> update({
    required String id,
    required String trigger,
    required String content,
    String? label,
  }) async {
    final normalizedTrigger = trigger.trim();
    final normalizedContent = content.trim();
    if (normalizedTrigger.isEmpty || normalizedContent.isEmpty) {
      throw const FormatException('Snippet trigger/content cannot be empty.');
    }
    await _client
        .from('snippets')
        .update({
          'trigger': normalizedTrigger,
          'content': normalizedContent,
          'label': label?.trim().isEmpty ?? true ? null : label!.trim(),
        })
        .eq('id', id);
  }

  Future<void> softDelete(String id) async {
    await _client
        .from('snippets')
        .update({'deleted_at': DateTime.now().toUtc().toIso8601String()})
        .eq('id', id);
  }
}
