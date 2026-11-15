import 'package:flutter/material.dart';

import '../backend/repositories.dart';
import '../models/models.dart';

/// Shown before an admin assigns someone (or themselves) to manage a session
/// they're already busy for. A person does one thing at a time, so managing
/// wins and everything listed comes off their day
/// (volunteer_conflict_override.sql). [personName] is null when the admin is
/// managing it themselves. True when they confirm.
Future<bool> showReplaceScheduleDialog(
  BuildContext context, {
  required String? personName,
  required String sessionTitle,
  required List<ReplacedItem> items,
}) async {
  final self = personName == null;
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      return AlertDialog(
        title: Text(self
            ? "Replace what you're doing?"
            : "Replace what they're doing?"),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${self ? 'You' : personName} can only do one thing at a '
                'time. Managing "$sessionTitle" takes '
                '${self ? 'these off your day' : 'these off their day'}:',
              ),
              const SizedBox(height: 10),
              for (final item in items) _Bullet(describeReplacement(item, self: self)),
              if (!self) ...[
                const SizedBox(height: 6),
                Text(
                  "They'll get a notice listing these changes.",
                  style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(self ? 'Manage instead' : 'Assign and replace'),
          ),
        ],
      );
    },
  );
  return ok == true;
}

/// Shown when an admin makes a volunteer who's signed up for this session its
/// manager instead. [type] is how they're signed up. True when they confirm.
Future<bool> showMakeManagerDialog(
  BuildContext context, {
  required String personName,
  required ParticipationType type,
  required List<ReplacedItem> items,
}) async {
  final here = items.where((i) => i.kind == ReplacedKind.registeredThis);
  final team =
      here.isEmpty ? null : describeTeamEffect(here.first, self: false);
  final elsewhere =
      items.where((i) => i.kind != ReplacedKind.registeredThis).toList();
  final as = switch (type) {
    ParticipationType.spectator => 'a spectator',
    ParticipationType.expert => 'an expert',
    ParticipationType.participant => 'a participant',
  };
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      return AlertDialog(
        title: Text('Assign $personName to be a manager instead?'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'This will make them a manager of this session, and they will '
                'no longer be $as of this session.',
              ),
              if (team != null) ...[
                const SizedBox(height: 10),
                Text(team),
              ],
              if (elsewhere.isNotEmpty) ...[
                const SizedBox(height: 10),
                const Text(
                    'It also takes these off their day, since they overlap:'),
                const SizedBox(height: 6),
                for (final item in elsewhere)
                  _Bullet(describeReplacement(item, self: false)),
              ],
              const SizedBox(height: 10),
              Text(
                "They'll get a notice about the change.",
                style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Assign to be a manager instead'),
          ),
        ],
      );
    },
  );
  return ok == true;
}

class _Bullet extends StatelessWidget {
  const _Bullet(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('•  '),
            Expanded(child: Text(text)),
          ],
        ),
      );
}
