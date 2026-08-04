import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';
import 'package:commandglows_app/core/widgets/app_components.dart';

void main() {
  testWidgets('shared search field and sync action stay independently usable', (
    tester,
  ) async {
    var query = 'alpha';
    var refreshCalls = 0;
    final controller = TextEditingController(text: query);
    addTearDown(controller.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: AppPageToolbar(
              searchField: AppSearchField(
                controller: controller,
                query: query,
                scopeLabel: 'Global',
                onChanged: (value) => query = value,
                onClear: () {
                  controller.clear();
                  query = '';
                },
              ),
              syncAction: AppSyncStatusAction(
                status: const AppSyncStatus(kind: AppSyncStatusKind.synced),
                onPressed: () => refreshCalls += 1,
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('app-search-field')), findsOneWidget);
    expect(find.text('Synchronisé'), findsOneWidget);

    await tester.tap(find.byTooltip('Effacer'));
    await tester.pump();
    expect(query, isEmpty);
    expect(controller.text, isEmpty);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Synchronisé'));
    await tester.pump();
    expect(refreshCalls, 1);
  });

  testWidgets('sync status action exposes busy and error states', (
    tester,
  ) async {
    var retryCalls = 0;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Column(
            children: [
              AppSyncStatusAction(
                status: const AppSyncStatus(
                  kind: AppSyncStatusKind.saving,
                  message: 'Sauvegarde en cours',
                ),
                onPressed: () => retryCalls += 1,
              ),
              AppSyncStatusAction(
                status: const AppSyncStatus(
                  kind: AppSyncStatusKind.error,
                  message: 'Réessaie',
                ),
                onPressed: () => retryCalls += 1,
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Enregistrement'), findsOneWidget);
    expect(find.text('Échec'), findsOneWidget);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Enregistrement'));
    await tester.pump();
    expect(retryCalls, 0);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Échec'));
    await tester.pump();
    expect(retryCalls, 1);
  });

  testWidgets('product page scaffold renders the shared page grammar', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: ProductPageScaffold(
            summary: const ProductSummaryStrip(
              children: [
                AppLocalModeStatusPill(),
                AppMetricPill(
                  icon: Icons.inventory_2_outlined,
                  label: '2',
                  value: 'items',
                ),
              ],
            ),
            primaryAction: const AppSectionCard(
              title: 'Action principale',
              child: Text('Créer'),
            ),
            listToolbar: const AppPageToolbar(
              syncAction: AppSyncStatusAction(
                status: AppSyncStatus(kind: AppSyncStatusKind.idle),
                onPressed: null,
              ),
            ),
            results: const [Text('Résultat')],
          ),
        ),
      ),
    );

    expect(find.byType(ProductPageScaffold), findsOneWidget);
    expect(find.byType(ProductSummaryStrip), findsOneWidget);
    expect(find.text('Mode local'), findsOneWidget);
    expect(find.text('Action principale'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Actualiser'), findsOneWidget);
    expect(find.text('Résultat'), findsOneWidget);
  });
}
