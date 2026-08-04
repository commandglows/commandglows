const int kClipboardMaxContentLength = 50000;
const Duration kClipboardAutomaticDedupeWindow = Duration(minutes: 10);

enum ClipboardSyncState {
  local('local'),
  pending('pending'),
  synced('synced'),
  error('error'),
  deleted('deleted');

  const ClipboardSyncState(this.databaseValue);

  final String databaseValue;

  static ClipboardSyncState fromDatabase(String? value) {
    if (value == 'local_only') {
      return ClipboardSyncState.local;
    }
    return ClipboardSyncState.values.firstWhere(
      (state) => state.databaseValue == value,
      orElse: () => ClipboardSyncState.synced,
    );
  }
}

enum ClipboardSensitiveClassification {
  none,
  password,
  recoveryPhrase,
  token,
  creditCard,
  otp,
  privateKey,
  apiKey;

  String get label {
    switch (this) {
      case ClipboardSensitiveClassification.none:
        return 'none';
      case ClipboardSensitiveClassification.password:
        return 'password';
      case ClipboardSensitiveClassification.recoveryPhrase:
        return 'recovery phrase';
      case ClipboardSensitiveClassification.token:
        return 'token';
      case ClipboardSensitiveClassification.creditCard:
        return 'credit card';
      case ClipboardSensitiveClassification.otp:
        return 'one-time code';
      case ClipboardSensitiveClassification.privateKey:
        return 'private key';
      case ClipboardSensitiveClassification.apiKey:
        return 'API key';
    }
  }
}

enum ClipboardCanonicalSource {
  manual('manual', 'app', 'manual', false),
  voice('voice', 'app', 'voice', false),
  overlay('overlay', 'overlay', 'overlay_voice', true),
  system('system', 'system', 'system_clipboard', true),
  keyboard('keyboard', 'keyboard', 'keyboard_clipboard', true),
  keyboardVoice('keyboard_voice', 'keyboard', 'keyboard_voice', true),
  keyboardClipboard(
    'keyboard_clipboard',
    'keyboard',
    'keyboard_clipboard',
    true,
  );

  const ClipboardCanonicalSource(
    this.databaseValue,
    this.originSurface,
    this.captureMethod,
    this.automatic,
  );

  final String databaseValue;
  final String originSurface;
  final String captureMethod;
  final bool automatic;

  String get label {
    switch (this) {
      case ClipboardCanonicalSource.manual:
        return 'manual';
      case ClipboardCanonicalSource.voice:
        return 'voice';
      case ClipboardCanonicalSource.overlay:
        return 'overlay';
      case ClipboardCanonicalSource.system:
        return 'system clipboard';
      case ClipboardCanonicalSource.keyboard:
        return 'keyboard';
      case ClipboardCanonicalSource.keyboardVoice:
        return 'keyboard voice';
      case ClipboardCanonicalSource.keyboardClipboard:
        return 'keyboard clipboard';
    }
  }

  static ClipboardCanonicalSource fromDatabase(String? value) {
    switch (value?.trim()) {
      case 'manual':
        return ClipboardCanonicalSource.manual;
      case 'voice':
      case 'overlay_dictation':
        return ClipboardCanonicalSource.voice;
      case 'overlay':
      case 'overlay_clipboard':
        return ClipboardCanonicalSource.overlay;
      case 'system':
      case 'system_foreground':
        return ClipboardCanonicalSource.system;
      case 'keyboard':
        return ClipboardCanonicalSource.keyboard;
      case 'keyboard_voice':
        return ClipboardCanonicalSource.keyboardVoice;
      case 'keyboard_clipboard':
      case 'ime':
        return ClipboardCanonicalSource.keyboardClipboard;
      default:
        return ClipboardCanonicalSource.manual;
    }
  }
}

class ClipboardDedupeFingerprint {
  const ClipboardDedupeFingerprint({
    required this.userId,
    required this.deviceId,
    required this.source,
    required this.normalizedHash,
  });

  final String userId;
  final String deviceId;
  final ClipboardCanonicalSource source;
  final String normalizedHash;

  String get key =>
      '${userId.trim()}|${deviceId.trim()}|${source.databaseValue}|$normalizedHash';
}

class ClipboardSensitiveConfirmationRequiredException implements Exception {
  const ClipboardSensitiveConfirmationRequiredException(this.classification);

  final ClipboardSensitiveClassification classification;

  @override
  String toString() {
    return 'ClipboardSensitiveConfirmationRequiredException: ${classification.label} requires user confirmation.';
  }
}
