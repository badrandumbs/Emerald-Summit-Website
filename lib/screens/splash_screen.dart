import 'dart:async';

import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

const Color _bgBottom = Color(0xFF102D26);
const Color _sunBody = Color(0xFF8DC7A2);
const Color _mtnBack = Color(0xFF2C5A49);
const Color _mtnFront = Color(0xFF174333);

/// The original mountain scene and sun traverse, rendered in matte greens.
/// The ridge profile, sun path and wordmark timing retain their composition.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.next});

  /// The real first screen (auth gate or root nav) revealed once the splash
  /// finishes.
  final Widget next;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final _Scene _scene;
  Timer? _reducedMotionTimer;

  /// Haptic beats keyed to points in the timeline (0..1). Times accelerate
  /// toward the sun's crest (~0.50) for a build-up, then settle as it sets.
  /// Each fires once.
  static const List<_Beat> _beats = [
    _Beat(0.08, _Haptic.select),
    _Beat(0.22, _Haptic.select),
    _Beat(0.32, _Haptic.select),
    _Beat(0.40, _Haptic.light),
    _Beat(0.45, _Haptic.light),
    _Beat(0.48, _Haptic.medium),
    _Beat(0.50, _Haptic.heavy), // sun at its apex — the crest
    _Beat(0.68, _Haptic.light), // recede / settle
    _Beat(0.84, _Haptic.select),
  ];
  final Set<int> _firedBeats = {};

  bool _handedOff = false;

  @override
  void initState() {
    super.initState();
    _scene = const _Scene();

    _controller =
        AnimationController(
            vsync: this,
            duration: const Duration(milliseconds: 3000),
          )
          ..addListener(_fireBeats)
          ..addStatusListener((status) {
            if (status == AnimationStatus.completed) _handOff();
          });

    // Kick off after the first frame so the very first haptic lands with the
    // animation rather than during route construction.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (MediaQuery.disableAnimationsOf(context)) {
        _controller.value = 0.58;
        _reducedMotionTimer = Timer(
          const Duration(milliseconds: 1200),
          _handOff,
        );
      } else {
        _controller.forward();
      }
    });
  }

  void _fireBeats() {
    if (MediaQuery.disableAnimationsOf(context)) return;
    final t = _controller.value;
    for (var i = 0; i < _beats.length; i++) {
      if (!_firedBeats.contains(i) && t >= _beats[i].at) {
        _firedBeats.add(i);
        _beats[i].haptic.fire();
      }
    }
  }

  void _handOff() {
    if (_handedOff || !mounted) return;
    _handedOff = true;
    _reducedMotionTimer?.cancel();
    _controller.stop();
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: Duration(
          milliseconds: MediaQuery.disableAnimationsOf(context) ? 0 : 350,
        ),
        pageBuilder: (_, _, _) => widget.next,
        transitionsBuilder: (_, animation, _, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  void dispose() {
    _reducedMotionTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgBottom,
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _handOff,
        child: Stack(
          children: [
            Positioned.fill(
              child: Semantics(
                image: true,
                label: 'Emerald Summit ’27, with a green sun crossing mountain ridges',
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, _) => CustomPaint(
                    painter: _SplashPainter(
                      t: _controller.value,
                      scene: _scene,
                      fontFamily: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.fontFamily,
                    ),
                    size: Size.infinite,
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Align(
                alignment: Alignment.bottomRight,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextButton.icon(
                    onPressed: _handOff,
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFFD5E8DB),
                    ),
                    label: const Text('Continue'),
                    icon: const Icon(Icons.arrow_forward, size: 18),
                    iconAlignment: IconAlignment.end,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Original seeded ridge coordinates, stored explicitly so the composition
// remains the same without generating unused stars or rays.
class _Scene {
  const _Scene();

  final List<Offset> back = const [
    Offset(0, .745176537),
    Offset(.111111111, .844557530),
    Offset(.222222222, .739707409),
    Offset(.333333333, .840455650),
    Offset(.444444444, .852951378),
    Offset(.555555556, .760193301),
    Offset(.666666667, .800207647),
    Offset(.777777778, .800216357),
    Offset(.888888889, .747332559),
    Offset(1, .826146476),
  ];
  final List<Offset> front = const [
    Offset(0, .862738400),
    Offset(.076923077, .902415934),
    Offset(.153846154, .819286815),
    Offset(.230769231, .880764480),
    Offset(.307692308, .887222685),
    Offset(.384615385, .903064700),
    Offset(.461538462, .808971461),
    Offset(.538461538, .809933434),
    Offset(.615384615, .879813167),
    Offset(.692307692, .729178352),
    Offset(.769230769, .813073426),
    Offset(.846153846, .848447965),
    Offset(.923076923, .770107855),
    Offset(1, .801777870),
  ];
}

// ---------------------------------------------------------------------------
// Painter
// ---------------------------------------------------------------------------

class _SplashPainter extends CustomPainter {
  _SplashPainter({
    required this.t,
    required this.scene,
    required this.fontFamily,
  });

  final double t; // 0..1 timeline
  final _Scene scene;
  final String? fontFamily;

  // Sun path constants.
  static const double _horizon = 0.80; // where it sits at rise/set
  static const double _rise = 0.52; // fraction of H it climbs above horizon

  // Wordmark timing.
  static const double _wipeStart = 0.28;
  static const double _wipeEnd = 0.52;
  static const double _wordY = 0.60;

  double get _dayness => math.sin(t.clamp(0.0, 1.0) * math.pi); // 0→1→0

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final day = _dayness;

    _paintSky(canvas, size);

    // Sun position (arc, left → right). Drawn BEFORE the mountains so it rises
    // and sets behind the peaks.
    final sx = w * ui.lerpDouble(0.20, 0.80, t.clamp(0.0, 1.0))!;
    final climb = math.sin(t.clamp(0.0, 1.0) * math.pi);
    final sy = h * (_horizon - climb * _rise * 0.62);
    final radius = w * 0.10;
    _paintSun(canvas, Offset(sx, sy), radius);

    _paintMountains(canvas, size, day);
    _paintWordmark(canvas, size);
    _paintHandoffDip(canvas, size);
  }

  void _paintSky(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = _bgBottom);
  }

  void _paintSun(Canvas canvas, Offset center, double radius) {
    canvas.drawCircle(center, radius, Paint()..color = _sunBody);
  }

  void _paintMountains(Canvas canvas, Size size, double day) {
    _paintRange(
      canvas,
      size,
      scene.back,
      Color.lerp(_mtnBack, const Color(0xFF396A53), day * .25)!,
    );
    _paintRange(
      canvas,
      size,
      scene.front,
      Color.lerp(_mtnFront, const Color(0xFF24523C), day * .15)!,
    );
  }

  void _paintRange(Canvas canvas, Size size, List<Offset> ridge, Color color) {
    final path = Path()..moveTo(0, size.height);
    for (final point in ridge) {
      path.lineTo(point.dx * size.width, point.dy * size.height);
    }
    path
      ..lineTo(size.width, size.height)
      ..close();
    canvas.drawPath(path, Paint()..color = color);
  }

  void _paintWordmark(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final wipe = _easeOutCubic(
      ((t - _wipeStart) / (_wipeEnd - _wipeStart)).clamp(0.0, 1.0),
    );
    final alpha = _easeOutCubic(((t - _wipeStart) / 0.08).clamp(0.0, 1.0));
    if (alpha <= 0.01) return;

    var fs = w * 0.072;
    final maxW = w * 0.88;

    // Measure at the trial size, then shrink to fit on one line.
    double emeraldW(double size) => _measure('Emerald ', size);
    double summitW(double size) => _measure('Summit', size);
    double tailW(double size) => _measure(' ’27', size);
    double totalW(double size) => emeraldW(size) + summitW(size) + tailW(size);

    if (totalW(fs) > maxW) fs *= maxW / totalW(fs);

    final wE = emeraldW(fs);
    final wS = summitW(fs);
    final total = wE + wS + tailW(fs);
    final baseX = (w - total) / 2;
    final y = h * _wordY;

    final span = TextSpan(
      text: 'Emerald Summit ’27',
      style: TextStyle(
        fontSize: fs,
        fontFamily: fontFamily,
        color: const Color(0xFFD5E8DB),
        fontWeight: FontWeight.w600,
        letterSpacing: 0.2,
        height: 1.0,
      ),
    );

    final tp = TextPainter(text: span, textDirection: TextDirection.ltr)
      ..layout();

    // Layer opacity for the fade-in ramp.
    final bounds = Rect.fromLTWH(baseX - 8, y - fs, total + 16, fs * 2);
    canvas.saveLayer(
      bounds,
      Paint()..color = Colors.white.withValues(alpha: alpha),
    );

    // Left→right wipe reveal.
    final revealW = total * wipe;
    canvas.save();
    canvas.clipRect(Rect.fromLTWH(baseX - 4, y - fs, revealW + 8, fs * 2));
    tp.paint(canvas, Offset(baseX, y - tp.height / 2));
    canvas.restore();

    canvas.restore();
  }

  double _measure(String text, double fs) {
    final tp = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          fontSize: fs,
          fontFamily: fontFamily,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    return tp.width;
  }

  /// Final handoff: dip the whole scene into the brand ground so the fade to
  /// the next screen is seamless.
  void _paintHandoffDip(Canvas canvas, Size size) {
    final out = _smoothstep(((t - 0.93) / 0.07).clamp(0.0, 1.0));
    if (out <= 0) return;
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = _bgBottom.withValues(alpha: out),
    );
  }

  static double _easeOutCubic(double x) => 1 - math.pow(1 - x, 3).toDouble();
  static double _smoothstep(double x) => x * x * (3 - 2 * x);

  @override
  bool shouldRepaint(covariant _SplashPainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.fontFamily != fontFamily;
}

/// A haptic beat scheduled at a point in the timeline.
class _Beat {
  const _Beat(this.at, this.haptic);
  final double at;
  final _Haptic haptic;
}

enum _Haptic {
  select,
  light,
  medium,
  heavy;

  void fire() {
    switch (this) {
      case _Haptic.select:
        HapticFeedback.selectionClick();
      case _Haptic.light:
        HapticFeedback.lightImpact();
      case _Haptic.medium:
        HapticFeedback.mediumImpact();
      case _Haptic.heavy:
        HapticFeedback.heavyImpact();
    }
  }
}
