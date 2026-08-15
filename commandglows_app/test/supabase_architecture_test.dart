import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Supabase SDK imports stay inside the legacy adapter boundary', () {
    final violations = _dartFilesUnder('lib')
        .where((file) => file.readAsStringSync().contains('supabase_flutter'))
        .map((file) => _normalizedPath(file.path))
        .where(
          (path) =>
              !path.startsWith('lib/data/supabase/') &&
              path != 'lib/core/bootstrap/supabase_bootstrap.dart',
        )
        .toList(growable: false);

    expect(violations, isEmpty);
  });

  test('feature layers do not import the legacy Supabase adapter', () {
    final violations = _dartFilesUnder('lib/features')
        .where((file) {
          final source = file.readAsStringSync();
          return source.contains('/data/supabase/') ||
              source.contains('package:commandglows_app/data/supabase/');
        })
        .map((file) => _normalizedPath(file.path))
        .toList(growable: false);

    expect(violations, isEmpty);
  });

  test('Supabase client types are not exposed outside the boundary', () {
    final violations = _dartFilesUnder('lib')
        .where((file) {
          final path = _normalizedPath(file.path);
          if (path.startsWith('lib/data/supabase/') ||
              path == 'lib/core/bootstrap/supabase_bootstrap.dart') {
            return false;
          }
          final source = file.readAsStringSync();
          return source.contains('SupabaseClient');
        })
        .map((file) => _normalizedPath(file.path))
        .toList(growable: false);

    expect(violations, isEmpty);
  });
}

Iterable<File> _dartFilesUnder(String path) {
  return Directory(path)
      .listSync(recursive: true, followLinks: false)
      .whereType<File>()
      .where((file) => file.path.endsWith('.dart'));
}

String _normalizedPath(String path) => path.replaceAll('\\', '/');
