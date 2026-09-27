import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:crypto/crypto.dart';

import '../../../core/storage/local_json_persistence.dart';
import '../../auth/application/auth_session_provider.dart';
import '../../auth/domain/auth_session_store.dart';
import '../data/local_shortcut_repository.dart';

String? shortcutStorageKeyForSession(AuthSessionSnapshot? session) {
  final userId = session?.user?.id.trim();
  if (userId == null || userId.isEmpty) return null;
  if (session!.isLocalFallback) return 'shortcut_learning_local_v1';
  final identityHash = sha256.convert(utf8.encode(userId)).toString();
  return 'shortcut_learning_user_${identityHash}_v1';
}

final shortcutRepositoryProvider = Provider<ShortcutRepository>((ref) {
  final session = ref
      .watch(authSessionProvider)
      .maybeWhen(data: (value) => value, orElse: () => null);
  final key = shortcutStorageKeyForSession(session);
  if (key == null) throw StateError('Session utilisateur requise.');
  return LocalShortcutRepository(persistence: LocalJsonPersistence(key));
});
