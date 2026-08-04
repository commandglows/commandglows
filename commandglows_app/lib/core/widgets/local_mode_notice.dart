import 'package:flutter/material.dart';

import '../bootstrap/firebase_bootstrap.dart';
import '../theme/app_theme.dart';

class LocalModeNotice extends StatelessWidget {
  const LocalModeNotice({super.key, required this.surface});

  final String surface;

  @override
  Widget build(BuildContext context) {
    if (FirebaseBootstrap.isConfigured) {
      return const SizedBox.shrink();
    }

    return Card(
      child: ListTile(
        leading: const Icon(Icons.storage_outlined),
        title: Text('$surface local mode'),
        subtitle: const Text(
          'No backend is configured. This page should still render with local session data.',
        ),
      ),
    );
  }
}

class LocalModeNoticeGap extends StatelessWidget {
  const LocalModeNoticeGap({super.key});

  @override
  Widget build(BuildContext context) {
    if (FirebaseBootstrap.isConfigured) {
      return const SizedBox.shrink();
    }
    return AppGaps.x2;
  }
}
