class SensitiveRedactor {
  SensitiveRedactor._();

  static const placeholder = '<redacted>';

  static String redact(Object? value) {
    var text = value?.toString() ?? 'none';
    final patterns = [
      RegExp(r'AIza[0-9A-Za-z_-]{20,}'),
      RegExp(r'sb_[0-9A-Za-z_-]{12,}'),
      RegExp(r'eyJ[0-9A-Za-z_.-]{20,}'),
      RegExp(r'sk-[0-9A-Za-z_-]{12,}'),
      RegExp(
        r'(api[_-]?key|anon[_-]?key|publishable[_-]?key|token|secret|password|id[_-]?token)\s*[:=]\s*[^,\s;|]+',
        caseSensitive: false,
      ),
      RegExp(r'Bearer\s+[0-9A-Za-z_.-]{12,}', caseSensitive: false),
    ];
    for (final pattern in patterns) {
      text = text.replaceAll(pattern, placeholder);
    }
    return text.replaceAll('\n', ' | ').replaceAll(RegExp(r'\s+'), ' ').trim();
  }
}
