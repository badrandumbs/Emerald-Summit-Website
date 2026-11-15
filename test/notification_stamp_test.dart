import 'package:emerald_summit/models/models.dart';
import 'package:flutter_test/flutter_test.dart';

// The bell's stamp, matching the website's notificationStamp: relative while
// the note is from today's calendar day, then the date.
void main() {
  final noon = DateTime(2026, 11, 12, 12); // a Thursday

  test('today stays relative', () {
    expect(notificationStamp(noon.subtract(const Duration(seconds: 20)), noon),
        'just now');
    expect(notificationStamp(noon.subtract(const Duration(minutes: 5)), noon),
        '5m ago');
    expect(notificationStamp(DateTime(2026, 11, 12, 9), noon), '3h ago');
  });

  test('12:05 AM today is relative, 11 PM yesterday is a date', () {
    expect(notificationStamp(DateTime(2026, 11, 12, 0, 5), noon), '11h ago');
    expect(notificationStamp(DateTime(2026, 11, 11, 23), noon), 'Wed, Nov 11');
  });

  test('earlier this year shows weekday and date', () {
    expect(notificationStamp(DateTime(2026, 11, 10, 8), noon), 'Tue, Nov 10');
    expect(notificationStamp(DateTime(2026, 1, 1, 8), noon), 'Thu, Jan 1');
  });

  test('another year shows the year', () {
    expect(notificationStamp(DateTime(2025, 11, 12, 8), noon), 'Nov 12, 2025');
  });

  test('no date gives no stamp', () {
    expect(notificationStamp(null, noon), '');
    expect(notificationFullTime(null), '');
  });

  test('full time reads like the website hover text', () {
    expect(notificationFullTime(DateTime(2026, 11, 12, 9, 5)),
        'Thursday, November 12, 2026 at 9:05 AM');
    expect(notificationFullTime(DateTime(2026, 11, 12, 0, 0)),
        'Thursday, November 12, 2026 at 12:00 AM');
  });
}
