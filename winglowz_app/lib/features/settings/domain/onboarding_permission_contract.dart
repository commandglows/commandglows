import '../../../core/platform/android_overlay_bridge.dart';
import '../../keyboard/domain/keyboard_models.dart';

enum OnboardingStepCategory { recommended }

enum OnboardingStepGroup { voice, keyboard, clipboard, extras }

enum OnboardingStepId {
  keyboardIme,
  keyboardClipboard,
  microphoneForDictation,
  accessibility,
  mediaSessionAccess,
  brightnessSystemSettings,
  overlay,
}

class OnboardingStepDefinition {
  const OnboardingStepDefinition({
    required this.id,
    required this.title,
    required this.description,
    required this.why,
    required this.category,
    required this.group,
    required this.openActionLabel,
    required this.whereToFind,
    this.secondaryActionLabel,
  });

  final OnboardingStepId id;
  final String title;
  final String description;
  final String why;
  final OnboardingStepCategory category;
  final OnboardingStepGroup group;
  final String openActionLabel;
  final String whereToFind;
  final String? secondaryActionLabel;
}

class OnboardingStepProgress {
  const OnboardingStepProgress({
    required this.definition,
    required this.satisfied,
    required this.supported,
    required this.skipped,
    this.blockerReason,
  });

  final OnboardingStepDefinition definition;
  final bool satisfied;
  final bool supported;
  final bool skipped;
  final String? blockerReason;

  bool get completed => satisfied || skipped || !supported;

  bool get isMandatory => false;

  bool get isRecommended =>
      definition.category == OnboardingStepCategory.recommended;

  bool get requiresAction => supported && !completed;
}

class OnboardingReadiness {
  const OnboardingReadiness({
    required this.platformSupported,
    required this.steps,
    required this.currentStep,
    required this.onboardingCompleted,
  });

  final bool platformSupported;
  final List<OnboardingStepProgress> steps;
  final int currentStep;
  final bool onboardingCompleted;

  bool get hasPendingMandatory {
    return false;
  }

  bool get hasPendingRecommended {
    return steps
        .where((step) => step.isRecommended)
        .any((step) => !step.completed);
  }

  bool get allMandatoryCompleted {
    return true;
  }

  bool get allStepsCompleted {
    return steps.every((step) => step.completed);
  }

  bool get shouldShowCompletion {
    return platformSupported && allStepsCompleted;
  }

  bool get shouldShowOnboarding {
    return platformSupported && !onboardingCompleted;
  }

  OnboardingStepProgress? get activeStep {
    if (currentStep < 0 || currentStep >= steps.length) {
      return null;
    }
    return steps[currentStep];
  }
}

const _stepDefinitions = <OnboardingStepDefinition>[
  OnboardingStepDefinition(
    id: OnboardingStepId.keyboardIme,
    title: 'Clavier CommandGlows keyboard',
    description:
        'Active et sélectionne CommandGlows keyboard comme clavier Android.',
    why:
        'C’est le socle du produit: le clavier reste utile même si la dictée, le clipboard ou l’overlay sont ignorés.',
    category: OnboardingStepCategory.recommended,
    group: OnboardingStepGroup.keyboard,
    openActionLabel: 'Activer le clavier',
    secondaryActionLabel: 'Choisir le clavier',
    whereToFind:
        'Réglages Android → Système → Langues et clavier → Claviers virtuels',
  ),
  OnboardingStepDefinition(
    id: OnboardingStepId.keyboardClipboard,
    title: 'Clipboard clavier',
    description: 'Active l’intention de synchroniser le clipboard du clavier.',
    why:
        'Utile pour retrouver les copies récentes depuis le clavier; optionnel si tu veux seulement taper.',
    category: OnboardingStepCategory.recommended,
    group: OnboardingStepGroup.clipboard,
    openActionLabel: 'Activer le clipboard clavier',
    whereToFind: 'CommandGlows → Settings → Keyboard clipboard sync intent',
  ),
  OnboardingStepDefinition(
    id: OnboardingStepId.microphoneForDictation,
    title: 'Microphone',
    description: 'Autorise l’accès micro pour la dictée dans le clavier.',
    why:
        'Indispensable pour dicter; optionnel si tu veux utiliser uniquement la saisie clavier.',
    category: OnboardingStepCategory.recommended,
    group: OnboardingStepGroup.voice,
    openActionLabel: 'Ouvrir les permissions micro',
    whereToFind:
        'Réglages Android → Applications → CommandGlows → Autorisations → Microphone',
  ),
  OnboardingStepDefinition(
    id: OnboardingStepId.mediaSessionAccess,
    title: 'Accès notifications et média',
    description: 'Autorise CommandGlows à lire les notifications média Android.',
    why:
        'Cet accès sert surtout au clavier pour afficher le titre en cours et ouvrir l’app qui lit le son. Il reste optionnel.',
    category: OnboardingStepCategory.recommended,
    group: OnboardingStepGroup.keyboard,
    openActionLabel: 'Ouvrir Accès aux notifications',
    whereToFind:
        'Réglages Android → Applications → Accès spécial → Accès aux notifications → CommandGlows media access',
  ),
  OnboardingStepDefinition(
    id: OnboardingStepId.brightnessSystemSettings,
    title: 'Luminosité système',
    description: 'Autorise CommandGlows à modifier la luminosité Android.',
    why:
        'Cet accès permet aux boutons Bri- et Bri+ du clavier d’ajuster la luminosité.',
    category: OnboardingStepCategory.recommended,
    group: OnboardingStepGroup.keyboard,
    openActionLabel: 'Ouvrir Modifier les paramètres système',
    whereToFind:
        'Réglages Android → Applications → Accès spécial → Modifier les paramètres système → CommandGlows',
  ),
  OnboardingStepDefinition(
    id: OnboardingStepId.overlay,
    title: 'Overlay flottant',
    description: 'Active la bulle flottante CommandGlows.',
    why:
        'L’overlay est désormais un complément: il sert aux usages hors clavier, pas au parcours principal.',
    category: OnboardingStepCategory.recommended,
    group: OnboardingStepGroup.extras,
    openActionLabel: 'Activer l’overlay',
    whereToFind:
        'Réglages Android → Applications → CommandGlows → Autorisations → Afficher les fenêtres',
  ),
  OnboardingStepDefinition(
    id: OnboardingStepId.accessibility,
    title: 'Service Accessibilité',
    description: 'Active le service d’accessibilité CommandGlows.',
    why:
        'Améliore certains cas d’injection directe, mais le clavier reste utilisable sans ce service.',
    category: OnboardingStepCategory.recommended,
    group: OnboardingStepGroup.voice,
    openActionLabel: 'Ouvrir Accessibilité',
    whereToFind: 'Réglages Android → Accessibilité → Service CommandGlows',
  ),
];

OnboardingReadiness evaluateOnboardingReadiness({
  required bool isPlatformSupported,
  required AndroidOverlayStatus overlayStatus,
  required AndroidKeyboardStatus keyboardStatus,
  required int persistedStep,
  required bool onboardingCompleted,
  bool clipboardSkipped = false,
  bool accessibilitySkipped = false,
  bool microphoneSkipped = false,
  bool mediaAccessSkipped = false,
  bool brightnessSkipped = false,
  bool overlaySkipped = false,
}) {
  if (!isPlatformSupported) {
    return const OnboardingReadiness(
      platformSupported: false,
      steps: <OnboardingStepProgress>[],
      currentStep: 0,
      onboardingCompleted: false,
    );
  }

  final steps = <OnboardingStepProgress>[];
  for (final definition in _stepDefinitions) {
    final supported = _isStepSupported(
      definition: definition,
      keyboardStatus: keyboardStatus,
    );
    final skipped = _isStepSkipped(
      definition: definition,
      clipboardSkipped: clipboardSkipped,
      accessibilitySkipped: accessibilitySkipped,
      microphoneSkipped: microphoneSkipped,
      mediaAccessSkipped: mediaAccessSkipped,
      brightnessSkipped: brightnessSkipped,
      overlaySkipped: overlaySkipped,
    );
    final satisfied = _isStepSatisfied(
      definition: definition,
      overlayStatus: overlayStatus,
      keyboardStatus: keyboardStatus,
    );

    steps.add(
      OnboardingStepProgress(
        definition: definition,
        satisfied: satisfied,
        supported: supported,
        skipped: skipped,
        blockerReason: supported && !satisfied
            ? _stepBlockerReason(
                definition: definition,
                overlayStatus: overlayStatus,
                keyboardStatus: keyboardStatus,
              )
            : null,
      ),
    );
  }

  var firstIncomplete = steps.indexWhere((step) => !step.completed);
  if (firstIncomplete < 0) {
    firstIncomplete = steps.length;
  }
  if (persistedStep >= 0 && persistedStep < steps.length) {
    final persistedFallback = steps
        .sublist(persistedStep)
        .indexWhere((step) => !step.completed);
    if (persistedFallback >= 0) {
      firstIncomplete = persistedStep + persistedFallback;
    }
  }

  return OnboardingReadiness(
    platformSupported: true,
    steps: steps,
    currentStep: firstIncomplete,
    onboardingCompleted: onboardingCompleted,
  );
}

bool _isStepSkipped({
  required OnboardingStepDefinition definition,
  required bool clipboardSkipped,
  required bool accessibilitySkipped,
  required bool microphoneSkipped,
  required bool mediaAccessSkipped,
  required bool brightnessSkipped,
  required bool overlaySkipped,
}) {
  if (definition.id == OnboardingStepId.keyboardClipboard) {
    return clipboardSkipped;
  }
  if (definition.id == OnboardingStepId.accessibility) {
    return accessibilitySkipped;
  }
  if (definition.id == OnboardingStepId.microphoneForDictation) {
    return microphoneSkipped;
  }
  if (definition.id == OnboardingStepId.mediaSessionAccess) {
    return mediaAccessSkipped;
  }
  if (definition.id == OnboardingStepId.brightnessSystemSettings) {
    return brightnessSkipped;
  }
  if (definition.id == OnboardingStepId.overlay) {
    return overlaySkipped;
  }
  return false;
}

bool _isStepSupported({
  required OnboardingStepDefinition definition,
  required AndroidKeyboardStatus keyboardStatus,
}) {
  if (definition.id == OnboardingStepId.keyboardIme) {
    return keyboardStatus.supported;
  }
  return true;
}

bool _isStepSatisfied({
  required OnboardingStepDefinition definition,
  required AndroidOverlayStatus overlayStatus,
  required AndroidKeyboardStatus keyboardStatus,
}) {
  switch (definition.id) {
    case OnboardingStepId.overlay:
      return overlayStatus.overlayPermissionGranted && overlayStatus.enabled;
    case OnboardingStepId.keyboardClipboard:
      return keyboardStatus.clipboardSyncDesired;
    case OnboardingStepId.accessibility:
      return overlayStatus.accessibilityPermissionGranted;
    case OnboardingStepId.keyboardIme:
      return keyboardStatus.enabled && keyboardStatus.active;
    case OnboardingStepId.microphoneForDictation:
      return overlayStatus.recordAudioGranted;
    case OnboardingStepId.mediaSessionAccess:
      return keyboardStatus.mediaSessionAccessGranted;
    case OnboardingStepId.brightnessSystemSettings:
      return keyboardStatus.systemSettingsWriteGranted;
  }
}

String? _stepBlockerReason({
  required OnboardingStepDefinition definition,
  required AndroidOverlayStatus overlayStatus,
  required AndroidKeyboardStatus keyboardStatus,
}) {
  if (definition.id == OnboardingStepId.overlay) {
    if (!overlayStatus.overlayPermissionGranted) {
      return 'Overlay non autorisé: ignore cette étape si tu utilises uniquement le clavier.';
    }
    if (!overlayStatus.enabled) {
      return 'Overlay autorisé mais désactivé: active la bulle seulement si tu veux l’utiliser hors clavier.';
    }
    return null;
  }
  if (definition.id == OnboardingStepId.keyboardClipboard) {
    return keyboardStatus.clipboardSyncDesired
        ? null
        : 'Clipboard clavier désactivé: les copies restent disponibles via le système, mais CommandGlows ne les synchronise pas.';
  }
  if (definition.id == OnboardingStepId.accessibility) {
    return overlayStatus.accessibilityPermissionGranted
        ? null
        : 'Service Accessibilité désactivé: dictée en mode compatibilité.';
  }
  if (definition.id == OnboardingStepId.keyboardIme) {
    if (!keyboardStatus.supported) {
      return 'IME CommandGlows keyboard non disponible sur cet appareil.';
    }
    if (!keyboardStatus.enabled) {
      return 'Clavier CommandGlows keyboard non activé.';
    }
    if (!keyboardStatus.active) {
      return 'Le clavier CommandGlows keyboard n’est pas sélectionné actuellement.';
    }
    return null;
  }
  if (definition.id == OnboardingStepId.microphoneForDictation) {
    return overlayStatus.recordAudioGranted
        ? null
        : 'Microphone refusé: la dictée vocale est indisponible.';
  }
  if (definition.id == OnboardingStepId.mediaSessionAccess) {
    return keyboardStatus.mediaSessionAccessGranted
        ? null
        : 'Accès média désactivé: Now/App ne peuvent pas lire les sessions média.';
  }
  if (definition.id == OnboardingStepId.brightnessSystemSettings) {
    return keyboardStatus.systemSettingsWriteGranted
        ? null
        : 'Modification système désactivée: Bri-/Bri+ ne peuvent pas régler la luminosité.';
  }
  return null;
}

extension OnboardingStepDefinitionList on List<OnboardingStepDefinition> {
  OnboardingStepDefinition getById(OnboardingStepId id) {
    return firstWhere((item) => item.id == id);
  }
}
