'use strict';

// Common components — modal bottom sheet + date/range pickers (Material 3).

function bottomSheet(app) {
  return `import 'package:${app}/general_exports.dart';

// AppBottomSheet — the one entry point for modal bottom sheets (Material 3 shape
// + drag handle + safe padding). Call AppBottomSheet.show(context, child: ...).
class AppBottomSheet {
  AppBottomSheet._();

  static Future<T?> show<T>(
    BuildContext context, {
    required Widget child,
    bool isScrollControlled = true,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: isScrollControlled,
      showDragHandle: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.r)),
      ),
      builder: (BuildContext _) => Padding(
        padding: EdgeInsets.fromLTRB(16.w, 8.h, 16.w, MediaQuery.of(context).viewInsets.bottom + 16.h),
        child: child,
      ),
    );
  }
}
`;
}

function datePicker(app) {
  return `import 'package:${app}/general_exports.dart';

// AppDatePicker — Material 3 date + range pickers with sensible app defaults.
class AppDatePicker {
  AppDatePicker._();

  static Future<DateTime?> pick(
    BuildContext context, {
    DateTime? initial,
    DateTime? first,
    DateTime? last,
  }) {
    final DateTime now = DateTime.now();
    return showDatePicker(
      context: context,
      initialDate: initial ?? now,
      firstDate: first ?? DateTime(now.year - 100),
      lastDate: last ?? DateTime(now.year + 100),
    );
  }

  static Future<DateTimeRange?> pickRange(BuildContext context, {DateTimeRange? initial}) {
    final DateTime now = DateTime.now();
    return showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 100),
      lastDate: DateTime(now.year + 100),
      initialDateRange: initial,
    );
  }
}
`;
}

module.exports = { bottomSheet, datePicker };
