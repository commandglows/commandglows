class TranscriptionDraft {
  const TranscriptionDraft({
    required this.rawText,
    required this.cleanedText,
    required this.language,
    required this.source,
    required this.durationMs,
  });

  final String rawText;
  final String cleanedText;
  final String language;
  final String source;
  final int durationMs;

  bool get isValid =>
      rawText.trim().isNotEmpty &&
      cleanedText.trim().isNotEmpty &&
      durationMs >= 0 &&
      {'free', 'advanced', 'overlay', 'keyboard'}.contains(source);
}
