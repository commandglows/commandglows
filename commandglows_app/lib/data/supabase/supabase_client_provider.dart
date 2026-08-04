import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/bootstrap/supabase_bootstrap.dart';

final supabaseClientProvider = Provider<SupabaseClient?>((ref) {
  if (!SupabaseBootstrap.isConfigured) {
    return null;
  }
  return Supabase.instance.client;
});

final authStateProvider = StreamProvider<AuthState>((ref) {
  final client = ref.watch(supabaseClientProvider);
  if (client == null) {
    return const Stream<AuthState>.empty();
  }
  return client.auth.onAuthStateChange;
});
