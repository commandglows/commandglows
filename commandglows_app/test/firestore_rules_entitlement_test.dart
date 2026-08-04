import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Firestore rules require the server-owned suite access mirror', () {
    final rules = File('firestore.rules').readAsStringSync();

    expect(rules, contains('function hasCommandGlowsAppAccess(userId)'));
    expect(rules, contains(r'/documents/suiteAccess/$(userId)'));
    expect(rules, contains('products.commandglows_app.active == true'));
    expect(rules, contains('match /suiteAccess/{uid}'));
    expect(rules, contains('allow read, write: if false;'));
  });

  test('keyboard config rules are entitlement-gated and schema-hardened', () {
    final rules = File('firestore.rules').readAsStringSync();

    expect(rules, contains('match /keyboardConfigs/{configId}'));
    expect(rules, contains('isDefaultKeyboardConfig(configId)'));
    expect(rules, contains('configId == \'default\''));
    expect(rules, contains('hasCommandGlowsAppAccess(uid)'));
    expect(rules, contains('hasValidKeyboardConfig(request.resource.data)'));
    expect(rules, contains('payload.keys().hasOnly(['));
    expect(rules, contains('payload.keys().hasAll(['));
    expect(rules, contains('payload.schemaVersion == 1'));
    expect(
      rules,
      contains('payload.sanitizationPolicy == \'keyboard_sync_v1\''),
    );
    expect(rules, contains('payload.schemaVersion == 2'));
    expect(
      rules,
      contains('payload.sanitizationPolicy == \'keyboard_sync_v2\''),
    );
    expect(rules, contains('hasSafeKeyboardThemeAsset(payload)'));
    expect(rules, contains('match /keyboardThemeAssets/{assetId}'));
    expect(rules, contains('payload.profileRevision is int'));
    expect(rules, contains('payload.baseCloudRevision is int'));
    expect(rules, contains('!payload.payload.keys().hasAny(['));
    expect(rules, contains('allow delete: if false;'));
    expect(
      rules,
      isNot(contains('match /suiteAccess/{uid} { allow read: if true')),
    );
  });
}
