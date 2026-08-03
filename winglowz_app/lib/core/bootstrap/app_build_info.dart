class AppBuildInfo {
  AppBuildInfo._();

  static const sha = String.fromEnvironment(
    'COMMANDGLOWS_APP_BUILD_SHA',
    defaultValue: 'local',
  );
  static const runId = String.fromEnvironment(
    'COMMANDGLOWS_APP_BUILD_RUN_ID',
    defaultValue: 'local',
  );
  static const refName = String.fromEnvironment(
    'COMMANDGLOWS_APP_BUILD_REF',
    defaultValue: 'local',
  );
  static const buildAtParis = String.fromEnvironment(
    'COMMANDGLOWS_APP_BUILD_AT_PARIS',
    defaultValue: 'unknown',
  );
  static const buildAtUtc = String.fromEnvironment(
    'COMMANDGLOWS_APP_BUILD_AT_UTC',
    defaultValue: 'unknown',
  );

  static String get shortSha {
    if (sha.length <= 7) {
      return sha;
    }
    return sha.substring(0, 7);
  }

  static String get identityValue {
    if (runId != 'local' && runId.isNotEmpty) {
      return runId;
    }
    return shortSha;
  }

  static List<String> get diagnosticHeader => <String>[
    'commit/build: $identityValue',
    'build_at_paris: $buildAtParis',
    'build_at_utc: $buildAtUtc',
  ];

  static String get diagnosticSummary =>
      'sha=$shortSha | run=$runId | ref=$refName | build_at_paris=$buildAtParis | build_at_utc=$buildAtUtc';
}
