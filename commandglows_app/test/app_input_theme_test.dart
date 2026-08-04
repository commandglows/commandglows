import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:commandglows_app/core/theme/app_theme.dart';

void main() {
  testWidgets('text inputs keep a readable minimum height', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: Center(
            child: SizedBox(
              width: 260,
              child: TextField(
                decoration: InputDecoration(labelText: 'Déclencheur'),
              ),
            ),
          ),
        ),
      ),
    );

    expect(
      tester.getSize(find.byType(TextField)).height,
      greaterThanOrEqualTo(AppInputMetrics.minHeight),
    );
  });

  testWidgets('dropdown inputs keep a readable minimum height', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 260,
              child: DropdownButtonFormField<String>(
                initialValue: 'manual',
                decoration: const InputDecoration(labelText: 'Source'),
                items: const [
                  DropdownMenuItem(value: 'manual', child: Text('Manuel')),
                  DropdownMenuItem(value: 'system', child: Text('Système')),
                ],
                onChanged: (_) {},
              ),
            ),
          ),
        ),
      ),
    );

    expect(
      tester.getSize(find.byType(DropdownButtonFormField<String>)).height,
      greaterThanOrEqualTo(AppInputMetrics.minHeight),
    );
  });

  testWidgets('text inputs keep harmonized height with or without icons', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: Center(
            child: SizedBox(
              width: 260,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    key: Key('plain-input'),
                    decoration: InputDecoration(labelText: 'Email'),
                  ),
                  AppGaps.x2,
                  TextField(
                    key: Key('icon-input'),
                    decoration: InputDecoration(
                      labelText: 'Recherche',
                      prefixIcon: Icon(Icons.search),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    expect(
      tester.getSize(find.byKey(const Key('plain-input'))).height,
      tester.getSize(find.byKey(const Key('icon-input'))).height,
    );
  });
}
