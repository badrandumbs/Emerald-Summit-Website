import 'package:emerald_summit/widgets/floating_tab_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _tabs = [
  FloatingTab(
    icon: Icon(Icons.home),
    selectedIcon: Icon(Icons.home),
    label: 'Home',
  ),
  FloatingTab(
    icon: Icon(Icons.event),
    selectedIcon: Icon(Icons.event),
    label: 'Schedule',
  ),
  FloatingTab(
    icon: Icon(Icons.explore),
    selectedIcon: Icon(Icons.explore),
    label: 'Discover',
  ),
  FloatingTab(
    icon: Icon(Icons.campaign),
    selectedIcon: Icon(Icons.campaign),
    label: 'News',
  ),
  FloatingTab(
    icon: Icon(Icons.face),
    selectedIcon: Icon(Icons.face),
    label: 'Ask Archie',
  ),
];

void main() {
  Future<void> pumpBar(
    WidgetTester t, {
    double width = 402,
    double scale = 1,
  }) async {
    t.view.physicalSize = Size(width * 3, 874 * 3);
    t.view.devicePixelRatio = 3;
    addTearDown(t.view.reset);
    var selected = 0;
    await t.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(
            size: Size(width, 874),
            textScaler: TextScaler.linear(scale),
            viewPadding: const EdgeInsets.only(bottom: 34),
            padding: const EdgeInsets.only(bottom: 34),
          ),
          child: StatefulBuilder(
            builder: (context, setState) => Scaffold(
              extendBody: true,
              body: const SizedBox.expand(),
              bottomNavigationBar: FloatingTabBar(
                tabs: _tabs,
                selectedIndex: selected,
                onSelected: (i) => setState(() => selected = i),
              ),
            ),
          ),
        ),
      ),
    );
  }

  for (final (width, scale) in [(402.0, 1.0), (375.0, 1.0), (375.0, 1.3)]) {
    testWidgets('every label fits on one line at ${width}pt, ${scale}x text', (
      t,
    ) async {
      await pumpBar(t, width: width, scale: scale);
      expect(t.takeException(), isNull);
      final heights = {
        for (final tab in _tabs) t.getSize(find.text(tab.label)).height,
      };
      // One line each: all the same height.
      expect(heights.length, 1);
    });
  }

  testWidgets('floats above the bottom edge, inset from the sides', (t) async {
    await pumpBar(t);
    final capsule = t.getRect(find.byType(Material).last);
    expect(capsule.left, FloatingTabBar.sideMargin);
    expect(capsule.right, 402 - FloatingTabBar.sideMargin);
    expect(capsule.bottom, lessThan(874 - 20));
  });

  testWidgets('tapping a tab selects it', (t) async {
    await pumpBar(t);
    await t.tap(find.text('Discover'));
    await t.pumpAndSettle();
    expect(
      t.getSemantics(find.text('Discover')),
      isSemantics(isSelected: true, isButton: true),
    );
  });
}
