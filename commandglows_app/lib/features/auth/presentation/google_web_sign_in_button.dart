import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../core/theme/app_theme.dart';
import '../data/google_auth_client.dart';
import '../domain/auth_failure.dart';
import 'google_web_sign_in_renderer.dart' as renderer;

class GoogleWebSignInButton extends StatefulWidget {
  const GoogleWebSignInButton({
    super.key,
    required this.disabled,
    required this.onAuthenticated,
    required this.onFailure,
  });

  final bool disabled;
  final Future<void> Function(String? idToken) onAuthenticated;
  final Future<void> Function(AuthFailure failure, StackTrace stackTrace)
  onFailure;

  @override
  State<GoogleWebSignInButton> createState() => _GoogleWebSignInButtonState();
}

class _GoogleWebSignInButtonState extends State<GoogleWebSignInButton> {
  final GoogleAuthClient _googleAuthClient = PluginGoogleAuthClient();
  StreamSubscription<GoogleAuthResult>? _subscription;
  bool _ready = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      unawaited(_initialize());
    }
  }

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    super.dispose();
  }

  Future<void> _initialize() async {
    try {
      await _googleAuthClient.initialize();
      _subscription = _googleAuthClient.authenticationResults().listen(
        (result) => unawaited(_handleAuthResult(result)),
        onError: (Object error, StackTrace stackTrace) {
          unawaited(_presentAuthFailure(error, stackTrace));
        },
      );
      if (mounted) {
        setState(() => _ready = true);
      }
    } catch (error, stackTrace) {
      await _presentAuthFailure(error, stackTrace);
    }
  }

  Future<void> _handleAuthResult(GoogleAuthResult result) async {
    if (_busy || widget.disabled) {
      return;
    }
    if (mounted) {
      setState(() => _busy = true);
    }
    try {
      await widget.onAuthenticated(result.idToken);
    } on AuthFailure catch (error, stackTrace) {
      await widget.onFailure(error, stackTrace);
    } catch (error, stackTrace) {
      await widget.onFailure(AuthFailure.unexpected(error), stackTrace);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _presentAuthFailure(Object error, StackTrace stackTrace) async {
    final failure = switch (error) {
      AuthFailure() => error,
      GoogleSignInException() => GoogleAuthFailureMapper.fromException(error),
      _ => AuthFailure.unexpected(error),
    };
    await widget.onFailure(failure, stackTrace);
  }

  @override
  Widget build(BuildContext context) {
    if (!kIsWeb) {
      return const SizedBox.shrink();
    }

    if (!_ready) {
      return OutlinedButton.icon(
        onPressed: null,
        icon: const Icon(Icons.login_outlined),
        label: const Text('Google en préparation'),
      );
    }

    final disabled = widget.disabled || _busy;
      return Opacity(
      opacity: disabled
          ? AppLayoutMetrics.authWebSignInButtonDisabledOpacity
          : 1,
      child: AbsorbPointer(
        absorbing: disabled,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth.isFinite
                ? constraints.maxWidth.clamp(
                    AppLayoutMetrics.authWebSignInButtonMinWidth,
                    AppLayoutMetrics.authWebSignInButtonMaxWidth,
                  )
                : AppLayoutMetrics.authWebSignInButtonMaxWidth;
            return SizedBox(
              height: AppLayoutMetrics.authWebSignInButtonHeight,
              width: double.infinity,
              child: Center(
                child: SizedBox(
                  width: width,
                  child: renderer.renderGoogleWebSignInButton(
                    minimumWidth: width,
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
