import 'package:flutter/material.dart';

/// Tokens source de l'UI CommandGlows.
///
/// Cette classe expose la couche stable utilisée par `core/theme/app_theme.dart`.
/// Les noms et commentaires restent volontairement centrés sur CommandGlows pour
/// éviter de réintroduire des marques historiques dans l'app.
class CommandGlowsThemeTokens {
  // Typography
  static const fontSans = 'Manrope';
  static const fontDisplay = 'Cal Sans';
  static const fontMonospace = 'ui-monospace';
  static const List<String> fontFallback = <String>[
    'Manrope',
    'Instrument Sans',
    'Segoe UI',
    'Roboto',
    'Arial',
    'sans-serif',
  ];

  // Palette principale issue des tokens CSS du site (valeurs Oklch converties).
  static const Color black = Color(0xFF000000);
  static const Color white = Color(0xFFFFFFFF);
  static const Color siteBackground = Color(0xFF262626);
  static const Color siteForeground = Color(0xFFFCFCFC);
  static const Color siteCard = Color(0xFF2D2D2D);
  static const Color siteCardForeground = Color(0xFFFCFCFC);
  static const Color sitePopover = Color(0xFF262626);
  static const Color sitePopoverForeground = Color(0xFFFCFCFC);
  static const Color sitePrimary = Color(0xFFFCFCFC);
  static const Color sitePrimaryForeground = Color(0xFF343A40);
  static const Color siteSecondary = Color(0xFF444444);
  static const Color siteSecondaryForeground = Color(0xFFFCFCFC);
  static const Color siteMuted = Color(0xFF444444);
  static const Color siteMutedForeground = Color(0xFFB4B4B4);
  static const Color siteAccent = Color(0xFF444444);
  static const Color siteAccentForeground = Color(0xFFFCFCFC);
  static const Color siteDestructive = Color(0xFFB91C1C);
  static const Color siteDestructiveForeground = Color(0xFFFFE8E6);
  static const Color siteText = Color(0xFF0F172A);
  static const Color siteBorder = Color(0xFF3D3D3D);
  static const Color siteInput = Color(0xFF444444);
  static const Color siteRing = Color(0xFF6F747F);
  static const Color siteScrim = Color(0x66000000);
  static const Color siteCodeText = Color(0xFFE2E8F0);
  static const Color siteBadgeBg = Color(0xFF27272A);
  static const Color siteBadgeText = Color(0xFFF4F4F5);
  static const Color siteTextOnDarkMuted = Color(0xB3FFFFFF);
  static const Color siteBorderSubtle = Color(0x0D000000);
  static const Color siteBorderDarkSubtle = Color(0x1AFFFFFF);
  static const Color siteWhiteSubtle = Color(0x1AFFFFFF);

  // Material theme composition tokens for `app_theme.dart`.
  static const Color themeLightPrimary = Color(0xFF2FAE75);
  static const Color themeLightOnPrimary = Color(0xFFFFFFFF);
  static const Color themeLightPrimaryContainer = Color(0xFFE8F3EC);
  static const Color themeLightOnPrimaryContainer = Color(0xFF1C3929);
  static const Color themeLightSecondary = Color(0xFF4F5B55);
  static const Color themeLightOnSecondary = Color(0xFFFFFFFF);
  static const Color themeLightSecondaryContainer = Color(0xFFE7E4DA);
  static const Color themeLightOnSecondaryContainer = Color(0xFF2A342E);
  static const Color themeLightSurface = Color(0xFFF2F1EC);
  static const Color themeLightOnSurface = Color(0xFF20211F);
  static const Color themeLightSurfaceContainerLowest = Color(0xFFE9E5D8);
  static const Color themeLightSurfaceContainerLow = Color(0xFFF8F7F3);
  static const Color themeLightSurfaceContainer = Color(0xFFFFFFFF);
  static const Color themeLightSurfaceContainerHighest = Color(0xFFD9D4CA);
  static const Color themeLightOutline = Color(0xFFC6C0B2);
  static const Color themeLightOutlineVariant = Color(0xFFDDD6C8);
  static const Color themeDarkPrimary = Color(0xFF36B384);
  static const Color themeDarkOnPrimary = Color(0xFF09130F);
  static const Color themeDarkPrimaryContainer = Color(0xFF24312A);
  static const Color themeDarkOnPrimaryContainer = Color(0xFFD4F7E5);
  static const Color themeDarkSecondary = Color(0xFF5B6A60);
  static const Color themeDarkOnSecondary = Color(0xFFE7F3EB);
  static const Color themeDarkSecondaryContainer = Color(0xFF1F2924);
  static const Color themeDarkOnSecondaryContainer = Color(0xFFDBF4E3);
  static const Color themeDarkSurface = Color(0xFF121815);
  static const Color themeDarkOnSurface = Color(0xFFF1F5F9);
  static const Color themeDarkSurfaceContainerLowest = Color(0xFF0A0F0C);
  static const Color themeDarkSurfaceContainerLow = Color(0xFF151B18);
  static const Color themeDarkSurfaceContainer = Color(0xFF1E2724);
  static const Color themeDarkSurfaceContainerHighest = Color(0xFF2A3330);
  static const Color themeDarkOutline = Color(0xFF52635A);
  static const Color themeDarkOutlineVariant = Color(0xFF3A4840);

  static const Color themeGradientDarkMid = Color(0xFF1F1F1F);
  static const Color themeGradientLightMid = Color(0xFFEDEBE3);
  static const double themeRadiusMd = 10.0;
  static const double themeRadiusPill = 9999.0;

  // Typography values used in Flutter-specific heading scale.
  static const double typographyLg = 17.0;
  static const double typographyH3 = 22.0;
  static const double typographyH2 = 28.0;
  static const double typographyH1 = 34.0;

  // Light companion palette for app screens that still support Light/System.
  static const Color appLightBackground = Color(0xFFF4F3EE);
  static const Color appLightSurface = Color(0xFFFAFAF7);
  static const Color appLightCard = Color(0xFFFFFFFF);
  static const Color appLightMuted = Color(0xFFE7E5DE);
  static const Color appLightMutedForeground = Color(0xFF5F5F5A);
  static const Color appLightBorder = Color(0xFFD8D5CC);
  static const Color appLightBorderSubtle = Color(0x1A262626);
  static const Color appLightText = Color(0xFF171717);
  static const Color appLightInput = Color(0xFFFFFFFF);

  // App action palette: source historique monochrome, surface d'exposition
  // alignée avec la direction CommandGlows.
  static const Color appActionLight = Color(0xFF262626);
  static const Color appActionOnLight = Color(0xFFFCFCFC);
  static const Color appActionDark = Color(0xFFFCFCFC);
  static const Color appActionOnDark = Color(0xFF343A40);

  // Raysons (root radius + variants).
  static const double siteRadius = 16.0;
  static const double siteRadiusSm = siteRadius - 4.0;
  static const double siteRadiusMd = siteRadius - 2.0;
  static const double siteRadiusLg = siteRadius;
  static const double siteRadiusXl = siteRadius + 4.0;
  static const double siteRadius2xl = siteRadius + 8.0;

  // Typographie.
  static const double typographyXs = 12.0;
  static const double typographySm = 14.0;
  static const double typographyBase = 16.0;
  static const double typographyMd = 20.0;
  static const double typographyDisplayLg = 24.0;
  static const double typographyXl = 32.0;
  static const double typographyXxl = 40.0;
  static const double lineHeightTight = 1.2;
  static const double lineHeightSnug = 1.3;
  static const double lineHeightNormal = 1.6;
  static const double trackingWide = 0.04;
  static const double trackingWider = 0.08;

  // Espacement.
  static const double spacing1 = 4.0;
  static const double spacing2 = 8.0;
  static const double spacing3 = 12.0;
  static const double spacing4 = 16.0;
  static const double spacing5 = 20.0;
  static const double spacing6 = 24.0;
  static const double spacing8 = 32.0;
  static const double spacing10 = 40.0;
  static const double spacing12 = 48.0;
  static const double spacing16 = 64.0;
  static const double spacing20 = 80.0;
  static const double spacing24 = 96.0;

  // Layout tokens (shared across Flutter pages).
  static const double navRailBreakpoint = 720.0;
  static const double navRailExtendedBreakpoint = 980.0;
  static const double keyboardPreviewFrameMaxWidth = 760.0;
  static const double keyboardPreviewDropdownWidth = 220.0;
  static const double settingsFeatureCardWidth = 240.0;
  static const double actionRailMinWidthLarge = 230.0;
  static const double actionRailMinWidthSmall = 130.0;
  static const double customActionChipWidth = 210.0;
  static const double keyboardPreviewStatusHeight = 30.0;
  static const double authFormMaxWidth = 460.0;
  static const double authGateLoadingCardWidth = 420.0;
  static const double authGateErrorCardWidth = 480.0;
  static const double authWebSignInButtonHeight = 44.0;
  static const double authWebSignInButtonMinWidth = 240.0;
  static const double authWebSignInButtonMaxWidth = 400.0;
  static const double authWebSignInButtonDisabledAlpha = 0.55;
  static const double keyboardPreviewControlHeight = 48.0;
  static const double keyboardPreviewRowHeightTall = 48.0;
  static const double keyboardPreviewRowHeight = 46.0;
  static const double keyboardPreviewRowHeightCompact = 40.0;
  static const double keyboardPreviewRowHeightMini = 40.0;
  static const double keyboardKeyBorderWidth = 1.0;
  static const double keyboardKeyDebugBorderWidth = 1.3;
  static const double keyboardCornerLabelPadding = 4.0;
  static const double keyboardWeightScale = 100.0;
  static const double keyboardSyncDialogWidth = 540.0;
  static const double keyboardCornerPresetDropdownWidth = 280.0;
  static const double keyboardPreviewPinnedBadgeInset = 3.0;

  // Motion / settings slider tokens.
  static const double appAnimationFast = 0.22;
  static const double appAnimationBase = 1.0;
  static const int overlaySizeDivisions = 6;
  static const int overlayOpacityDivisions = 5;
  static const double overlayBubbleSizeMin = 0.8;
  static const double overlayBubbleSizeMax = 1.4;
  static const double overlayBubbleOpacityMin = 0.5;
  static const double overlayBubbleOpacityMax = 1.0;
  static const double overlayBubbleDefaultSize = 1.0;
  static const double overlayBubbleDefaultOpacity = 0.9;

  // Surfaces and state token values used in Flutter theme composition.
  static const double surfaceSubtleAlpha = 0.72;
  static const double textFieldFillAlpha = 0.72;
  static const double cardShadowAlpha = 0.18;
  static const double darkCardShadowAlpha = 0.42;
  static const double textFieldBorderWidth = 1.5;
  static const double cardElevationLight = 2.0;
  static const double cardElevationDark = 8.0;
  static const double appBarElevation = 0.0;
  static const double dividerThickness = 1.0;
  static const double elevationOverlay = 18.0;
  static const double themeRadiusXxl = 28.0;

  // Screen-specific layout and visual tokens.
  static const double appShellBottomNavIconBoxSize = 32.0;
  static const double appShellBottomNavSparkBadgeTop = 3.0;
  static const double appShellBottomNavSparkBadgeRight = 4.0;
  static const double appShellBottomNavSparkBorderWidth = 1.2;
  static const double appShellUtilityIconBoxSize = 24.0;
  static const double appShellOnboardingDotSize = 28.0;
  static const double appShellOnboardingDotIconSize = 14.0;
  static const double settingsThemePreviewLabelFontSize = 11.0;
  static const double settingsThemePreviewSwatchHeight = 22.0;
  static const double settingsDiagnosticLogLineHeight = 1.35;
  static const double voiceRecordingSurfaceWidth = 22.0;
  static const double voiceRecordingSurfaceHeight = 18.0;
  static const double voiceRecordingBarWidth = 3.0;
  static const double voiceRecordingBarHeightBase = 6.0;
  static const double voiceRecordingBarHeightRange = 10.0;
  static const double voiceRecordingSurfaceRadius = 28.0;

  // Motion.
  static const Duration motionInstant = Duration(milliseconds: 120);
  static const Duration motionMicro = Duration(milliseconds: 80);
  static const Duration motionFast = Duration(milliseconds: 150);
  static const Duration motionBase = Duration(milliseconds: 200);
  static const Duration motionSlow = Duration(milliseconds: 300);
  static const Duration motionLong = Duration(milliseconds: 800);
  static const Duration motionNavSelected = Duration(milliseconds: 280);
  static const Duration motionNavUnselected = Duration(milliseconds: 160);
  static const Duration motionVoiceAction = Duration(milliseconds: 180);
  static const Duration motionVoiceBar = Duration(milliseconds: 90);
  static const Duration motionOnboardingPulse = Duration(milliseconds: 550);
  static const Cubic motionStandard = Cubic(0.22, 1, 0.36, 1);
  static const Cubic motionSpring = Cubic(0.34, 1.56, 0.64, 1);

  // Composants d'app UI conservés pour la continuité de l'app Flutter.
  static const Color brandPrimary = appActionLight;
  static const Color brandPrimaryDark = appActionDark;
  static const Color brandSecondary = siteSecondary;
  static const Color brandSuccess = Color(0xFF16A34A);
  static const Color brandWarning = Color(0xFFD97706);
  static const Color brandDanger = Color(0xFFDC2626);
  static const Color brandDangerLight = Color(0xFFF87171);
  static const Color brandInfo = Color(0xFF3B82F6);
  static const Color lightGray = appLightMuted;
  static const Color surfaceSunken = appLightBackground;
  static const Color surfaceRaised = appLightCard;
  static const Color surfaceSunkenDark = siteBackground;
  static const Color surfaceRaisedDark = siteCard;
  static const Color surfaceOverlayDark = siteSecondary;

  // Ombres profondes mais neutres pour les surfaces CommandGlows.
  static const Color shadowSoft = Color(0x1F000000);
  static const Color shadowCard = Color(0x33000000);
  static const Color shadowCardHover = Color(0x40000000);
  static const Color shadowCardLarge = Color(0x4D000000);
  static const Color shadowPrimary = Color(0x40000000);

  // Surfaces/typographies de rappel de la page clavier (existant app).
  static const Color keyboardPrivateFrame = Color(0xFFF6E8E2);
  static const Color keyboardDefaultFrame = Color(0xFFEEF1EE);
  static const Color keyboardStatusText = Color(0xFF333D38);
  static const Color keyboardKeyActive = Color(0xFF17795D);
  static const Color keyboardKeySpecial = Color(0xFFE0E6E3);
  static const Color keyboardKeyDisabled = Color(0xFFD6D9D7);
  static const Color keyboardKeyForeground = Color(0xFF1D2320);
  static const Color keyboardCornerLabel = Color(0xFF5C6762);
}
