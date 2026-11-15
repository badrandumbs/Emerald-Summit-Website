import 'package:emerald_summit/widgets/scroll_aware_bottom_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class _Host extends StatefulWidget {
  const _Host();

  @override
  State<_Host> createState() => _HostState();
}

class _HostState extends State<_Host> with SingleTickerProviderStateMixin {
  late final bar = ScrollAwareBottomBarController(vsync: this);

  @override
  void dispose() {
    bar.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    extendBody: true,
    body: NotificationListener<ScrollNotification>(
      onNotification: bar.handle,
      child: ListView(
        children: [
          for (var i = 0; i < 80; i++)
            SizedBox(height: 60, child: Text('Row $i')),
        ],
      ),
    ),
    bottomNavigationBar: ScrollAwareBottomBar(
      controller: bar,
      child: const SizedBox(key: Key('bar'), height: 80),
    ),
  );
}

void main() {
  // The test screen is 600 tall and the bar 80, so a shown bar's top is at
  // 520 and a hidden one is pushed past the bottom edge. Report 80 for shown
  // and 0 for hidden.
  double barHeight(WidgetTester t) {
    final top = t.getTopLeft(find.byKey(const Key('bar'))).dy;
    if (top == 520) return 80;
    if (top >= 600) return 0;
    return -1; // mid-slide
  }

  Future<void> pumpHost(WidgetTester t) async {
    await t.pumpWidget(const MaterialApp(home: _Host()));
    expect(barHeight(t), 80);
  }

  testWidgets('hides when scrolling down', (t) async {
    await pumpHost(t);
    await t.drag(find.byType(ListView), const Offset(0, -300));
    await t.pumpAndSettle();
    expect(barHeight(t), 0);
  });

  testWidgets('a tiny scroll down leaves it alone', (t) async {
    await pumpHost(t);
    // Get off the top first, then show the bar again.
    await t.drag(find.byType(ListView), const Offset(0, -300));
    await t.pumpAndSettle();
    await t.drag(find.byType(ListView), const Offset(0, 120));
    await t.pumpAndSettle();
    expect(barHeight(t), 80);

    final gesture = await t.startGesture(t.getCenter(find.byType(ListView)));
    await gesture.moveBy(const Offset(0, -10));
    await t.pump();
    await gesture.moveBy(const Offset(0, -10));
    await t.pump();
    await t.pumpAndSettle();
    expect(barHeight(t), 80);
    await gesture.up();
  });

  testWidgets('comes back after scrolling up far enough', (t) async {
    await pumpHost(t);
    await t.drag(find.byType(ListView), const Offset(0, -1200));
    await t.pumpAndSettle();
    expect(barHeight(t), 0);

    // A slow, short nudge up (50 px/s) isn't enough...
    var ms = 0;
    final gesture = await t.startGesture(t.getCenter(find.byType(ListView)));
    for (var i = 0; i < 8; i++) {
      ms += 100;
      await gesture.moveBy(
        const Offset(0, 5),
        timeStamp: Duration(milliseconds: ms),
      );
      await t.pump(const Duration(milliseconds: 100));
    }
    await t.pumpAndSettle();
    expect(barHeight(t), 0);

    // ...but keep going and it returns.
    for (var i = 0; i < 16; i++) {
      ms += 100;
      await gesture.moveBy(
        const Offset(0, 5),
        timeStamp: Duration(milliseconds: ms),
      );
      await t.pump(const Duration(milliseconds: 100));
    }
    await gesture.up();
    await t.pumpAndSettle();
    expect(barHeight(t), 80);
  });

  testWidgets('a quick flick up brings it right back', (t) async {
    await pumpHost(t);
    await t.drag(find.byType(ListView), const Offset(0, -1200));
    await t.pumpAndSettle();
    expect(barHeight(t), 0);

    final gesture = await t.startGesture(t.getCenter(find.byType(ListView)));
    var ms = 0;
    // Past the touch slop, then ~20 px in 16 ms (well over 700 px/s).
    for (var i = 0; i < 3; i++) {
      ms += 16;
      await gesture.moveBy(
        const Offset(0, 10),
        timeStamp: Duration(milliseconds: ms),
      );
      await t.pump(const Duration(milliseconds: 16));
    }
    await t.pumpAndSettle();
    expect(barHeight(t), 80);
    await gesture.up();
  });

  testWidgets('back at the top it always shows', (t) async {
    await pumpHost(t);
    await t.drag(find.byType(ListView), const Offset(0, -300));
    await t.pumpAndSettle();
    expect(barHeight(t), 0);
    await t.drag(find.byType(ListView), const Offset(0, 2000));
    await t.pumpAndSettle();
    expect(barHeight(t), 80);
  });
}
