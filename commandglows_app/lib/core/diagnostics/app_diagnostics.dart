import 'package:flutter/foundation.dart';

import 'sensitive_redactor.dart';

class AppDiagnosticEvent {
  const AppDiagnosticEvent({
    required this.timestampUtc,
    required this.category,
    required this.message,
    this.count = 1,
  });

  final DateTime timestampUtc;
  final String category;
  final String message;
  final int count;

  AppDiagnosticEvent incremented(DateTime timestampUtc) {
    return AppDiagnosticEvent(
      timestampUtc: timestampUtc,
      category: category,
      message: message,
      count: count + 1,
    );
  }

  @override
  String toString() {
    final repeatSuffix = count > 1 ? ' x$count' : '';
    return '${timestampUtc.toIso8601String()} [$category$repeatSuffix] '
        '$message';
  }
}

class AppDiagnostics {
  AppDiagnostics._();

  static const _maxEvents = 80;
  static const _firstFrameAssertionNeedle = 'debugFrameWasSentToEngine';
  static final List<AppDiagnosticEvent> _events = <AppDiagnosticEvent>[];
  static void Function(String category, String message)? breadcrumbRecorder;

  static List<AppDiagnosticEvent> get recentEvents =>
      List<AppDiagnosticEvent>.unmodifiable(_events);

  static void clear() {
    _events.clear();
  }

  static void record(String category, Object? message) {
    final normalizedMessage = _singleLine(message);
    final now = DateTime.now().toUtc();
    if (_events.isNotEmpty) {
      final last = _events.last;
      if (last.category == category && last.message == normalizedMessage) {
        _events[_events.length - 1] = last.incremented(now);
        return;
      }
    }
    final event = AppDiagnosticEvent(
      timestampUtc: now,
      category: category,
      message: normalizedMessage,
    );
    _events.add(event);
    if (_events.length > _maxEvents) {
      _events.removeRange(0, _events.length - _maxEvents);
    }
    breadcrumbRecorder?.call(category, normalizedMessage);
  }

  static bool recordFlutterError(FlutterErrorDetails details) {
    if (_isFirstFrameAssertion(details)) {
      record(
        'flutter_first_frame_assertion',
        'suppressed $_firstFrameAssertionNeedle from ${details.library ?? 'unknown'}',
      );
      return false;
    }
    record(
      'flutter_error',
      '${details.exceptionAsString()} | library=${details.library ?? 'unknown'}',
    );
    return true;
  }

  static void recordUnhandledError(Object error, StackTrace stackTrace) {
    record('unhandled_error', error);
  }

  static String _singleLine(Object? value) {
    return SensitiveRedactor.redact(value);
  }

  static bool _isFirstFrameAssertion(FlutterErrorDetails details) {
    return details.exceptionAsString().contains(_firstFrameAssertionNeedle) &&
        details.library == 'Flutter framework';
  }
}
