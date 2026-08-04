import 'package:flutter/material.dart';

import '../bootstrap/firebase_bootstrap.dart';
import '../theme/app_theme.dart';

class AppSectionCard extends StatelessWidget {
  const AppSectionCard({
    super.key,
    this.title,
    this.subtitle,
    this.leading,
    required this.child,
    this.padding = AppInsets.card,
    this.stretch = true,
  });

  final String? title;
  final String? subtitle;
  final Widget? leading;
  final Widget child;
  final EdgeInsetsGeometry padding;
  final bool stretch;

  @override
  Widget build(BuildContext context) {
    final hasHeader = title != null || subtitle != null || leading != null;
    final header = hasHeader
        ? _AppSectionHeader(title: title, subtitle: subtitle, leading: leading)
        : null;

    return Card(
      child: Padding(
        padding: padding,
        child: Column(
          crossAxisAlignment: stretch
              ? CrossAxisAlignment.stretch
              : CrossAxisAlignment.start,
          children: [
            if (header != null) ...[
              header,
              SizedBox(height: AppSectionMetrics.headerContentGap),
            ],
            child,
          ],
        ),
      ),
    );
  }
}

class _AppSectionHeader extends StatelessWidget {
  const _AppSectionHeader({this.title, this.subtitle, this.leading});

  final String? title;
  final String? subtitle;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final textColumn = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null)
          Text(title!, style: Theme.of(context).textTheme.titleSmall),
        if (subtitle != null) ...[
          AppGaps.x1,
          Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
        ],
      ],
    );

    if (leading == null) {
      return textColumn;
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        leading!,
        AppGaps.horizontalX3,
        Expanded(child: textColumn),
      ],
    );
  }
}

class AppFormActions extends StatelessWidget {
  const AppFormActions({
    super.key,
    required this.primaryLabel,
    required this.onPrimary,
    this.primaryIcon = Icons.add,
    this.secondaryLabel = 'Rafraîchir',
    this.onSecondary,
  });

  final String primaryLabel;
  final VoidCallback? onPrimary;
  final IconData primaryIcon;
  final String secondaryLabel;
  final VoidCallback? onSecondary;

  @override
  Widget build(BuildContext context) {
    final primaryStyle = FilledButton.styleFrom(
      minimumSize: const Size(0, AppButtonMetrics.minHeight),
    );
    final secondaryStyle = OutlinedButton.styleFrom(
      minimumSize: const Size(0, AppButtonMetrics.minHeight),
    );
    return AppActionRail(
      children: [
        FilledButton.icon(
          style: primaryStyle,
          onPressed: onPrimary,
          icon: Icon(primaryIcon),
          label: Text(primaryLabel),
        ),
        if (onSecondary != null)
          OutlinedButton(
            style: secondaryStyle,
            onPressed: onSecondary,
            child: Text(secondaryLabel),
          ),
      ],
    );
  }
}

class AppActionRail extends StatelessWidget {
  const AppActionRail({
    super.key,
    required this.children,
    this.minActionWidth = 160,
    this.spacing = AppSpacing.x2,
  });

  final List<Widget> children;
  final double minActionWidth;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) {
      return const SizedBox.shrink();
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : minActionWidth;
        final maxColumns = (maxWidth / (minActionWidth + spacing))
            .floor()
            .clamp(1, children.length)
            .toInt();
        final columns = maxColumns == 0 ? 1 : maxColumns;
        final itemWidth = columns == 1
            ? maxWidth
            : (maxWidth - spacing * (columns - 1)) / columns;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: children
              .map((child) {
                return SizedBox(width: itemWidth, child: child);
              })
              .toList(growable: false),
        );
      },
    );
  }
}

enum AppSyncStatusKind {
  idle,
  loading,
  saving,
  syncing,
  saved,
  synced,
  pending,
  localOnly,
  error,
  conflict,
}

class AppSyncStatus {
  const AppSyncStatus({required this.kind, this.message, this.timestamp});

  final AppSyncStatusKind kind;
  final String? message;
  final DateTime? timestamp;

  bool get isBusy =>
      kind == AppSyncStatusKind.loading ||
      kind == AppSyncStatusKind.saving ||
      kind == AppSyncStatusKind.syncing;

  bool get isError => kind == AppSyncStatusKind.error;

  IconData get icon => switch (kind) {
    AppSyncStatusKind.idle => Icons.touch_app_outlined,
    AppSyncStatusKind.loading => Icons.refresh,
    AppSyncStatusKind.saving => Icons.save_outlined,
    AppSyncStatusKind.syncing => Icons.sync,
    AppSyncStatusKind.saved => Icons.check_circle_outline,
    AppSyncStatusKind.synced => Icons.cloud_done_outlined,
    AppSyncStatusKind.pending => Icons.schedule_send_outlined,
    AppSyncStatusKind.localOnly => Icons.cloud_off_outlined,
    AppSyncStatusKind.error => Icons.error_outline,
    AppSyncStatusKind.conflict => Icons.warning_amber_outlined,
  };

  String statusLabel([String? fallback]) => switch (kind) {
    AppSyncStatusKind.idle => fallback ?? 'Actualiser',
    AppSyncStatusKind.loading => 'Actualisation',
    AppSyncStatusKind.saving => 'Enregistrement',
    AppSyncStatusKind.syncing => 'Synchronisation',
    AppSyncStatusKind.saved => 'Enregistré',
    AppSyncStatusKind.synced => 'Synchronisé',
    AppSyncStatusKind.pending => 'En attente',
    AppSyncStatusKind.localOnly => 'Local uniquement',
    AppSyncStatusKind.error => 'Échec',
    AppSyncStatusKind.conflict => 'Conflit',
  };

  Color semanticColor(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return switch (kind) {
      AppSyncStatusKind.synced => colorScheme.tertiary,
      AppSyncStatusKind.saved => colorScheme.primary,
      AppSyncStatusKind.loading ||
      AppSyncStatusKind.saving => colorScheme.secondary,
      AppSyncStatusKind.syncing => colorScheme.secondary,
      AppSyncStatusKind.pending => AppColors.warning,
      AppSyncStatusKind.localOnly => AppColors.info,
      AppSyncStatusKind.error ||
      AppSyncStatusKind.conflict => colorScheme.error,
      AppSyncStatusKind.idle => colorScheme.outline,
    };
  }

  String semanticsLabel(BuildContext context) {
    final action = statusLabel();
    if (message == null || message!.isEmpty) {
      return action;
    }
    return '$action: ${message!}';
  }
}

class AppSearchField extends StatelessWidget {
  const AppSearchField({
    super.key,
    required this.query,
    required this.onChanged,
    this.controller,
    this.hintText = 'Rechercher',
    this.scopeLabel,
    this.enabled = true,
    this.onClear,
    this.onSubmit,
  });

  final TextEditingController? controller;
  final String query;
  final bool enabled;
  final String hintText;
  final String? scopeLabel;
  final ValueChanged<String> onChanged;
  final VoidCallback? onClear;
  final ValueChanged<String>? onSubmit;

  @override
  Widget build(BuildContext context) {
    final trimmedScope = scopeLabel?.trim() ?? '';
    final label = trimmedScope.isEmpty ? hintText : '$hintText • $trimmedScope';
    final canClear = enabled && query.isNotEmpty;

    return Semantics(
      textField: true,
      label: label,
      child: TextField(
        key: const Key('app-search-field'),
        controller: controller,
        enabled: enabled,
        onChanged: onChanged,
        onSubmitted: onSubmit,
        decoration: InputDecoration(
          hintText: label,
          labelText: 'Recherche',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: canClear
              ? IconButton(
                  tooltip: 'Effacer',
                  onPressed: onClear,
                  icon: const Icon(Icons.close),
                )
              : null,
        ),
      ),
    );
  }
}

class AppSyncStatusAction extends StatelessWidget {
  const AppSyncStatusAction({
    super.key,
    required this.status,
    required this.onPressed,
    this.disabled = false,
    this.scopeLabel,
    this.compact = false,
  });

  final AppSyncStatus status;
  final VoidCallback? onPressed;
  final bool disabled;
  final String? scopeLabel;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = status.semanticColor(context);
    final canTrigger = !disabled && !status.isBusy && onPressed != null;
    final suffix = status.timestamp == null
        ? null
        : Text(
            ' ${_shortTime(status.timestamp!, context)}',
            style: theme.textTheme.labelSmall,
          );
    final label = status.statusLabel();
    final tooltipScope = scopeLabel?.trim();
    final tooltip = [
      if (tooltipScope != null && tooltipScope.isNotEmpty) tooltipScope,
      status.message ?? label,
    ].join(' · ');

    final buttonChild = compact
        ? Icon(status.icon, semanticLabel: status.semanticsLabel(context))
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              status.isBusy
                  ? const SizedBox.square(
                      dimension: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(status.icon),
              if (!compact) ...[AppGaps.horizontalX2, Text(label)],
              if (suffix != null) ...[AppGaps.horizontalX2, suffix],
            ],
          );

    return Semantics(
      label: status.semanticsLabel(context),
      button: true,
      child: Tooltip(
        message: tooltip,
        child: OutlinedButton(
          onPressed: canTrigger ? onPressed : null,
          style: OutlinedButton.styleFrom(foregroundColor: color),
          child: buttonChild,
        ),
      ),
    );
  }
}

class AppPageToolbar extends StatelessWidget {
  const AppPageToolbar({super.key, this.searchField, this.syncAction});

  final Widget? searchField;
  final Widget? syncAction;

  @override
  Widget build(BuildContext context) {
    if (searchField == null && syncAction == null) {
      return const SizedBox.shrink();
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final useColumn = constraints.maxWidth < 330;
        if (useColumn) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (searchField case final Widget searchFieldWidget)
                searchFieldWidget,
              if (syncAction case final Widget syncActionWidget)
                Padding(
                  padding: EdgeInsets.only(
                    top: searchField == null ? 0 : AppSpacing.x2,
                  ),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: syncActionWidget,
                  ),
                ),
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (searchField case final Widget searchFieldWidget)
              Expanded(child: searchFieldWidget),
            if (syncAction case final Widget syncActionWidget) ...[
              AppGaps.horizontalX2,
              syncActionWidget,
            ],
          ],
        );
      },
    );
  }
}

class AppPageHeroCard extends StatelessWidget {
  const AppPageHeroCard({
    super.key,
    required this.title,
    required this.subtitle,
    this.leadingIcon,
    this.trailing,
    this.searchField,
    this.syncAction,
    this.metrics = const <Widget>[],
    this.footer,
  });

  final String title;
  final String subtitle;
  final IconData? leadingIcon;
  final Widget? trailing;
  final Widget? searchField;
  final Widget? syncAction;
  final List<Widget> metrics;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              colorScheme.surfaceContainerHighest.withValues(alpha: 0.78),
              colorScheme.surfaceContainer.withValues(alpha: 0.96),
            ],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.x4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (leadingIcon != null) ...[
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.x2),
                      decoration: BoxDecoration(
                        color: colorScheme.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(AppRadii.lg),
                        border: Border.all(
                          color: colorScheme.primary.withValues(alpha: 0.16),
                        ),
                      ),
                      child: Icon(leadingIcon, color: colorScheme.primary),
                    ),
                    AppGaps.horizontalX3,
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: theme.textTheme.headlineSmall),
                        AppGaps.x1,
                        Text(subtitle, style: theme.textTheme.bodyMedium),
                      ],
                    ),
                  ),
                  if (trailing != null) ...[AppGaps.horizontalX2, trailing!],
                ],
              ),
              if (searchField != null || syncAction != null) ...[
                AppGaps.x3,
                AppPageToolbar(
                  searchField: searchField,
                  syncAction: syncAction,
                ),
              ],
              if (metrics.isNotEmpty) ...[
                AppGaps.x3,
                Wrap(
                  spacing: AppSpacing.x2,
                  runSpacing: AppSpacing.x2,
                  children: metrics,
                ),
              ],
              if (footer != null) ...[AppGaps.x3, footer!],
            ],
          ),
        ),
      ),
    );
  }
}

class ProductPageScaffold extends StatelessWidget {
  const ProductPageScaffold({
    super.key,
    required this.summary,
    required this.primaryAction,
    required this.listToolbar,
    required this.results,
    this.busy = false,
    this.message,
    this.messageBuilder,
  });

  final Widget summary;
  final Widget primaryAction;
  final Widget listToolbar;
  final List<Widget> results;
  final bool busy;
  final String? message;
  final Widget Function(BuildContext context, String message)? messageBuilder;

  @override
  Widget build(BuildContext context) {
    final message = this.message;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        summary,
        AppGaps.x2,
        primaryAction,
        if (busy)
          const Padding(
            padding: AppInsets.progress,
            child: LinearProgressIndicator(),
          ),
        if (message != null)
          Padding(
            padding: AppInsets.message,
            child: messageBuilder?.call(context, message) ?? Text(message),
          ),
        AppGaps.x2,
        listToolbar,
        AppGaps.x2,
        ...results,
      ],
    );
  }
}

class ProductSummaryStrip extends StatelessWidget {
  const ProductSummaryStrip({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final visibleChildren = children
        .where((child) {
          return !(child is AppLocalModeStatusPill &&
              FirebaseBootstrap.isConfigured);
        })
        .toList(growable: false);
    if (visibleChildren.isEmpty) {
      return const SizedBox.shrink();
    }
    return Card(
      child: Padding(
        padding: AppInsets.compactCard,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var index = 0; index < visibleChildren.length; index++) ...[
              if (index > 0) AppGaps.horizontalX2,
              Expanded(child: visibleChildren[index]),
            ],
          ],
        ),
      ),
    );
  }
}

class AppMetricPill extends StatelessWidget {
  const AppMetricPill({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveColor = color ?? colorScheme.primary;
    return Container(
      constraints: const BoxConstraints(minWidth: 0),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.x3,
        vertical: AppSpacing.x2,
      ),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: effectiveColor, size: 18),
          AppGaps.horizontalX2,
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class AppStatusPill extends StatelessWidget {
  const AppStatusPill({
    super.key,
    required this.status,
    this.label,
    this.value,
  });

  final AppSyncStatus status;
  final String? label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    return AppMetricPill(
      icon: status.icon,
      label: label ?? status.statusLabel('Prêt'),
      value: value ?? 'statut',
      color: status.semanticColor(context),
    );
  }
}

class AppLocalModeStatusPill extends StatelessWidget {
  const AppLocalModeStatusPill({super.key});

  @override
  Widget build(BuildContext context) {
    if (FirebaseBootstrap.isConfigured) {
      return const SizedBox.shrink();
    }
    return const AppMetricPill(
      icon: Icons.storage_outlined,
      label: 'Mode local',
      value: 'compte non configuré',
    );
  }
}

class AppEntityListHeader extends StatelessWidget {
  const AppEntityListHeader({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(title, style: Theme.of(context).textTheme.titleSmall);
  }
}

String _shortTime(DateTime timestamp, BuildContext context) {
  final hour = timestamp.hour.toString().padLeft(2, '0');
  final minute = timestamp.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}

class AppEmptyStateCard extends StatelessWidget {
  const AppEmptyStateCard({
    super.key,
    required this.message,
    this.title,
    this.example,
    this.actionLabel,
    this.onAction,
  });

  final String message;
  final String? title;
  final String? example;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: AppInsets.compactCard,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (title != null) ...[
              Text(title!, style: Theme.of(context).textTheme.titleSmall),
              AppGaps.x2,
            ],
            Text(message, style: Theme.of(context).textTheme.bodyMedium),
            if (example != null) ...[
              AppGaps.x1,
              Text(example!, style: Theme.of(context).textTheme.bodySmall),
            ],
            if (onAction != null && actionLabel != null) ...[
              AppGaps.x2,
              Align(
                alignment: Alignment.centerLeft,
                child: FilledButton(
                  onPressed: onAction,
                  child: Text(actionLabel!),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class AppEntityListTile extends StatelessWidget {
  const AppEntityListTile({
    super.key,
    required this.title,
    this.subtitle,
    this.isThreeLine = false,
    this.actions = const [],
  });

  final Widget title;
  final Widget? subtitle;
  final bool isThreeLine;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return AppEntityCard(
      title: title,
      subtitle: subtitle,
      actions: actions,
      bodyMaxLines: isThreeLine ? 3 : 2,
    );
  }
}

class AppEntityCard extends StatelessWidget {
  const AppEntityCard({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.tags = const [],
    this.notice,
    this.actions = const [],
    this.bodyMaxLines,
  });

  final Widget title;
  final Widget? subtitle;
  final Widget? leading;
  final List<Widget> tags;
  final Widget? notice;
  final List<Widget> actions;
  final int? bodyMaxLines;

  @override
  Widget build(BuildContext context) {
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DefaultTextStyle.merge(
          style: Theme.of(context).textTheme.bodyLarge,
          maxLines: bodyMaxLines,
          overflow: TextOverflow.ellipsis,
          child: title,
        ),
        if (subtitle != null) ...[
          AppGaps.x1,
          DefaultTextStyle.merge(
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            maxLines: bodyMaxLines,
            overflow: TextOverflow.ellipsis,
            child: subtitle!,
          ),
        ],
      ],
    );

    return Card(
      child: Padding(
        padding: AppInsets.compactCard,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (leading == null)
              content
            else
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.x1 / 2),
                    child: leading!,
                  ),
                  AppGaps.horizontalX2,
                  Expanded(child: content),
                ],
              ),
            if (tags.isNotEmpty) ...[
              AppGaps.x2,
              Wrap(
                spacing: AppSpacing.x2,
                runSpacing: AppSpacing.x1,
                children: tags,
              ),
            ],
            if (notice != null) ...[AppGaps.x2, notice!],
            if (actions.isNotEmpty) ...[
              AppGaps.x2,
              IconButtonTheme(
                data: IconButtonThemeData(
                  style: IconButton.styleFrom(
                    minimumSize: const Size.square(AppIconMetrics.minTarget),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.x2,
                      vertical: AppSpacing.x1,
                    ),
                  ),
                ),
                child: AppActionRail(minActionWidth: 48, children: actions),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class AppStatusCard extends StatelessWidget {
  const AppStatusCard({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        dense: true,
        minVerticalPadding: AppSpacing.x1,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x2,
          vertical: AppSpacing.x1,
        ),
        minLeadingWidth: AppIconMetrics.sm,
        visualDensity: VisualDensity.compact,
        title: Text(title),
        subtitle: subtitle == null ? null : Text(subtitle!),
        trailing: trailing,
        onTap: onTap,
      ),
    );
  }
}

class AppBannerCard extends StatelessWidget {
  const AppBannerCard({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.action,
    this.accentColor,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;
  final Color? accentColor;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveAccent = accentColor ?? colorScheme.primary;
    return Card(
      child: Padding(
        padding: AppInsets.compactCard,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: effectiveAccent),
            AppGaps.horizontalX3,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleSmall),
                  AppGaps.x1,
                  Text(message, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            if (action != null) ...[AppGaps.horizontalX2, action!],
          ],
        ),
      ),
    );
  }
}

class AppNotificationCard extends StatelessWidget {
  const AppNotificationCard({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.primaryAction,
    this.secondaryAction,
    this.onDismiss,
    this.accentColor,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? primaryAction;
  final Widget? secondaryAction;
  final VoidCallback? onDismiss;
  final Color? accentColor;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveAccent = accentColor ?? colorScheme.primary;
    final actionWidgets = <Widget>[];
    if (secondaryAction != null) {
      actionWidgets.add(secondaryAction!);
    }
    if (primaryAction != null) {
      if (actionWidgets.isNotEmpty) {
        actionWidgets.add(AppGaps.horizontalX2);
      }
      actionWidgets.add(primaryAction!);
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLowest.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: AppInsets.compactCard,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, size: AppIconMetrics.sm, color: effectiveAccent),
                AppGaps.horizontalX3,
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: colorScheme.onSurface,
                        ),
                      ),
                      AppGaps.x1,
                      Text(
                        message,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                if (onDismiss != null)
                  IconButton(
                    onPressed: onDismiss,
                    tooltip: 'Masquer cette notification',
                    icon: const Icon(Icons.close_outlined),
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            if (actionWidgets.isNotEmpty) ...[
              AppGaps.x2,
              Wrap(
                spacing: AppSpacing.x2,
                runSpacing: AppSpacing.x1,
                alignment: WrapAlignment.end,
                children: actionWidgets,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class AppTag extends StatelessWidget {
  const AppTag({
    super.key,
    required this.label,
    this.color,
    this.backgroundColor,
  });

  final String label;
  final Color? color;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final foreground = color ?? colorScheme.onSurfaceVariant;
    final background = backgroundColor ?? colorScheme.surfaceContainerHighest;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x2 + AppSpacing.x1 / 2,
          vertical: AppSpacing.x1,
        ),
        child: Text(
          label,
          style: Theme.of(
            context,
          ).textTheme.labelSmall?.copyWith(color: foreground),
        ),
      ),
    );
  }
}

class AppModalCard extends StatelessWidget {
  const AppModalCard({
    super.key,
    required this.child,
    this.padding = AppInsets.card,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: AppElevation.overlay,
      shadowColor: AppColors.black.withValues(alpha: 0.16),
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: padding, child: child),
    );
  }
}

class AppFieldRow extends StatelessWidget {
  const AppFieldRow({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var index = 0; index < children.length; index++) ...[
          if (index > 0) AppGaps.horizontalX2,
          Expanded(child: children[index]),
        ],
      ],
    );
  }
}
