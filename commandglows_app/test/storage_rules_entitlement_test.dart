import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Storage rules require owner-scoped suite access for theme assets', () {
    final rules = File(
      'storage.rules',
    ).readAsStringSync().replaceAll('\r\n', '\n');

    expect(rules, contains("service firebase.storage"));
    expect(rules, contains("match /users/{uid}/keyboard_theme_assets/{assetId}"));
    expect(rules, contains("request.auth.uid == userId"));
    expect(
      rules,
      contains(
        r"firestore.get(" "\n            " r"/databases/(default)/documents/suiteAccess/$(userId)",
      ),
    );
    expect(rules, contains("products.commandglows_app.active == true"));
    expect(rules, contains("request.resource.size <= 8 * 1024 * 1024"));
    expect(rules, contains("request.resource.contentType.matches('image/.*')"));
    expect(rules, contains('allow delete: if false;'));
  });

  test('firebase.json exposes storage rules and emulator configuration', () {
    final config = File('firebase.json').readAsStringSync();

    expect(config, contains('"storage"'));
    expect(config, contains('"rules": "storage.rules"'));
    expect(config, contains('"port": 9199'));
  });
}
