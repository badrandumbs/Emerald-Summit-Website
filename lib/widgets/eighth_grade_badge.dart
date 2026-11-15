import 'package:flutter/material.dart';

/// Marks a session an 8th-grade participant can register to participate in
/// (`sessions.allow_eighth_graders`). Shown only to 8th-grade participants
/// ([AppState.isEighthGradeParticipant]); everyone else sees nothing.
class EighthGradeBadge extends StatelessWidget {
  const EighthGradeBadge({super.key, this.color});

  /// The badge color; the theme's primary color by default.
  final Color? color;

  static const label = 'Open to 8th grade';

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: c.withValues(alpha: .14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: c.withValues(alpha: .45)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.star_rounded, size: 14, color: c),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: c,
            ),
          ),
        ],
      ),
    );
  }
}
