export function cleanWhitespace(value) {
  return String(value)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sentenceCase(value, locale = 'en') {
  const cleaned = cleanWhitespace(value);
  if (!cleaned) return '';
  return cleaned.charAt(0).toLocaleUpperCase(locale) + cleaned.slice(1);
}

export function applyTransform(id, value, locale = 'en') {
  switch (id) {
    case 'clean-whitespace':
      return cleanWhitespace(value);
    case 'sentence-case':
      return sentenceCase(value, locale);
    default:
      throw new Error('TRANSFORM_UNSUPPORTED');
  }
}
