enum UserRetentionPolicy {
  oneHour('1h'),
  twelveHours('12h'),
  oneDay('24h'),
  threeDays('3d'),
  sevenDays('7d');

  const UserRetentionPolicy(this.value);

  final String value;

  static UserRetentionPolicy fromValue(String value) {
    return UserRetentionPolicy.values.firstWhere(
      (policy) => policy.value == value,
      orElse: () => UserRetentionPolicy.sevenDays,
    );
  }
}
