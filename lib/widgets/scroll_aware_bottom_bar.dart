import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

/// Slides the bottom bar away while the user scrolls down and brings it back
/// when they scroll up, the way Uber's tab bar behaves.
///
/// Put [listener] around the tabs' content so it hears their scrolls, and
/// [bar] in the Scaffold's `bottomNavigationBar` slot. The bar shrinks out of
/// that slot (rather than floating over the page), so nothing on a tab ever
/// sits under it.
class ScrollAwareBottomBarController {
  ScrollAwareBottomBarController({required TickerProvider vsync})
    : _anim = AnimationController(
        vsync: vsync,
        value: 1,
        duration: const Duration(milliseconds: 260),
        reverseDuration: const Duration(milliseconds: 220),
      );

  final AnimationController _anim;

  /// 1 = fully shown, 0 = fully hidden, eased.
  late final CurvedAnimation visibility = CurvedAnimation(
    parent: _anim,
    curve: Curves.easeOutCubic,
    reverseCurve: Curves.easeInCubic,
  );

  /// Downward travel (px) before the bar hides. Small, so it gets out of the
  /// way as soon as someone starts reading down the page.
  static const double hideAfter = 24;

  /// Upward travel (px) that brings the bar back on a slow scroll.
  static const double showAfter = 64;

  /// A quick flick up brings it back after only [fastShowAfter] px.
  static const double fastShowAfter = 12;
  static const double fastSpeed = 700; // px per second

  /// Within this distance of the top, the bar is always shown.
  static const double topSlack = 8;

  bool _enabled = true;
  bool _reduceMotion = false;

  // Travel in the current direction, and when that run started.
  double _run = 0;
  Duration? _runStart;

  bool get isShown =>
      _anim.status == AnimationStatus.forward ||
      _anim.status == AnimationStatus.completed;

  /// Turns hiding off (for a tab where the bar should stay put) and shows it.
  set enabled(bool value) {
    _enabled = value;
    if (!value) show();
  }

  set reduceMotion(bool value) => _reduceMotion = value;

  void show() {
    _resetRun();
    if (isShown) return;
    _reduceMotion ? _anim.value = 1 : _anim.forward();
  }

  void hide() {
    _resetRun();
    if (!isShown) return;
    _reduceMotion ? _anim.value = 0 : _anim.reverse();
  }

  void _resetRun() {
    _run = 0;
    _runStart = null;
  }

  /// Feeds a scroll notification from a tab. Always returns false so the
  /// notification keeps bubbling.
  bool handle(ScrollNotification n) {
    if (!_enabled || n.metrics.axis != Axis.vertical) return false;
    final m = n.metrics;

    if (m.pixels <= m.minScrollExtent + topSlack) {
      show();
      return false;
    }

    if (n is UserScrollNotification && n.direction == ScrollDirection.idle) {
      _resetRun();
      return false;
    }

    if (n is! ScrollUpdateNotification) return false;
    final delta = n.scrollDelta ?? 0;
    if (delta == 0) return false;
    // Rubber-banding past the bottom isn't a change of direction.
    if (m.pixels > m.maxScrollExtent) return false;

    final goingDown = delta > 0;
    // Only a finger moving up brings the bar back. A list snapping back after
    // the page grew (which happens as the bar slides away) must not.
    if (!goingDown && n.dragDetails == null) return false;

    if (_run == 0 || (_run > 0) != goingDown) {
      _run = 0;
      _runStart = null;
    }
    _run += delta;
    // Touch-event time, so speed reflects the finger, not frame timing.
    final now = n.dragDetails?.sourceTimeStamp;
    _runStart ??= now;

    if (goingDown) {
      if (_run >= hideAfter) hide();
    } else {
      final travelled = -_run;
      final start = _runStart;
      final seconds = (now != null && start != null)
          ? (now - start).inMicroseconds / 1e6
          : 0.0;
      // A run that fits inside one touch sample is a flick by definition.
      final fast = seconds <= 0 || travelled / seconds >= fastSpeed;
      if (travelled >= showAfter || (fast && travelled >= fastShowAfter)) {
        show();
      }
    }
    return false;
  }

  void dispose() {
    visibility.dispose();
    _anim.dispose();
  }
}

/// The bar itself: slides down out of view as [controller] hides it, and
/// gives its space back to the page as it goes.
class ScrollAwareBottomBar extends StatelessWidget {
  const ScrollAwareBottomBar({
    super.key,
    required this.controller,
    required this.child,
  });

  final ScrollAwareBottomBarController controller;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final curved = controller.visibility;
    return AnimatedBuilder(
      animation: curved,
      // Top-aligned in a shrinking box, so the bar slides down past the
      // screen edge instead of getting squashed.
      builder: (context, bar) => ClipRect(
        child: Align(
          alignment: Alignment.topCenter,
          heightFactor: curved.value,
          child: bar,
        ),
      ),
      child: child,
    );
  }
}
