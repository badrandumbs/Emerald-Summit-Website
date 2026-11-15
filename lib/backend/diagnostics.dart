/// What the app remembers about its own recent behaviour, so a bug report can
/// say what happened before it was sent: the last screens opened, the last
/// errors, the last failed backend requests, and the build and device. The
/// app's version of the website's `collectClientContext`
/// (src/lib/diagnostics.ts). Nothing here leaves the phone except inside a
/// report the person chooses to send.
library;

import 'dart:async';
import 'dart:io' show Platform;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';

/// The git commit a build was made from, when the build passes
/// `--dart-define=GIT_COMMIT=$(git rev-parse --short HEAD)`.
const _commit = String.fromEnvironment('GIT_COMMIT');

class Diagnostics {
  Diagnostics._();

  static final instance = Diagnostics._();

  static const _maxRoutes = 15;
  static const _maxErrors = 25;
  static const _maxRequests = 15;

  final _routes = <Map<String, Object?>>[];
  final _errors = <Map<String, Object?>>[];
  final _requests = <Map<String, Object?>>[];

  /// The screen the person is on, as best the app knows.
  String page = 'start';

  static String _now() => DateTime.now().toUtc().toIso8601String();

  static void _push(List<Map<String, Object?>> list, Map<String, Object?> e,
      int max) {
    list.add(e);
    if (list.length > max) list.removeRange(0, list.length - max);
  }

  /// Notes that [path] (a tab or a screen) was opened.
  void visit(String path) {
    page = path;
    _push(_routes, {'path': path, 'at': _now()}, _maxRoutes);
  }

  void error(String message, {String level = 'error'}) {
    final text =
        message.length > 2000 ? '${message.substring(0, 2000)}…' : message;
    _push(_errors, {'level': level, 'message': text, 'at': _now()}, _maxErrors);
  }

  void failedRequest({
    required String method,
    required String url,
    int? status,
    String? message,
  }) {
    _push(
      _requests,
      {
        'method': method,
        // Query strings can carry search text; keep the path only.
        'url': url.split('?').first,
        'status': status,
        'message': message,
        'at': _now(),
      },
      _maxRequests,
    );
  }

  /// Records Flutter and uncaught errors, keeping whatever handlers were set
  /// before. Call once at startup.
  void install() {
    final previous = FlutterError.onError;
    FlutterError.onError = (details) {
      error(details.exceptionAsString(), level: 'flutter');
      previous?.call(details);
    };
    final previousPlatform = PlatformDispatcher.instance.onError;
    PlatformDispatcher.instance.onError = (e, stack) {
      error(e.toString(), level: 'uncaught');
      return previousPlatform?.call(e, stack) ?? false;
    };
  }

  /// Everything a report attaches about the app, as `p_client`.
  Future<Map<String, Object?>> collect(BuildContext context) async {
    final media = MediaQuery.maybeOf(context);
    final brightness = Theme.of(context).brightness;
    final build = <String, Object?>{};
    try {
      final info = await PackageInfo.fromPlatform();
      build['version'] = info.version;
      build['build_number'] = info.buildNumber;
    } catch (_) {}
    if (_commit.isNotEmpty) build['commit'] = _commit;

    final device = <String, Object?>{
      'locale': PlatformDispatcher.instance.locale.toLanguageTag(),
      'timezone': DateTime.now().timeZoneName,
      'utc_offset_minutes': DateTime.now().timeZoneOffset.inMinutes,
      if (media != null)
        'screen': '${media.size.width.round()}x${media.size.height.round()} '
            '@${media.devicePixelRatio}x',
      'theme': brightness.name,
    };
    try {
      final plugin = DeviceInfoPlugin();
      if (!kIsWeb && Platform.isIOS) {
        final ios = await plugin.iosInfo;
        device['model'] = ios.utsname.machine;
        device['os'] = '${ios.systemName} ${ios.systemVersion}';
        device['simulator'] = !ios.isPhysicalDevice;
      } else if (!kIsWeb && Platform.isAndroid) {
        final android = await plugin.androidInfo;
        device['model'] = '${android.manufacturer} ${android.model}';
        device['os'] = 'Android ${android.version.release} '
            '(SDK ${android.version.sdkInt})';
        device['emulator'] = !android.isPhysicalDevice;
      }
    } catch (_) {}

    return {
      'app': !kIsWeb && Platform.isIOS
          ? 'ios'
          : !kIsWeb && Platform.isAndroid
              ? 'android'
              : defaultTargetPlatform.name,
      'page': page,
      'route_history': [..._routes],
      'errors': [..._errors],
      'failed_requests': [..._requests],
      'build': build,
      'device': device,
    };
  }
}

final diagnostics = Diagnostics.instance;

/// Notes each screen pushed or popped back to, by its route name when it has
/// one, else the screen widget it shows (e.g. "SessionDetailScreen").
class DiagnosticsNavigatorObserver extends NavigatorObserver {
  static String _name(Route<dynamic>? route) {
    if (route == null) return 'unknown';
    final name = route.settings.name;
    if (name != null && name.isNotEmpty) return name;
    final context = route.navigator?.context;
    // Building the page widget (not mounting it) gives its type cheaply.
    try {
      if (context != null && route is MaterialPageRoute) {
        return route.builder(context).runtimeType.toString();
      }
      if (context != null && route is PageRouteBuilder) {
        return route
            .pageBuilder(context, kAlwaysCompleteAnimation,
                kAlwaysDismissedAnimation)
            .runtimeType
            .toString();
      }
    } catch (_) {}
    if (route is PopupRoute) return 'popup:${route.runtimeType}';
    return route.runtimeType.toString().split('<').first;
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      diagnostics.visit('open ${_name(route)}');

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      diagnostics.visit('back to ${_name(previousRoute)}');
}

/// An HTTP client that notes every failed backend request (a 4xx/5xx answer
/// or no answer at all) and passes everything through unchanged.
class RecordingHttpClient extends http.BaseClient {
  RecordingHttpClient([http.Client? inner]) : _inner = inner ?? http.Client();

  final http.Client _inner;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    try {
      final response = await _inner.send(request);
      if (response.statusCode >= 400) {
        diagnostics.failedRequest(
          method: request.method,
          url: request.url.toString(),
          status: response.statusCode,
          message: response.reasonPhrase,
        );
      }
      return response;
    } catch (e) {
      diagnostics.failedRequest(
        method: request.method,
        url: request.url.toString(),
        message: e.toString(),
      );
      rethrow;
    }
  }

  @override
  void close() => _inner.close();
}
