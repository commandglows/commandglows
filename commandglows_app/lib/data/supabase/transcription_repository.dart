import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/voice/domain/transcription_draft.dart';

class TranscriptionItem {
  const TranscriptionItem({
    required this.id,
    required this.rawText,
    required this.cleanedText,
    required this.language,
    required this.source,
    required this.durationMs,
    required this.createdAt,
  });

  final String id;
  final String rawText;
  final String cleanedText;
  final String language;
  final String source;
  final int durationMs;
  final DateTime createdAt;

  factory TranscriptionItem.fromMap(Map<String, dynamic> row) {
    final createdAtRaw = row['created_at'] as String?;
    return TranscriptionItem(
      id: row['id'] as String,
      rawText: (row['raw_text'] as String?) ?? '',
      cleanedText: (row['cleaned_text'] as String?) ?? '',
      language: (row['language'] as String?) ?? 'unknown',
      source: (row['source'] as String?) ?? 'free',
      durationMs: (row['duration_ms'] as num?)?.toInt() ?? 0,
      createdAt: createdAtRaw == null
          ? DateTime.fromMillisecondsSinceEpoch(0)
          : DateTime.tryParse(createdAtRaw)?.toLocal() ??
                DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class TranscriptionRepository {
  const TranscriptionRepository(this._client);

  final SupabaseClient _client;

  Future<List<TranscriptionItem>> list() async {
    final rows = await _client
        .from('transcriptions')
        .select()
        .order('created_at', ascending: false)
        .limit(100);
    return rows
        .map<TranscriptionItem>(
          (row) => TranscriptionItem.fromMap(Map<String, dynamic>.from(row)),
        )
        .toList(growable: false);
  }

  Future<void> insert(TranscriptionDraft draft) async {
    if (!draft.isValid) {
      throw const FormatException('Invalid transcription payload.');
    }

    await _client.from('transcriptions').insert({
      'raw_text': draft.rawText.trim(),
      'cleaned_text': draft.cleanedText.trim(),
      'language': draft.language.trim(),
      'duration_ms': draft.durationMs,
      'source': draft.source,
    });
  }

  Future<void> updateCleanedText({
    required String id,
    required String cleanedText,
  }) async {
    final value = cleanedText.trim();
    if (value.isEmpty) {
      throw const FormatException('cleaned_text cannot be empty.');
    }
    await _client
        .from('transcriptions')
        .update({'cleaned_text': value})
        .eq('id', id);
  }

  Future<void> delete(String id) async {
    await _client.from('transcriptions').delete().eq('id', id);
  }
}
