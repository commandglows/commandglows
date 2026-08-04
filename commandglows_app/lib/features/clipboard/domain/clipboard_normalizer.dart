import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'clipboard_capture_event.dart';

String normalizeClipboardText(String raw) {
  final unixNewlines = raw.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  final collapsedSpaces = unixNewlines.replaceAll(RegExp(r'[ \t]+'), ' ');
  final collapsedLines = collapsedSpaces.replaceAll(RegExp(r'\n{3,}'), '\n\n');
  return collapsedLines.trim();
}

String sha256Hex(String value) {
  return sha256.convert(utf8.encode(value)).toString();
}

ClipboardSensitiveClassification classifySensitiveContent(String raw) {
  final input = raw.trim();
  if (input.isEmpty) {
    return ClipboardSensitiveClassification.none;
  }

  if (_privateKeyPattern.hasMatch(input)) {
    return ClipboardSensitiveClassification.privateKey;
  }
  if (_apiKeyPattern.hasMatch(input)) {
    return ClipboardSensitiveClassification.apiKey;
  }
  if (_passwordPattern.hasMatch(input)) {
    return ClipboardSensitiveClassification.password;
  }
  if (_recoveryPhrasePattern.hasMatch(input)) {
    return ClipboardSensitiveClassification.recoveryPhrase;
  }
  if (_tokenPattern.hasMatch(input)) {
    return ClipboardSensitiveClassification.token;
  }
  if (_otpPattern.hasMatch(input)) {
    return ClipboardSensitiveClassification.otp;
  }
  if (_looksLikeCreditCard(input)) {
    return ClipboardSensitiveClassification.creditCard;
  }

  return ClipboardSensitiveClassification.none;
}

bool isLikelySensitiveClipboardContent(String raw) {
  return classifySensitiveContent(raw) != ClipboardSensitiveClassification.none;
}

bool isWithinAutomaticDedupeWindow({
  required DateTime existingCapturedAtUtc,
  required DateTime incomingCapturedAtUtc,
  Duration window = kClipboardAutomaticDedupeWindow,
}) {
  final existing = existingCapturedAtUtc.toUtc();
  final incoming = incomingCapturedAtUtc.toUtc();
  if (existing.isAfter(incoming)) {
    return false;
  }
  return !existing.isBefore(incoming.subtract(window));
}

String buildAutomaticDedupeKey({
  required String userId,
  required String deviceId,
  required ClipboardCanonicalSource source,
  required String normalizedHash,
}) {
  return ClipboardDedupeFingerprint(
    userId: userId,
    deviceId: deviceId,
    source: source,
    normalizedHash: normalizedHash,
  ).key;
}

void requireSensitiveClipboardConfirmation({
  required String content,
  required bool confirmed,
}) {
  final classification = classifySensitiveContent(content);
  if (classification != ClipboardSensitiveClassification.none && !confirmed) {
    throw ClipboardSensitiveConfirmationRequiredException(classification);
  }
}

final RegExp _privateKeyPattern = RegExp(
  r'-----BEGIN [A-Z ]*PRIVATE KEY-----',
  caseSensitive: false,
);
final RegExp _apiKeyPattern = RegExp(
  r'\b(sk-[a-zA-Z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z\-_]{30,})\b',
);
final RegExp _passwordPattern = RegExp(
  r'\b(pass(word)?|pwd|secret)\b\s*[:=]\s*\S{4,}',
  caseSensitive: false,
);
final RegExp _recoveryPhrasePattern = RegExp(
  r'\b(seed phrase|recovery phrase|mnemonic)\b',
  caseSensitive: false,
);
final RegExp _tokenPattern = RegExp(
  r'\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b',
);
final RegExp _otpPattern = RegExp(
  r'\b(otp|verification code|auth code)\b[^0-9]{0,12}([0-9]{4,8})\b',
  caseSensitive: false,
);
final RegExp _creditCardDigitsPattern = RegExp(r'^[0-9]{13,19}$');

bool _looksLikeCreditCard(String input) {
  final digitsOnly = input.replaceAll(RegExp(r'[^0-9]'), '');
  if (!_creditCardDigitsPattern.hasMatch(digitsOnly)) {
    return false;
  }

  var sum = 0;
  var shouldDouble = false;
  for (var i = digitsOnly.length - 1; i >= 0; i--) {
    var digit = int.parse(digitsOnly[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 == 0;
}
