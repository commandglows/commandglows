import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bootstrap/firebase_bootstrap.dart';
import '../theme/app_theme.dart';
import '../../features/auth/application/auth_session_provider.dart';

class LocalModeNotice extends ConsumerWidget {
  const LocalModeNotice({super.key, required this.surface});

  final String surface;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (FirebaseBootstrap.isConfigured && !ref.watch(localAuthModeProvider)) {
      return const SizedBox.shrink();
    }

    return Card(
      child: ListTile(
        leading: const Icon(Icons.storage_outlined),
        title: Text('$surface · mode local'),
        subtitle: const Text(
          'Tes données restent sur cet appareil. Connecte un compte depuis les paramètres pour voir les options de synchronisation.',
        ),
      ),
    );
  }
}

class LocalModeNoticeGap extends ConsumerWidget {
  const LocalModeNoticeGap({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (FirebaseBootstrap.isConfigured && !ref.watch(localAuthModeProvider)) {
      return const SizedBox.shrink();
    }
    return AppGaps.x2;
  }
}
