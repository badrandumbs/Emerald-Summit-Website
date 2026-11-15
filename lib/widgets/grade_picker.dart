import 'package:flutter/material.dart';

import '../models/metrics.dart';
import '../models/user_profile.dart';

/// The grades a participant can pick, saved as "8" to "12".
const participantGrades = ['8', '9', '10', '11', '12'];

/// "8th grade" … "12th grade".
String gradeOptionLabel(String grade) => '${grade}th grade';

/// A participant's grade on sign-up and Edit profile: a dropdown of 8th to
/// 12th grade. [controller] holds the saved answer ("8" to "12"). An older
/// typed answer ("11th", "Junior") opens on the matching grade; anything else
/// opens empty so it gets picked again.
class GradePicker extends StatefulWidget {
  const GradePicker({
    super.key,
    required this.field,
    required this.controller,
    this.enabled = true,
  });

  final ProfileField field;
  final TextEditingController controller;
  final bool enabled;

  @override
  State<GradePicker> createState() => _GradePickerState();
}

class _GradePickerState extends State<GradePicker> {
  String? _choice;

  @override
  void initState() {
    super.initState();
    final saved = gradeLabel(widget.controller.text);
    if (participantGrades.contains(saved)) {
      _choice = saved;
      widget.controller.text = saved;
    } else {
      widget.controller.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      initialValue: _choice,
      isExpanded: true,
      onChanged: widget.enabled
          ? (v) {
              setState(() => _choice = v);
              widget.controller.text = v ?? '';
            }
          : null,
      decoration: InputDecoration(
        labelText: widget.field.label,
        helperText: widget.field.helper,
        helperMaxLines: 3,
        border: const OutlineInputBorder(),
      ),
      items: [
        for (final g in participantGrades)
          DropdownMenuItem(value: g, child: Text(gradeOptionLabel(g))),
      ],
    );
  }
}
