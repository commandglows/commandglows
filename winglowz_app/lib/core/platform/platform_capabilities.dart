import 'package:flutter/foundation.dart';

class PlatformCapabilities {
  static bool get isAndroid =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
  static bool get isWindows =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.windows;
  static bool get isMacOS =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.macOS;
  static bool get isLinux =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.linux;
  static bool get isWeb => kIsWeb;

  static String get currentPlatformLabel {
    if (isWeb) {
      return 'version web';
    }
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => 'Android',
      TargetPlatform.iOS => 'iOS',
      TargetPlatform.macOS => 'macOS',
      TargetPlatform.windows => 'Windows',
      TargetPlatform.linux => 'Linux',
      TargetPlatform.fuchsia => 'Fuchsia',
    };
  }

  static String get localSpeechUnavailableReason {
    if (isWeb) {
      return 'La version web s’exécute dans le navigateur: elle ne peut pas utiliser le moteur de dictée local du téléphone.';
    }
    if (isLinux) {
      return 'Linux n’expose pas encore le moteur de dictée locale attendu par CommandGlows.';
    }
    return 'Cette fonctionnalité dépend du moteur de dictée local de la plateforme.';
  }

  static String get overlayUnavailableReason {
    if (isWeb) {
      return 'La version web s’exécute dans le navigateur: elle ne peut pas afficher une bulle système au-dessus des autres apps.';
    }
    if (isWindows) {
      return 'L’overlay Windows utilise un hôte desktop dédié: hotkey global, fenêtre flottante, clipboard et livraison best-effort, sans IME Windows.';
    }
    if (isMacOS) {
      return 'L’overlay macOS utilise un hôte desktop dédié: fenêtre flottante, raccourci global, clipboard et livraison best-effort, sans IME macOS.';
    }
    if (isLinux) {
      return 'L’overlay Linux utilise un hôte desktop dédié: fenêtre flottante, raccourci global quand le gestionnaire de fenêtres le permet, clipboard et livraison best-effort, sans IME Linux.';
    }
    return 'L’overlay CommandGlows dépend des APIs natives Android pour afficher une bulle au-dessus des autres apps.';
  }

  static String get keyboardImeUnavailableReason {
    if (isWeb) {
      return 'La version web s’exécute dans le navigateur: elle ne peut pas installer ni sélectionner un clavier système.';
    }
    return 'Le clavier CommandGlows est une IME native Android et ne peut pas être installé sur $currentPlatformLabel.';
  }

  static bool get localSpeechSupported => !isWeb && !isLinux;
  static bool get overlaySupported => isAndroid;
  static bool get windowsDesktopOverlaySupported => isWindows;
  static bool get macOSDesktopOverlaySupported => isMacOS;
  static bool get linuxDesktopOverlaySupported => isLinux;
  static bool get desktopOverlaySupported =>
      windowsDesktopOverlaySupported ||
      macOSDesktopOverlaySupported ||
      linuxDesktopOverlaySupported;
  static bool get keyboardImeSupported => isAndroid;
  static bool get secureStorageDegraded => isWeb || isLinux;
}
