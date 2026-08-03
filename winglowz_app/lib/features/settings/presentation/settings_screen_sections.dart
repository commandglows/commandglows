part of "settings_screen.dart";

const _mediaStepPercentOptions = <int>[1, 2, 3, 4, 5, 10, 15, 20];

int _mediaStepPercentForSliderValue(double value) {
  final index = value.round().clamp(0, _mediaStepPercentOptions.length - 1);
  return _mediaStepPercentOptions[index];
}

double _mediaStepSliderValue(int percent) {
  final index = _mediaStepPercentOptions.indexOf(percent);
  if (index >= 0) {
    return index.toDouble();
  }
  var nearestIndex = 0;
  var nearestDistance = (percent - _mediaStepPercentOptions.first).abs();
  for (var i = 1; i < _mediaStepPercentOptions.length; i += 1) {
    final distance = (percent - _mediaStepPercentOptions[i]).abs();
    if (distance < nearestDistance) {
      nearestIndex = i;
      nearestDistance = distance;
    }
  }
  return nearestIndex.toDouble();
}

class _AccountCloudSection extends StatelessWidget {
  const _AccountCloudSection({
    required this.authAsync,
    required this.cloudSyncOverview,
    required this.postAuthMessage,
    required this.remoteAuthConfigured,
    required this.onConnectCloudAccount,
    required this.onSignOut,
  });

  final AsyncValue<AuthSessionSnapshot> authAsync;
  final CloudSyncOverview cloudSyncOverview;
  final String? postAuthMessage;
  final bool remoteAuthConfigured;
  final VoidCallback onConnectCloudAccount;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    const syncRelevantCategories = <CloudSyncCategory>{
      CloudSyncCategory.settings,
      CloudSyncCategory.clipboard,
      CloudSyncCategory.snippets,
      CloudSyncCategory.dictionary,
      CloudSyncCategory.transcriptions,
      CloudSyncCategory.keyboardProfile,
    };

    final syncRelevantStatuses = cloudSyncOverview.categories
        .where((status) => syncRelevantCategories.contains(status.category))
        .toList(growable: false);

    final primarySyncCategories = syncRelevantStatuses
        .where((status) => status.isRemoteVisible)
        .toList(growable: false);
    final attentionCategories = syncRelevantStatuses
        .where((status) => status.requiresAttention)
        .toList(growable: false);
    final localCategories = syncRelevantStatuses
        .where((status) => !status.isRemoteVisible && !status.requiresAttention)
        .toList(growable: false);

    final localOnlyCategories = cloudSyncOverview.categories
        .where((status) => status.category == CloudSyncCategory.localKeys)
        .toList(growable: false);
    final compactLocalCategories = [...localCategories, ...localOnlyCategories];
    final visibleSyncCards = [...primarySyncCategories, ...attentionCategories];

    final requiresAttention = cloudSyncOverview.categories
        .where((status) => status.requiresAttention)
        .map((status) => status.title)
        .join(', ');
    final accountStatus = cloudSyncOverview.categories.firstWhere(
      (status) => status.category == CloudSyncCategory.account,
    );
    final suiteStatus = cloudSyncOverview.categories.firstWhere(
      (status) => status.category == CloudSyncCategory.suiteAccess,
    );

    final isRemoteSignedIn = authAsync.maybeWhen(
      data: (session) => session.isSignedIn && !session.isLocalFallback,
      orElse: () => false,
    );

    return AppSectionCard(
      leading: const Icon(Icons.cloud_sync_outlined),
      stretch: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _AccountAccessCard(
            title: 'Mon compte',
            subtitle: remoteAuthConfigured
                ? 'Compte, accès et synchronisation cloud.'
                : 'L’authentification distante n’est pas configurée sur cette version.',
            accountStatus: accountStatus,
            suiteStatus: suiteStatus,
            authAsync: authAsync,
            remoteAuthConfigured: remoteAuthConfigured,
            isRemoteSignedIn: isRemoteSignedIn,
            onConnectCloudAccount: onConnectCloudAccount,
            onSignOut: onSignOut,
          ),
          if (postAuthMessage != null) ...[
            AppGaps.x3,
            AppBannerCard(
              key: const Key('settings-cloud-post-auth-feedback'),
              icon: Icons.verified_user_outlined,
              title: 'Retour de connexion',
              message: postAuthMessage!,
            ),
          ],
          if (requiresAttention.isNotEmpty) ...[
            AppGaps.x3,
            AppBannerCard(
              key: const Key('settings-cloud-attention-required'),
              icon: Icons.warning_amber_outlined,
              title: 'Action requise',
              message:
                  'Synchronisation en attente d’attention: $requiresAttention',
              accentColor: Theme.of(context).colorScheme.error,
            ),
          ],
          AppGaps.x3,
          const Text(
            'Ce qui est synchronisé',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          AppGaps.x2,
          if (visibleSyncCards.isEmpty)
            const _SyncEmptyState()
          else
            ...visibleSyncCards.map(
              (status) => AppStatusCard(
                icon: status.icon,
                title: status.title,
                subtitle: '${status.stateLabel} · ${status.detail}',
              ),
            ),
          AppGaps.x3,
          const Text(
            'Ce qui reste local',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          AppGaps.x2,
          _CompactSyncStatusWrap(statuses: compactLocalCategories),
          AppGaps.x3,
          const Text(
            'Profil clavier Android',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          AppGaps.x2,
          const KeyboardSyncPanel(),
        ],
      ),
    );
  }
}

class _SyncEmptyState extends StatelessWidget {
  const _SyncEmptyState();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Text(
      'Aucune synchronisation active.',
      style: Theme.of(
        context,
      ).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
    );
  }
}

class _CompactSyncStatusWrap extends StatelessWidget {
  const _CompactSyncStatusWrap({required this.statuses});

  final List<CloudSyncCategoryStatus> statuses;

  @override
  Widget build(BuildContext context) {
    if (statuses.isEmpty) {
      return const SizedBox.shrink();
    }

    return Wrap(
      spacing: AppSpacing.x2,
      runSpacing: AppSpacing.x2,
      children: statuses
          .map(_CompactSyncStatusPill.new)
          .toList(growable: false),
    );
  }
}

class _CompactSyncStatusPill extends StatelessWidget {
  const _CompactSyncStatusPill(this.status);

  final CloudSyncCategoryStatus status;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final foregroundColor = status.isUnavailable
        ? colorScheme.onSurfaceVariant
        : colorScheme.onSurface;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
        border: Border.all(color: colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(AppRadii.pill),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x2,
          vertical: AppSpacing.x1,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(status.icon, size: AppIconMetrics.sm, color: foregroundColor),
            AppGaps.horizontalX2,
            Text(
              '${_compactSyncCategoryLabel(status.category)} · '
              '${status.stateLabel}',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: foregroundColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _compactSyncCategoryLabel(CloudSyncCategory category) =>
    switch (category) {
      CloudSyncCategory.settings => 'Apparence',
      CloudSyncCategory.clipboard => 'Papiers',
      CloudSyncCategory.snippets => 'Snippets',
      CloudSyncCategory.dictionary => 'Dico',
      CloudSyncCategory.transcriptions => 'Voix',
      CloudSyncCategory.keyboardProfile => 'Clavier',
      CloudSyncCategory.localKeys => 'Clés IA',
      CloudSyncCategory.account => 'Compte',
      CloudSyncCategory.suiteAccess => 'Accès',
    };

class _AccountAccessCard extends StatelessWidget {
  const _AccountAccessCard({
    required this.title,
    required this.subtitle,
    required this.accountStatus,
    required this.suiteStatus,
    required this.authAsync,
    required this.remoteAuthConfigured,
    required this.isRemoteSignedIn,
    required this.onConnectCloudAccount,
    required this.onSignOut,
  });

  final String title;
  final String subtitle;
  final CloudSyncCategoryStatus accountStatus;
  final CloudSyncCategoryStatus suiteStatus;
  final AsyncValue<AuthSessionSnapshot> authAsync;
  final bool remoteAuthConfigured;
  final bool isRemoteSignedIn;
  final VoidCallback onConnectCloudAccount;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final accentColor = suiteStatus.requiresAttention
        ? colorScheme.error
        : colorScheme.primary;
    final icon = suiteStatus.requiresAttention
        ? suiteStatus.icon
        : accountStatus.icon;
    final stateLabel = _stateLabel;
    final detail = _detail;
    final statusTrailing = authAsync.when<Widget?>(
      loading: () => const SizedBox.square(
        dimension: AppIconMetrics.sm,
        child: CircularProgressIndicator(
          strokeWidth: AppIconMetrics.progressStroke,
        ),
      ),
      error: (error, _) => IconButton(
        tooltip: 'Erreur de compte cloud',
        onPressed: null,
        icon: const Icon(Icons.error_outline),
      ),
      data: (_) => null,
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
        border: Border.all(color: colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      child: Padding(
        padding: AppInsets.compactCard,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: accentColor),
            AppGaps.horizontalX3,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleSmall),
                  AppGaps.x1,
                  Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                  AppGaps.x1,
                  Text(
                    '$stateLabel · $detail',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  AppGaps.x2,
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (!isRemoteSignedIn)
                        FilledButton.icon(
                          key: const Key('settings-connect-cloud-account'),
                          onPressed: remoteAuthConfigured
                              ? onConnectCloudAccount
                              : null,
                          icon: const Icon(Icons.login_outlined),
                          label: const Text('Connecter le compte'),
                        )
                      else
                        OutlinedButton.icon(
                          onPressed: onSignOut,
                          icon: const Icon(Icons.logout_outlined),
                          label: const Text('Se déconnecter'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            if (statusTrailing != null) ...[
              AppGaps.horizontalX2,
              statusTrailing,
            ],
          ],
        ),
      ),
    );
  }

  String get _stateLabel {
    if (!remoteAuthConfigured) {
      return accountStatus.stateLabel;
    }
    if (!isRemoteSignedIn) {
      return 'Mode local';
    }
    if (suiteStatus.state == CloudSyncCategoryState.synced) {
      return 'Compte connecté · Accès actif';
    }
    if (suiteStatus.state == CloudSyncCategoryState.checking) {
      return 'Compte connecté · Accès en vérification';
    }
    if (suiteStatus.requiresAttention) {
      return 'Compte connecté · ${suiteStatus.stateLabel}';
    }
    return 'Compte connecté · Accès inactif';
  }

  String get _detail {
    if (!remoteAuthConfigured) {
      return accountStatus.detail;
    }
    if (!isRemoteSignedIn) {
      return 'Connecte ton compte pour activer la synchronisation de données.';
    }
    if (suiteStatus.state == CloudSyncCategoryState.synced) {
      return 'Les données compatibles peuvent être synchronisées.';
    }
    return suiteStatus.detail;
  }
}

class _AppearanceSection extends StatelessWidget {
  const _AppearanceSection({
    required this.themeMode,
    required this.confirmDestructiveActions,
    required this.syncStateLabel,
    required this.syncStateDetail,
    required this.syncActionStatus,
    required this.onSyncOrRefresh,
    required this.onConfirmDestructiveActionsChanged,
    required this.onChanged,
  });

  final AppThemeMode themeMode;
  final bool confirmDestructiveActions;
  final String syncStateLabel;
  final String syncStateDetail;
  final AppSyncStatus syncActionStatus;
  final VoidCallback onSyncOrRefresh;
  final ValueChanged<bool> onConfirmDestructiveActionsChanged;
  final ValueChanged<AppThemeMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return AppSectionCard(
      subtitle:
          'Utilise la palette CommandGlows et les tokens d’interface partagés. '
          '$syncStateLabel',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SegmentedButton<AppThemeMode>(
            segments: const [
              ButtonSegment(
                value: AppThemeMode.system,
                icon: Icon(Icons.brightness_auto_outlined),
                label: Text('Système'),
              ),
              ButtonSegment(
                value: AppThemeMode.light,
                icon: Icon(Icons.light_mode_outlined),
                label: Text('Clair'),
              ),
              ButtonSegment(
                value: AppThemeMode.dark,
                icon: Icon(Icons.dark_mode_outlined),
                label: Text('Sombre'),
              ),
            ],
            selected: {themeMode},
            onSelectionChanged: (selection) => onChanged(selection.single),
          ),
          AppGaps.x2,
          Text(syncStateDetail, style: Theme.of(context).textTheme.bodySmall),
          AppGaps.x2,
          AppSyncStatusAction(
            key: const Key('settings-appearance-sync-action'),
            status: syncActionStatus,
            onPressed: onSyncOrRefresh,
          ),
          AppGaps.x2,
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            secondary: const Icon(Icons.delete_outline),
            value: confirmDestructiveActions,
            onChanged: onConfirmDestructiveActionsChanged,
            title: const Text('Confirmer avant suppression'),
            subtitle: const Text(
              'Demander confirmation avant de supprimer l’historique, les snippets et les termes du dictionnaire.',
            ),
          ),
        ],
      ),
    );
  }
}

class _BackendProviderSection extends StatelessWidget {
  const _BackendProviderSection({
    required this.summary,
    required this.detail,
    required this.diagnosticText,
    required this.onCopyDiagnostic,
    required this.onClearDiagnosticLogs,
  });

  final String summary;
  final String detail;
  final String diagnosticText;
  final VoidCallback onCopyDiagnostic;
  final Future<void> Function() onClearDiagnosticLogs;

  @override
  Widget build(BuildContext context) {
    return AppSectionCard(
      title: 'Backend et support',
      subtitle: summary,
      leading: const Icon(Icons.storage_outlined),
      stretch: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(detail, style: Theme.of(context).textTheme.bodySmall),
          AppGaps.x3,
          Text(
            'Journaux de support',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          AppGaps.x2,
          _DiagnosticLogPanel(diagnosticText: diagnosticText),
          AppGaps.x3,
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: onCopyDiagnostic,
                icon: const Icon(Icons.copy_outlined),
                label: const Text('Copier diagnostic'),
              ),
              OutlinedButton.icon(
                onPressed: onClearDiagnosticLogs,
                icon: const Icon(Icons.delete_sweep_outlined),
                label: const Text('Effacer journaux'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DiagnosticLogPanel extends StatefulWidget {
  const _DiagnosticLogPanel({required this.diagnosticText});

  final String diagnosticText;

  @override
  State<_DiagnosticLogPanel> createState() => _DiagnosticLogPanelState();
}

class _DiagnosticLogPanelState extends State<_DiagnosticLogPanel> {
  final ScrollController _controller = ScrollController(
    keepScrollOffset: false,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Container(
      constraints: const BoxConstraints(maxHeight: 220),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        border: Border.all(color: colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(AppSpacing.x2),
      ),
      child: Scrollbar(
        controller: _controller,
        thumbVisibility: true,
        child: SingleChildScrollView(
          key: const PageStorageKey<String>('backend_diagnostic_log_scroll'),
          controller: _controller,
          primary: false,
          padding: const EdgeInsets.all(AppSpacing.x2),
          child: SelectableText(
            widget.diagnosticText,
            key: const Key('backend-diagnostic-log-text'),
            style: theme.textTheme.bodySmall?.copyWith(
              fontFamily: AppTypography.monospace,
              height: AppTypography.leadingCompact,
            ),
          ),
        ),
      ),
    );
  }
}

class _SecretsSection extends StatelessWidget {
  const _SecretsSection({
    required this.storageStatusAsync,
    required this.openAiController,
    required this.anthropicController,
    required this.message,
    required this.saving,
    required this.syncStatus,
    required this.onSave,
    required this.onRetrySync,
    required this.onSignOut,
  });

  final AsyncValue<SecretStorageStatus> storageStatusAsync;
  final TextEditingController openAiController;
  final TextEditingController anthropicController;
  final String? message;
  final bool saving;
  final AppSyncStatus syncStatus;
  final VoidCallback onSave;
  final VoidCallback onRetrySync;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    return AppSectionCard(
      subtitle:
          'Stockées sur cet appareil et exclues des préférences synchronisées.',
      leading: const Icon(Icons.key_outlined),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          storageStatusAsync.when(
            data: (status) {
              if (status == SecretStorageStatus.available) {
                return const ListTile(
                  leading: Icon(Icons.verified_user_outlined),
                  title: Text('Stockage sécurisé local disponible'),
                );
              }
              return const ListTile(
                leading: Icon(Icons.warning_amber_outlined),
                title: Text('Stockage sécurisé dégradé'),
                subtitle: Text(
                  'Web/Linux peut ne pas offrir les mêmes garanties de keystore/keychain. '
                  'Le mode IA cloud est considéré comme dégradé tant qu’aucune confirmation explicite n’a été faite.',
                ),
              );
            },
            loading: () => const ListTile(
              title: Text('Vérification des capacités de stockage...'),
            ),
            error: (error, stack) =>
                ListTile(title: Text('Erreur de statut du stockage : $error')),
          ),
          AppGaps.x3,
          TextField(
            controller: openAiController,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Clé API OpenAI'),
          ),
          AppGaps.x3,
          TextField(
            controller: anthropicController,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Clé API Anthropic'),
          ),
          if (message != null) ...[AppGaps.x3, Text(message!)],
          AppGaps.x2,
          AppSyncStatusAction(
            key: const Key('settings-secrets-sync-action'),
            status: syncStatus,
            onPressed: onRetrySync,
          ),
          AppGaps.x4,
          AppActionRail(
            children: [
              FilledButton(
                onPressed: saving ? null : onSave,
                child: const Text('Enregistrer les clés locales'),
              ),
              OutlinedButton(
                onPressed: saving ? null : onSignOut,
                child: const Text('Se déconnecter'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PlatformCapabilitiesSection extends StatelessWidget {
  const _PlatformCapabilitiesSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Appareil: ${PlatformCapabilities.currentPlatformLabel}',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        AppGaps.x1,
        Text(
          'Capacités appareil',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        AppGaps.x2,
        AppStatusCard(
          icon: Icons.mic_none,
          title: PlatformCapabilities.localSpeechSupported
              ? 'Dictée locale disponible'
              : 'Dictée locale indisponible sur ${PlatformCapabilities.currentPlatformLabel}',
          subtitle: PlatformCapabilities.localSpeechSupported
              ? 'Le moteur local de la plateforme peut être utilisé.'
              : '${PlatformCapabilities.localSpeechUnavailableReason} CommandGlows bascule vers l’enregistrement avancé et Whisper.',
        ),
        AppStatusCard(
          icon: Icons.bubble_chart_outlined,
          title: PlatformCapabilities.overlaySupported
              ? 'Overlay Android pris en charge'
              : 'Overlay Android indisponible sur ${PlatformCapabilities.currentPlatformLabel}',
          subtitle: PlatformCapabilities.overlaySupported
              ? 'La bulle native Android peut être utilisée.'
              : PlatformCapabilities.overlayUnavailableReason,
        ),
        AppStatusCard(
          icon: Icons.keyboard_outlined,
          title: PlatformCapabilities.keyboardImeSupported
              ? 'IME clavier Android pris en charge'
              : 'Clavier Android indisponible sur ${PlatformCapabilities.currentPlatformLabel}',
          subtitle: PlatformCapabilities.keyboardImeSupported
              ? 'Le clavier CommandGlows fonctionne comme méthode de saisie native Android.'
              : PlatformCapabilities.keyboardImeUnavailableReason,
        ),
      ],
    );
  }
}

class _KeyboardSettingsSection extends StatelessWidget {
  const _KeyboardSettingsSection({
    required this.status,
    required this.busy,
    required this.onRefresh,
    required this.onOpenInputSettings,
    required this.onShowPicker,
    required this.onOpenCornerShortcuts,
    required this.onOpenNavigationDiagnostics,
    required this.onOpenKeyboardThemeStudio,
    required this.onThemePresetChanged,
    required this.onReliefChanged,
    required this.onPreferenceChanged,
  });

  static const _controlPadding = EdgeInsets.symmetric(
    horizontal: AppSpacing.x1,
    vertical: AppSpacing.x1,
  );
  static const _tilePadding = EdgeInsets.symmetric(horizontal: AppSpacing.x1);

  final AndroidKeyboardStatus? status;
  final bool busy;
  final VoidCallback onRefresh;
  final VoidCallback onOpenInputSettings;
  final VoidCallback onShowPicker;
  final VoidCallback onOpenCornerShortcuts;
  final VoidCallback onOpenNavigationDiagnostics;
  final VoidCallback onOpenKeyboardThemeStudio;
  final ValueChanged<String> onThemePresetChanged;
  final ValueChanged<bool> onReliefChanged;
  final _KeyboardPreferenceChanged onPreferenceChanged;

  String get _enabledLanguages {
    final frenchEnabled = status?.frenchLanguageEnabled ?? true;
    final englishEnabled = status?.englishLanguageEnabled ?? true;
    if (frenchEnabled && englishEnabled) {
      return 'fr+en';
    }
    if (frenchEnabled) {
      return 'fr';
    }
    if (englishEnabled) {
      return 'en';
    }
    return 'none';
  }

  double get _actionRowHeightScale {
    final value = status?.actionRowHeightScale ?? 1;
    if (value <= 0.56) {
      return 0.56;
    }
    if (value < 0.84) {
      return 2 / 3;
    }
    return 1;
  }

  String get _keyboardStateSummary {
    final current = status;
    if (current == null) {
      return 'État clavier en cours de lecture.';
    }
    if (!current.supported) {
      return 'Clavier natif indisponible sur cette plateforme.';
    }
    if (!current.enabled) {
      return 'Clavier à activer dans Android.';
    }
    if (current.active) {
      return 'Clavier actif et prêt dans les champs texte.';
    }
    return 'Clavier activé, mais pas sélectionné comme méthode de saisie.';
  }

  String get _keyboardConfigSummary {
    final current = status;
    if (current == null) {
      return 'Disposition et préférences non chargées.';
    }
    final layout = current.layoutProfile == KeyboardLayoutProfile.azerty
        ? 'AZERTY'
        : 'QWERTY';
    final gestures = current.cornerModeEnabled
        ? 'gestes activés'
        : 'gestes désactivés';
    final privacy = switch (current.privacyMode) {
      KeyboardPrivacyMode.auto => 'confidentialité auto',
      KeyboardPrivacyMode.strict => 'privé partout',
      KeyboardPrivacyMode.standard => 'standard',
    };
    return '$layout, $gestures, $_enabledLanguages, $privacy.';
  }

  String get _keyboardDiagnosticsSummary {
    final recoveries = status?.keyboardRecoveryCount ?? 0;
    if (recoveries == 0 && status?.lastKeyboardError == null) {
      return 'Aucun incident récent signalé.';
    }
    final last = status?.lastKeyboardErrorAt ?? 'date inconnue';
    return '$recoveries reprise(s), dernier signalement: $last.';
  }

  @override
  Widget build(BuildContext context) {
    return AppSectionCard(
      subtitle:
          'Statut de la méthode de saisie Android, disposition, gestes et confidentialité.',
      leading: const Icon(Icons.keyboard_outlined),
      child: ListTileTheme.merge(
        dense: true,
        visualDensity: VisualDensity.compact,
        contentPadding: _tilePadding,
        minLeadingWidth: AppIconMetrics.sm,
        horizontalTitleGap: AppSpacing.x2,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ListTile(
              title: const Text('État du clavier'),
              subtitle: Text(_keyboardStateSummary),
              trailing: busy
                  ? const SizedBox.square(
                      dimension: AppIconMetrics.sm,
                      child: CircularProgressIndicator(
                        strokeWidth: AppIconMetrics.progressStroke,
                      ),
                    )
                  : IconButton(
                      tooltip: 'Actualiser l’état du clavier',
                      onPressed: onRefresh,
                      icon: const Icon(Icons.refresh),
                    ),
            ),
            ListTile(
              leading: const Icon(Icons.tune_outlined),
              title: const Text('Configuration'),
              subtitle: Text(_keyboardConfigSummary),
            ),
            if (status?.enabled == false)
              const ListTile(
                leading: Icon(Icons.info_outline),
                title: Text('Clavier non activé'),
                subtitle: Text(
                  'Activez le clavier CommandGlows dans les paramètres de méthode de saisie Android, puis sélectionnez-le depuis n’importe quel champ texte.',
                ),
              ),
            Padding(
              padding: _controlPadding,
              child: _KeyboardSettingsActions(
                busy: busy,
                onOpenInputSettings: onOpenInputSettings,
                onShowPicker: onShowPicker,
                onOpenKeyboardThemeStudio: onOpenKeyboardThemeStudio,
              ),
            ),
            Padding(
              padding: _controlPadding,
              child: _KeyboardThemeQuickPicker(
                status: status,
                busy: busy,
                onThemePresetChanged: onThemePresetChanged,
              ),
            ),
            SwitchListTile(
              value: status?.themeKeyReliefEnabled ?? false,
              onChanged: busy ? null : onReliefChanged,
              title: const Text('Relief clavier'),
              subtitle: const Text(
                'Ajoute un contour de touche et une sensation de touche enfoncée au clavier natif.',
              ),
            ),
            SwitchListTile(
              value: status?.customActionBarEnabled ?? false,
              onChanged: busy
                  ? null
                  : (value) =>
                        onPreferenceChanged(customActionBarEnabled: value),
              title: const Text('Barre d’actions personnalisée'),
              subtitle: const Text(
                'Affiche dans le clavier Android la barre globale configurée depuis la page Actions.',
              ),
            ),
            SwitchListTile(
              value: status?.voiceEnabled ?? true,
              onChanged: busy
                  ? null
                  : (value) => onPreferenceChanged(voiceEnabled: value),
              title: const Text('Dictée clavier'),
              subtitle: const Text(
                'Utilise la reconnaissance vocale Android de l’IME quand la permission micro est accordée.',
              ),
            ),
            SwitchListTile(
              value: status?.clipboardSyncDesired ?? false,
              onChanged: busy
                  ? null
                  : (value) => onPreferenceChanged(clipboardSyncDesired: value),
              title: const Text('Synchronisation clavier presse-papiers'),
              subtitle: const Text(
                'Option de synchronisation cloud des éléments éligibles du presse-papiers clavier. L’historique local est géré séparément.',
              ),
            ),
            SwitchListTile(
              value: status?.clipboardSensitiveFieldHistoryEnabled ?? false,
              onChanged: busy
                  ? null
                  : (value) => onPreferenceChanged(
                      clipboardSensitiveFieldHistoryEnabled: value,
                    ),
              title: const Text('Historique dans champs sensibles'),
              subtitle: const Text(
                'Option avancée : le copier/coller des champs mot de passe, OTP ou privés peut apparaître dans l’historique du presse-papiers. Désactivé par défaut.',
              ),
            ),
            SwitchListTile(
              value: status?.mediaControlsEnabled ?? true,
              onChanged: busy
                  ? null
                  : (value) => onPreferenceChanged(mediaControlsEnabled: value),
              title: const Text('Lecture/pause média clavier'),
              subtitle: const Text(
                'Envoie une touche média Android générique sans lire les métadonnées.',
              ),
            ),
            Padding(
              padding: _controlPadding,
              child: Column(
                children: [
                  Row(
                    children: [
                      const Expanded(child: Text('Pas de volume')),
                      Text('${status?.mediaVolumeStepPercent ?? 5}%'),
                    ],
                  ),
                  Slider(
                    value: _mediaStepSliderValue(
                      status?.mediaVolumeStepPercent ?? 5,
                    ),
                    min: 0,
                    max: (_mediaStepPercentOptions.length - 1).toDouble(),
                    divisions: _mediaStepPercentOptions.length - 1,
                    semanticFormatterCallback: (value) =>
                        'Pas de volume ${_mediaStepPercentForSliderValue(value)} pourcentage',
                    onChanged: busy
                        ? null
                        : (value) => onPreferenceChanged(
                            mediaVolumeStepPercent:
                                _mediaStepPercentForSliderValue(value),
                          ),
                  ),
                  Row(
                    children: [
                      const Expanded(child: Text('Pas de luminosité')),
                      Text('${status?.mediaBrightnessStepPercent ?? 10}%'),
                    ],
                  ),
                  Slider(
                    value: _mediaStepSliderValue(
                      status?.mediaBrightnessStepPercent ?? 10,
                    ),
                    min: 0,
                    max: (_mediaStepPercentOptions.length - 1).toDouble(),
                    divisions: _mediaStepPercentOptions.length - 1,
                    semanticFormatterCallback: (value) =>
                        'Pas de luminosité ${_mediaStepPercentForSliderValue(value)} pourcentage',
                    onChanged: busy
                        ? null
                        : (value) => onPreferenceChanged(
                            mediaBrightnessStepPercent:
                                _mediaStepPercentForSliderValue(value),
                          ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: _controlPadding,
              child: DropdownButtonFormField<KeyboardLayoutProfile>(
                initialValue:
                    status?.layoutProfile ?? KeyboardLayoutProfile.qwerty,
                decoration: const InputDecoration(
                  labelText: 'Disposition des lettres',
                ),
                items: const [
                  DropdownMenuItem(
                    value: KeyboardLayoutProfile.qwerty,
                    child: Text('QWERTY'),
                  ),
                  DropdownMenuItem(
                    value: KeyboardLayoutProfile.azerty,
                    child: Text('AZERTY'),
                  ),
                ],
                onChanged: busy
                    ? null
                    : (value) => onPreferenceChanged(
                        layoutProfile: value ?? KeyboardLayoutProfile.qwerty,
                      ),
              ),
            ),
            SwitchListTile(
              value: status?.cornerModeEnabled ?? false,
              onChanged: busy
                  ? null
                  : (value) => onPreferenceChanged(cornerModeEnabled: value),
              title: const Text('Gestes de glissement'),
              subtitle: const Text(
                'Quand activé, les glissements sur les touches déclenchent des raccourcis directionnels et d’angle.',
              ),
            ),
            ListTile(
              leading: const Icon(Icons.open_in_full_outlined),
              title: const Text('Raccourcis de gestes'),
              subtitle: Text(
                'Préréglage=${status?.cornerPresetId ?? KeyboardCornerPresetCatalog.frenchAccents}. Configurez les actions par touche.',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: busy ? null : onOpenCornerShortcuts,
            ),
            SwitchListTile(
              value: status?.frenchLanguageEnabled ?? true,
              onChanged: busy
                  ? null
                  : (value) =>
                        onPreferenceChanged(frenchLanguageEnabled: value),
              title: const Text('Suggestions françaises'),
              subtitle: const Text(
                'Active le dictionnaire de suggestions français intégré.',
              ),
            ),
            SwitchListTile(
              value: status?.englishLanguageEnabled ?? true,
              onChanged: busy
                  ? null
                  : (value) =>
                        onPreferenceChanged(englishLanguageEnabled: value),
              title: const Text('Suggestions anglaises'),
              subtitle: const Text(
                'Active le dictionnaire de suggestions anglais intégré.',
              ),
            ),
            SwitchListTile(
              value: status?.spellingSuggestionsEnabled ?? true,
              onChanged: busy
                  ? null
                  : (value) =>
                        onPreferenceChanged(spellingSuggestionsEnabled: value),
              title: const Text('Suggestions orthographiques'),
              subtitle: const Text(
                'Affiche des candidats de mots au-dessus du clavier natif. Les règles d’extension de texte restent séparées.',
              ),
            ),
            Padding(
              padding: _controlPadding,
              child: Column(
                children: [
                  Row(
                    children: [
                      const Expanded(child: Text('Hauteur du clavier')),
                      Text(
                        '${((status?.keyboardHeightScale ?? 1) * 100).round()}%',
                      ),
                    ],
                  ),
                  Slider(
                    value: (status?.keyboardHeightScale ?? 1).clamp(0.85, 1.2),
                    min: 0.85,
                    max: 1.2,
                    divisions: 12,
                    semanticFormatterCallback: (value) =>
                        'Hauteur du clavier ${(value * 100).round()} pourcentage',
                    onChanged: busy
                        ? null
                        : (value) =>
                              onPreferenceChanged(keyboardHeightScale: value),
                  ),
                ],
              ),
            ),
            Padding(
              padding: _controlPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Hauteur de la rangée d’action'),
                  AppGaps.x1,
                  SegmentedButton<double>(
                    segments: const [
                      ButtonSegment(
                        value: 1,
                        icon: Icon(Icons.crop_16_9_outlined),
                        label: Text('Pleine'),
                      ),
                      ButtonSegment(
                        value: 2 / 3,
                        icon: Icon(Icons.crop_square_outlined),
                        label: Text('Carrée'),
                      ),
                      ButtonSegment(
                        value: 0.56,
                        icon: Icon(Icons.density_small_outlined),
                        label: Text('Mini'),
                      ),
                    ],
                    selected: {_actionRowHeightScale},
                    onSelectionChanged: busy
                        ? null
                        : (selection) => onPreferenceChanged(
                            actionRowHeightScale: selection.single,
                          ),
                  ),
                ],
              ),
            ),
            SwitchListTile(
              value: status?.compactModeEnabled ?? false,
              onChanged: busy
                  ? null
                  : (value) => onPreferenceChanged(compactModeEnabled: value),
              title: const Text('Mode clavier compact'),
              subtitle: const Text(
                'Utilise trois lignes de saisie denses lorsque vous avez besoin de la hauteur clavier la plus faible.',
              ),
            ),
            SwitchListTile(
              value: status?.autoCloseModesEnabled ?? true,
              onChanged: busy
                  ? null
                  : (value) =>
                        onPreferenceChanged(autoCloseModesEnabled: value),
              title: const Text('Fermeture automatique des modes'),
              subtitle: const Text(
                'Revient à ABC après une touche en mode chiffres, symboles, accents ou émoji.',
              ),
            ),
            SwitchListTile(
              value: status?.keyVibrationEnabled ?? true,
              onChanged: busy
                  ? null
                  : (value) => onPreferenceChanged(keyVibrationEnabled: value),
              title: const Text('Vibration des touches'),
              subtitle: const Text(
                'Active/désactive le retour haptique du clavier.',
              ),
            ),
            SwitchListTile(
              value: status?.keySoundEnabled ?? false,
              onChanged: busy
                  ? null
                  : (value) => onPreferenceChanged(keySoundEnabled: value),
              title: const Text('Son des touches'),
              subtitle: const Text(
                'Active/désactive le clic sonore des touches.',
              ),
            ),
            SwitchListTile(
              value: status?.specialKeyCornersEnabled ?? false,
              onChanged: busy
                  ? null
                  : (value) =>
                        onPreferenceChanged(specialKeyCornersEnabled: value),
              title: const Text(
                'Raccourcis par glissement de touches spéciales',
              ),
              subtitle: const Text(
                'Autorise les raccourcis de glissement sur les touches non alphabétiques quand les gestes de glissement sont activés.',
              ),
            ),
            SwitchListTile(
              value: status?.doubleSpacePeriodEnabled ?? true,
              onChanged: busy
                  ? null
                  : (value) =>
                        onPreferenceChanged(doubleSpacePeriodEnabled: value),
              title: const Text('Double espace vers point'),
              subtitle: const Text(
                'Transforme le double espace en point-espace dans les champs texte standards.',
              ),
            ),
            SwitchListTile(
              value: status?.punctuationAutoSpacingEnabled ?? false,
              onChanged: busy
                  ? null
                  : (value) => onPreferenceChanged(
                      punctuationAutoSpacingEnabled: value,
                    ),
              title: const Text('Espacement automatique de ponctuation'),
              subtitle: const Text(
                'Ajoute un espacement basique autour de la ponctuation pour les champs texte standards.',
              ),
            ),
            Padding(
              padding: _controlPadding,
              child: DropdownButtonFormField<KeyboardPrivacyMode>(
                initialValue: status?.privacyMode ?? KeyboardPrivacyMode.auto,
                decoration: const InputDecoration(
                  labelText: 'Mode confidentialité clavier',
                ),
                items: const [
                  DropdownMenuItem(
                    value: KeyboardPrivacyMode.auto,
                    child: Text('Auto : détecter les champs sensibles'),
                  ),
                  DropdownMenuItem(
                    value: KeyboardPrivacyMode.strict,
                    child: Text('Strict : mode privé partout'),
                  ),
                  DropdownMenuItem(
                    value: KeyboardPrivacyMode.standard,
                    child: Text('Standard : champs normaux uniquement'),
                  ),
                ],
                onChanged: busy
                    ? null
                    : (value) => onPreferenceChanged(
                        privacyMode: value ?? KeyboardPrivacyMode.auto,
                      ),
              ),
            ),
            ExpansionTile(
              tilePadding: _tilePadding,
              childrenPadding: _controlPadding,
              leading: const Icon(Icons.health_and_safety_outlined),
              title: const Text('Diagnostics avancés'),
              subtitle: Text(_keyboardDiagnosticsSummary),
              children: [
                SwitchListTile(
                  value: status?.debugTouchOverlayEnabled ?? false,
                  onChanged: busy
                      ? null
                      : (value) => onPreferenceChanged(
                          debugTouchOverlayEnabled: value,
                        ),
                  title: const Text('Diagnostic tactile'),
                  subtitle: const Text(
                    'Affiche les limites des touches et la classification des gestes pour les tests support.',
                  ),
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: SelectableText(
                    'enabled=${status?.enabled ?? false} | '
                    'active=${status?.active ?? false} | '
                    'layout=${status?.layoutProfile.name ?? 'qwerty'} | '
                    'gestures=${status?.cornerModeEnabled ?? false} | '
                    'languages=$_enabledLanguages | '
                    'privacy=${status?.privacyMode.name ?? 'auto'}\n'
                    'recoveries=${status?.keyboardRecoveryCount ?? 0} | '
                    'last=${status?.lastKeyboardErrorAt ?? 'none'} | '
                    'sentry=${SentryBootstrap.isConfigured ? 'configured' : 'disabled'}',
                  ),
                ),
                if (status?.lastKeyboardError != null) ...[
                  AppGaps.x2,
                  Align(
                    alignment: Alignment.centerLeft,
                    child: SelectableText(status!.lastKeyboardError!),
                  ),
                ],
                AppGaps.x2,
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.science_outlined),
                  title: const Text('Playground navigation'),
                  subtitle: const Text(
                    'Ouvre le banc de test Flutter et le journal natif des actions Del, Word, Sent, Debut, Fin et All.',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: busy ? null : onOpenNavigationDiagnostics,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _KeyboardSettingsActions extends StatelessWidget {
  const _KeyboardSettingsActions({
    required this.busy,
    required this.onOpenInputSettings,
    required this.onShowPicker,
    required this.onOpenKeyboardThemeStudio,
  });

  final bool busy;
  final VoidCallback onOpenInputSettings;
  final VoidCallback onShowPicker;
  final VoidCallback onOpenKeyboardThemeStudio;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : 360.0;
        final columns = maxWidth >= 560
            ? 3
            : maxWidth >= 360
            ? 2
            : 1;
        const spacing = AppSpacing.x1;
        final itemWidth = (maxWidth - spacing * (columns - 1)) / columns;
        final fullWidthLastAction = columns == 2;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            SizedBox(
              width: itemWidth,
              child: OutlinedButton.icon(
                onPressed: busy ? null : onOpenInputSettings,
                icon: const Icon(Icons.open_in_new),
                label: const Text('Paramètres'),
              ),
            ),
            SizedBox(
              width: itemWidth,
              child: FilledButton.icon(
                onPressed: busy ? null : onShowPicker,
                icon: const Icon(Icons.keyboard),
                label: const Text('Changer'),
              ),
            ),
            SizedBox(
              width: fullWidthLastAction ? maxWidth : itemWidth,
              child: OutlinedButton.icon(
                onPressed: busy ? null : onOpenKeyboardThemeStudio,
                icon: const Icon(Icons.palette_outlined),
                label: const Text('Thème'),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _KeyboardThemeQuickPicker extends StatelessWidget {
  const _KeyboardThemeQuickPicker({
    required this.status,
    required this.busy,
    required this.onThemePresetChanged,
  });

  final AndroidKeyboardStatus? status;
  final bool busy;
  final ValueChanged<String> onThemePresetChanged;

  @override
  Widget build(BuildContext context) {
    final selectedPresetId = _normalizedPresetId(
      status?.themePresetId ?? KeyboardThemePresetCatalog.system,
    );
    final brightness = Theme.of(context).brightness;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Thème clavier', style: Theme.of(context).textTheme.titleSmall),
        AppGaps.x2,
        Text(
          'Le thème clavier suit le paramètre d’apparence global ci-dessus.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        AppGaps.x2,
        LayoutBuilder(
          builder: (context, constraints) {
            final maxWidth = constraints.maxWidth.isFinite
                ? constraints.maxWidth
                : 320.0;
            final columns = maxWidth >= 520
                ? 3
                : maxWidth >= 280
                ? 2
                : 1;
            const spacing = AppSpacing.x1;
            final itemWidth = (maxWidth - spacing * (columns - 1)) / columns;
            return Wrap(
              spacing: spacing,
              runSpacing: spacing,
              children: [
                for (final preset in KeyboardThemePresetCatalog.presets)
                  SizedBox(
                    width: itemWidth,
                    child: _KeyboardThemePresetChip(
                      preset: preset,
                      brightness: brightness,
                      selected: selectedPresetId == preset.id,
                      enabled: !busy,
                      onPressed: () => onThemePresetChanged(preset.id),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _KeyboardThemePresetChip extends StatelessWidget {
  const _KeyboardThemePresetChip({
    required this.preset,
    required this.brightness,
    required this.selected,
    required this.enabled,
    required this.onPressed,
  });

  final KeyboardThemePreset preset;
  final Brightness brightness;
  final bool selected;
  final bool enabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final config = KeyboardThemePresetCatalog.configFor(
      preset.id,
      brightness: brightness,
    );
    final labelColor = _themePreviewTextColor(config.keyColor);
    final borderColor = selected
        ? Color(config.activeKeyColor)
        : Theme.of(context).colorScheme.outlineVariant;
    return OutlinedButton(
      onPressed: enabled ? onPressed : null,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.all(AppSpacing.x1),
        foregroundColor: labelColor,
        backgroundColor: Color(config.keyColor),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        visualDensity: VisualDensity.compact,
        side: BorderSide(color: borderColor, width: selected ? 2 : 1),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.x1),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _KeyboardThemeSwatch(config: config),
          const SizedBox(height: AppSpacing.x1),
          Text(
            preset.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: labelColor,
              fontSize: AppKeyboardStudioMetrics.previewLabelFontSize,
              fontWeight: selected
                  ? AppFontWeights.bold
                  : AppFontWeights.semiBold,
            ),
          ),
        ],
      ),
    );
  }
}

class _KeyboardThemeSwatch extends StatelessWidget {
  const _KeyboardThemeSwatch({required this.config});

  final KeyboardThemeConfig config;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppSpacing.x1),
      child: SizedBox(
        height: AppKeyboardStudioMetrics.previewSwatchHeight,
        child: Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: Color(config.backgroundStartColor),
                gradient: config.useGradient
                    ? LinearGradient(
                        colors: [
                          Color(config.backgroundStartColor),
                          Color(config.backgroundEndColor),
                        ],
                      )
                    : null,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.x1),
              child: Row(
                children: [
                  _KeyboardThemeMiniKey(color: Color(config.keyColor)),
                  const SizedBox(width: AppSpacing.x1),
                  _KeyboardThemeMiniKey(color: Color(config.specialKeyColor)),
                  const SizedBox(width: AppSpacing.x1),
                  Expanded(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Color(config.activeKeyColor),
                        borderRadius: BorderRadius.circular(AppRadii.sm),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KeyboardThemeMiniKey extends StatelessWidget {
  const _KeyboardThemeMiniKey({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(AppRadii.sm),
        ),
      ),
    );
  }
}

class _OnDeviceSpeechSection extends StatelessWidget {
  const _OnDeviceSpeechSection({
    required this.state,
    required this.keyboardStatus,
    required this.onRefresh,
    required this.onAllowCloudFallbackChanged,
    required this.onInstall,
    required this.onRetryInstall,
    required this.onMarkUpdateAvailable,
    required this.onMarkCorrupted,
    required this.onRemove,
  });

  final LanguagePackCatalogState state;
  final AndroidKeyboardStatus? keyboardStatus;
  final VoidCallback onRefresh;
  final ValueChanged<bool> onAllowCloudFallbackChanged;
  final Future<bool> Function(LanguagePackCatalogEntry entry) onInstall;
  final Future<bool> Function(LanguagePackCatalogEntry entry) onRetryInstall;
  final bool Function(LanguagePackCatalogEntry entry) onMarkUpdateAvailable;
  final bool Function(LanguagePackCatalogEntry entry) onMarkCorrupted;
  final ValueChanged<LanguagePackCatalogEntry> onRemove;

  String get _voiceRuntimeSummary {
    final status = keyboardStatus;
    if (status == null) {
      return 'État vocal en cours de lecture.';
    }
    final language = status.voiceLanguageTag == 'und'
        ? 'langue non choisie'
        : status.voiceLanguageTag;
    final mode = switch (status.voiceRuntimeMode) {
      'local' => 'pack local actif',
      'android_fallback' => 'fallback Android',
      'cloud_fallback' => 'fallback cloud',
      'unavailable' => 'dictée locale indisponible',
      _ => status.voiceRuntimeMode,
    };
    return '$mode, $language.';
  }

  @override
  Widget build(BuildContext context) {
    final entries = state.catalog.entries;
    return AppSectionCard(
      subtitle:
          'Installez uniquement les packs locaux dont vous avez besoin. Le fallback Android ou cloud est toujours explicitement indiqué.',
      leading: const Icon(Icons.record_voice_over_outlined),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('État vocal'),
            subtitle: Text(_voiceRuntimeSummary),
            trailing: IconButton(
              tooltip: 'Actualiser le catalogue vocal',
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh),
            ),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: state.allowCloudFallback,
            onChanged: onAllowCloudFallbackChanged,
            title: const Text('Autoriser fallback cloud'),
            subtitle: const Text(
              'Quand il est désactivé, CommandGlows affiche indisponible au lieu d’envoyer la dictée au fallback cloud.',
            ),
          ),
          if (state.hasError || state.isStale)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.warning_amber_outlined),
              title: Text(
                state.isStale ? 'Catalogue obsolète' : 'Catalogue indisponible',
              ),
              subtitle: Text(
                state.lastErrorMessage ??
                    'Réessayez de charger le catalogue local.',
              ),
            ),
          AppGaps.x2,
          for (final entry in entries) ...[
            _LanguagePackTile(
              entry: entry,
              installed: state.installedStateFor(entry),
              allowCloudFallback: state.allowCloudFallback,
              retriesUsed: state.retryCounts[entry.packId] ?? 0,
              onInstall: () => onInstall(entry),
              onRetryInstall: () => onRetryInstall(entry),
              onMarkUpdateAvailable: () => onMarkUpdateAvailable(entry),
              onMarkCorrupted: () => onMarkCorrupted(entry),
              onRemove: () => onRemove(entry),
            ),
            AppGaps.x2,
          ],
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            childrenPadding: const EdgeInsets.only(top: AppSpacing.x1),
            title: const Text('Diagnostics avancés'),
            subtitle: const Text('Runtime vocal, moteur et fallback support.'),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: SelectableText(
                  'runtime=${keyboardStatus?.voiceRuntimeMode ?? 'unavailable'} | '
                  'language=${keyboardStatus?.voiceLanguageTag ?? 'und'} | '
                  'pack=${keyboardStatus?.voicePackId ?? 'none'} | '
                  'engine=${keyboardStatus?.voiceEngine ?? 'unavailable'} | '
                  'fallback=${keyboardStatus?.voiceFallbackReason ?? 'unsupported_language'}',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LanguagePackTile extends StatelessWidget {
  const _LanguagePackTile({
    required this.entry,
    required this.installed,
    required this.allowCloudFallback,
    required this.retriesUsed,
    required this.onInstall,
    required this.onRetryInstall,
    required this.onMarkUpdateAvailable,
    required this.onMarkCorrupted,
    required this.onRemove,
  });

  final LanguagePackCatalogEntry entry;
  final InstalledLanguagePack installed;
  final bool allowCloudFallback;
  final int retriesUsed;
  final Future<bool> Function() onInstall;
  final Future<bool> Function() onRetryInstall;
  final bool Function() onMarkUpdateAvailable;
  final bool Function() onMarkCorrupted;
  final VoidCallback onRemove;

  static String _languagePackStatusLine(
    LanguagePackCatalogEntry entry,
    InstalledLanguagePack installed,
  ) {
    final state = switch (installed.installState) {
      InstalledLanguagePackState.notInstalled => 'Non installé',
      InstalledLanguagePackState.queued => 'En attente',
      InstalledLanguagePackState.downloading => 'Téléchargement en cours',
      InstalledLanguagePackState.pausedInsufficientStorage =>
        'En pause: stockage insuffisant',
      InstalledLanguagePackState.verifying => 'Vérification en cours',
      InstalledLanguagePackState.installed => 'Installé',
      InstalledLanguagePackState.updateAvailable => 'Mise à jour disponible',
      InstalledLanguagePackState.failedDownload => 'Téléchargement échoué',
      InstalledLanguagePackState.failedVerification => 'Vérification échouée',
      InstalledLanguagePackState.blockedIncompatibleDevice =>
        'Appareil incompatible',
      InstalledLanguagePackState.blockedInsufficientStorage =>
        'Stockage insuffisant',
      InstalledLanguagePackState.corrupted => 'Pack à restaurer',
      InstalledLanguagePackState.removed => 'Supprimé',
    };
    return '$state · ${entry.downloadSizeMb} Mo à télécharger · ${entry.installedSizeMb} Mo installés.';
  }

  static String _languagePackFallbackLine(
    LanguagePackCatalogEntry entry,
    bool allowCloudFallback,
  ) {
    final offline = entry.supportsOffline
        ? 'fonctionne hors ligne'
        : 'connexion requise';
    final cloud = allowCloudFallback
        ? 'fallback cloud autorisé'
        : 'fallback cloud désactivé';
    return '$offline · $cloud.';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statusLine = _languagePackStatusLine(entry, installed);
    final fallbackLine = _languagePackFallbackLine(entry, allowCloudFallback);
    final canRemove =
        installed.installState != InstalledLanguagePackState.notInstalled &&
        installed.installState != InstalledLanguagePackState.removed;
    final removeLabel =
        installed.installState == InstalledLanguagePackState.removed
        ? 'Supprimé'
        : installed.installState == InstalledLanguagePackState.notInstalled
        ? 'Non installé'
        : 'Supprimer';
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(AppSpacing.x2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.x2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    entry.displayName,
                    style: theme.textTheme.titleSmall,
                  ),
                ),
                _SpeechPill(label: entry.qualityTier.wireName),
              ],
            ),
            AppGaps.x1,
            Text(statusLine, style: theme.textTheme.bodySmall),
            AppGaps.x1,
            Text(fallbackLine, style: theme.textTheme.bodySmall),
            if (installed.installState ==
                InstalledLanguagePackState.blockedInsufficientStorage) ...[
              AppGaps.x1,
              Text(
                'Stockage bloqué : requis=${installed.requiredMb}Mo, disponible=${installed.availableMb}Mo.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ],
            if (installed.installState ==
                InstalledLanguagePackState.blockedIncompatibleDevice) ...[
              AppGaps.x1,
              Text(
                'Appareil bloqué : ${installed.lastErrorCode}. Ce pack ne peut pas être mis en file sur le profil d’appareil actuel.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ],
            if (installed.installState ==
                InstalledLanguagePackState.updateAvailable) ...[
              AppGaps.x1,
              Text(
                'Mise à jour disponible : réinstallez ce pack pour actualiser les fichiers locaux du modèle.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
            if (installed.installState ==
                InstalledLanguagePackState.corrupted) ...[
              AppGaps.x1,
              Text(
                'Pack corrompu détecté : réessayez l’installation pour restaurer le runtime local.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ],
            if (!entry.isInstallable) ...[
              AppGaps.x1,
              Text(
                'Ligne état uniquement : cette langue n’a pas de pack local téléchargeable dans le catalogue actuel.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            AppGaps.x2,
            Wrap(
              spacing: AppSpacing.x2,
              runSpacing: AppSpacing.x2,
              children: [
                OutlinedButton.icon(
                  onPressed: entry.isInstallable
                      ? () async {
                          await onInstall();
                        }
                      : null,
                  icon: const Icon(Icons.download_outlined),
                  label: const Text('Installer maintenant'),
                ),
                OutlinedButton.icon(
                  onPressed:
                      installed.installState ==
                              InstalledLanguagePackState.failedDownload ||
                          installed.installState ==
                              InstalledLanguagePackState.failedVerification ||
                          installed.installState ==
                              InstalledLanguagePackState
                                  .blockedInsufficientStorage ||
                          installed.installState ==
                              InstalledLanguagePackState
                                  .pausedInsufficientStorage ||
                          installed.installState ==
                              InstalledLanguagePackState.corrupted
                      ? () async {
                          await onRetryInstall();
                        }
                      : null,
                  icon: const Icon(Icons.refresh_outlined),
                  label: const Text('Réessayer'),
                ),
                OutlinedButton.icon(
                  onPressed: canRemove ? onRemove : null,
                  icon: const Icon(Icons.delete_outline),
                  label: Text(removeLabel),
                ),
              ],
            ),
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              childrenPadding: EdgeInsets.zero,
              title: const Text('Support avancé'),
              subtitle: Text(
                'progression ${installed.downloadProgress}%, essais $retriesUsed/3, checksum ${installed.checksumVerified ? 'validé' : 'non validé'}.',
              ),
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: SelectableText(
                    'engine=${entry.engine.wireName} | '
                    'quality=${entry.qualityTier.wireName} | '
                    'runtime=${entry.runtimeMode.wireName} | '
                    'fallback=${entry.fallbackPolicy.wireName} | '
                    'license=${entry.licenseId} | '
                    'download=${entry.downloadSizeMb}MB | '
                    'installed=${entry.installedSizeMb}MB | '
                    'state=${installed.installState.wireName}',
                  ),
                ),
                AppGaps.x1,
                Wrap(
                  spacing: AppSpacing.x2,
                  runSpacing: AppSpacing.x2,
                  children: [
                    OutlinedButton.icon(
                      onPressed:
                          installed.installState ==
                              InstalledLanguagePackState.installed
                          ? () {
                              onMarkUpdateAvailable();
                            }
                          : null,
                      icon: const Icon(Icons.system_update_alt_outlined),
                      label: const Text('Simuler mise à jour'),
                    ),
                    OutlinedButton.icon(
                      onPressed:
                          installed.installState ==
                                  InstalledLanguagePackState.installed ||
                              installed.installState ==
                                  InstalledLanguagePackState.updateAvailable
                          ? () {
                              onMarkCorrupted();
                            }
                          : null,
                      icon: const Icon(Icons.warning_amber_outlined),
                      label: const Text('Simuler corruption'),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SpeechPill extends StatelessWidget {
  const _SpeechPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(AppRadii.pill),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x2,
          vertical: AppSpacing.x1,
        ),
        child: Text(label, style: Theme.of(context).textTheme.labelSmall),
      ),
    );
  }
}

String _normalizedPresetId(String presetId) {
  return switch (presetId) {
    KeyboardThemePresetCatalog.commandglowsLight ||
    KeyboardThemePresetCatalog.commandglowsDark =>
      KeyboardThemePresetCatalog.commandglows,
    _ => presetId,
  };
}

Color _themePreviewTextColor(int backgroundColor) {
  final color = Color(backgroundColor);
  return color.computeLuminance() > .45 ? AppColors.black : AppColors.white;
}

class _OverlaySettingsSection extends StatelessWidget {
  const _OverlaySettingsSection({
    required this.status,
    required this.busy,
    required this.onToggle,
    required this.onAppearanceChanged,
    required this.onOpenOverlaySettings,
    required this.onOpenAccessibilitySettings,
    required this.onStart,
    required this.onStop,
    required this.onCancel,
  });

  final AndroidOverlayStatus? status;
  final bool busy;
  final ValueChanged<bool> onToggle;
  final _OverlayAppearanceChanged onAppearanceChanged;
  final VoidCallback onOpenOverlaySettings;
  final VoidCallback onOpenAccessibilitySettings;
  final VoidCallback onStart;
  final VoidCallback onStop;
  final VoidCallback onCancel;

  String get _overlayStateSummary {
    final current = status;
    if (current == null) {
      return 'État overlay en cours de lecture.';
    }
    if (!current.overlayPermissionGranted) {
      return 'Permission de bulle requise avant activation.';
    }
    if (current.running) {
      return 'Bulle active, service en cours.';
    }
    if (current.enabled) {
      return 'Bulle autorisée et activée, service prêt à démarrer.';
    }
    return 'Bulle autorisée, mais désactivée.';
  }

  String get _overlayDeliverySummary {
    final current = status;
    if (current == null) {
      return 'Mode de livraison non chargé.';
    }
    if (!current.accessibilityPermissionGranted) {
      return 'Transfert limité au presse-papiers tant que l’accessibilité est désactivée.';
    }
    return switch (current.deliveryMode) {
      OverlayDeliveryMode.injectionAndClipboard =>
        'Injection directe disponible, avec copie presse-papiers en secours.',
      OverlayDeliveryMode.clipboardOnly =>
        'Résultat copié dans le presse-papiers.',
    };
  }

  @override
  Widget build(BuildContext context) {
    return AppSectionCard(
      subtitle:
          'Permissions de bulle flottante, exécution d’enregistrement et mode de livraison.',
      leading: const Icon(Icons.bubble_chart_outlined),
      child: Column(
        children: [
          SwitchListTile(
            value: status?.enabled ?? false,
            onChanged: (status?.overlayPermissionGranted ?? false) && !busy
                ? onToggle
                : null,
            title: const Text('Activer le pont overlay Android'),
            subtitle: Text(
              (status?.enabled ?? false)
                  ? 'Le pont overlay est actif. La bulle flottante Android devrait être visible.'
                  : (status?.overlayPermissionGranted ?? false)
                  ? 'Permission overlay accordée. Activez-la pour afficher la bulle flottante.'
                  : 'Permission overlay requise avant activation.',
            ),
          ),
          ListTile(
            title: const Text('État de la bulle'),
            subtitle: Text(_overlayStateSummary),
          ),
          ListTile(
            title: const Text('Transmission du résultat'),
            subtitle: Text(_overlayDeliverySummary),
          ),
          if (status?.accessibilityPermissionGranted == false)
            const ListTile(
              leading: Icon(Icons.info_outline),
              title: Text('Accessibilité désactivée'),
              subtitle: Text(
                'La dictée overlay ne transmettra que le presse-papiers tant que le service d’accessibilité n’est pas activé.',
              ),
            ),
          Padding(
            padding: AppInsets.keyboardPrivacy,
            child: Column(
              children: [
                Row(
                  children: [
                    const Expanded(child: Text('Taille de bulle')),
                    Text('${((status?.sizeScale ?? 1) * 100).round()}%'),
                  ],
                ),
                Slider(
                  value: status?.sizeScale ?? AppSliders.overlayDefaultSize,
                  min: AppSliders.overlayBubbleSizeMin,
                  max: AppSliders.overlayBubbleSizeMax,
                  divisions: AppSliders.overlaySizeDivisions,
                  semanticFormatterCallback: (value) =>
                      'Taille de bulle ${(value * 100).round()} pourcentage',
                  onChanged: busy
                      ? null
                      : (value) => onAppearanceChanged(
                          sizeScale: value,
                          opacity:
                              status?.opacity ??
                              AppSliders.overlayDefaultOpacity,
                        ),
                ),
                Row(
                  children: [
                    const Expanded(child: Text('Opacité de bulle')),
                    Text(
                      '${((status?.opacity ?? AppSliders.overlayDefaultOpacity) * 100).round()}%',
                    ),
                  ],
                ),
                Slider(
                  value: status?.opacity ?? AppSliders.overlayDefaultOpacity,
                  min: AppSliders.overlayBubbleOpacityMin,
                  max: AppSliders.overlayBubbleOpacityMax,
                  divisions: AppSliders.overlayOpacityDivisions,
                  semanticFormatterCallback: (value) =>
                      'Opacité de bulle ${(value * 100).round()} pourcentage',
                  onChanged: busy
                      ? null
                      : (value) => onAppearanceChanged(
                          sizeScale:
                              status?.sizeScale ??
                              AppSliders.overlayDefaultSize,
                          opacity: value,
                        ),
                ),
              ],
            ),
          ),
          Padding(
            padding: AppInsets.keyboardPrivacy,
            child: AppActionRail(
              spacing: AppSpacing.x1,
              minActionWidth: AppLayoutMetrics.actionRailMinWidthLarge,
              children: [
                OutlinedButton.icon(
                  onPressed: onOpenOverlaySettings,
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Permission overlay'),
                ),
                OutlinedButton.icon(
                  onPressed: onOpenAccessibilitySettings,
                  icon: const Icon(Icons.accessibility_new),
                  label: const Text('Paramètres d’accessibilité'),
                ),
              ],
            ),
          ),
          Padding(
            padding: AppInsets.overlayControls,
            child: AppActionRail(
              spacing: AppSpacing.x1,
              minActionWidth: AppLayoutMetrics.actionRailMinWidthSmall,
              children: [
                FilledButton(
                  onPressed: busy ? null : onStart,
                  child: const Text('Démarrer'),
                ),
                OutlinedButton(
                  onPressed: busy ? null : onStop,
                  child: const Text('Arrêter'),
                ),
                TextButton(
                  onPressed: busy ? null : onCancel,
                  child: const Text('Annuler'),
                ),
              ],
            ),
          ),
          ExpansionTile(
            tilePadding: const EdgeInsets.symmetric(horizontal: AppSpacing.x1),
            childrenPadding: AppInsets.keyboardPrivacy,
            title: const Text('Diagnostics avancés'),
            subtitle: const Text('État du service natif et dernier événement.'),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: SelectableText(
                  'enabled=${status?.enabled ?? false} | '
                  'requested=${status?.requestedEnabled ?? false} | '
                  'running=${status?.running ?? false} | '
                  'service=${status?.serviceState ?? 'unknown'} | '
                  'delivery=${status?.deliveryMode.name ?? 'clipboardOnly'}',
                ),
              ),
              if ((status?.lastNativeEvent ?? 'none') != 'none') ...[
                AppGaps.x2,
                Align(
                  alignment: Alignment.centerLeft,
                  child: SelectableText(status?.lastNativeEvent ?? 'none'),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
