import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:commandglows_app/core/theme/commandglows_theme_tokens.dart';

enum AppThemeMode {
  system(ThemeMode.system, 'System'),
  light(ThemeMode.light, 'Light'),
  dark(ThemeMode.dark, 'Dark');

  const AppThemeMode(this.materialMode, this.label);

  final ThemeMode materialMode;
  final String label;

  static AppThemeMode fromThemeMode(ThemeMode value) {
    return AppThemeMode.values.firstWhere(
      (mode) => mode.materialMode == value,
      orElse: () => AppThemeMode.system,
    );
  }
}

class AppColors {
  // Brand primitives exposés pour CommandGlows.
  // Keep the historical monochrome values as ColorScheme seed inputs while
  // exposing the primary colors that each resolved theme actually uses.
  static const seedLight = CommandGlowsThemeTokens.brandPrimary;
  static const seedDark = CommandGlowsThemeTokens.brandPrimaryDark;
  static const primary = CommandGlowsThemeTokens.themeLightPrimary;
  static const primaryDark = CommandGlowsThemeTokens.themeDarkPrimary;
  static const secondary = CommandGlowsThemeTokens.brandSecondary;
  static const accent = secondary;

  // Neutral primitives (site theme base + app continuity).
  static const dark = CommandGlowsThemeTokens.appLightText;
  static const gray = CommandGlowsThemeTokens.siteMutedForeground;
  static const neutral = gray;
  static const slate = gray;
  static const lightGray = CommandGlowsThemeTokens.lightGray;
  static const lightBlue = CommandGlowsThemeTokens.brandSecondary;
  static const white = CommandGlowsThemeTokens.white;
  static const black = CommandGlowsThemeTokens.black;
  static const transparent = Colors.transparent;

  // Semantic surfaces and text.
  static const textPrimary = dark;
  static const siteBackground = CommandGlowsThemeTokens.siteBackground;
  static const siteForeground = CommandGlowsThemeTokens.siteForeground;
  static const textMuted = gray;
  static const surfaceBase = CommandGlowsThemeTokens.appLightBackground;
  static const surfaceRaised = CommandGlowsThemeTokens.appLightCard;
  static const surfaceOverlay = CommandGlowsThemeTokens.appLightSurface;
  static const surfaceSunken = CommandGlowsThemeTokens.surfaceSunken;
  static const surfaceSubtle = lightGray;
  static const surfaceTint = CommandGlowsThemeTokens.appLightMuted;
  static const surfaceCard = surfaceRaised;
  static const surfaceBaseDark = siteBackground;
  static const surfaceRaisedDark = CommandGlowsThemeTokens.surfaceRaisedDark;
  static const surfaceOverlayDark = CommandGlowsThemeTokens.surfaceOverlayDark;
  static const surfaceSunkenDark = CommandGlowsThemeTokens.surfaceSunkenDark;
  static const overlayDark = CommandGlowsThemeTokens.siteWhiteSubtle;
  static const textOnDark = siteForeground;
  static const textOnDarkMuted = CommandGlowsThemeTokens.siteTextOnDarkMuted;
  static const codeText = CommandGlowsThemeTokens.siteCodeText;
  static const badgeBg = CommandGlowsThemeTokens.siteBadgeBg;
  static const badgeText = CommandGlowsThemeTokens.siteBadgeText;

  // Borders and overlays.
  static const borderSubtle = CommandGlowsThemeTokens.appLightBorderSubtle;
  static const borderLight = CommandGlowsThemeTokens.appLightBorder;
  static const borderDarkSubtle = CommandGlowsThemeTokens.siteBorderDarkSubtle;
  static const overlayScrim = CommandGlowsThemeTokens.siteScrim;

  // Support colors.
  static const success = CommandGlowsThemeTokens.brandSuccess;
  static const warning = CommandGlowsThemeTokens.brandWarning;
  static const danger = CommandGlowsThemeTokens.brandDanger;
  static const dangerLight = CommandGlowsThemeTokens.brandDangerLight;
  static const info = CommandGlowsThemeTokens.brandInfo;
  static const localOnlyCompatibility = accent;

  // Keyboard preview surface-specific tokens (copied from pages de debug).
  static const keyboardPrivateFrame = CommandGlowsThemeTokens.keyboardPrivateFrame;
  static const keyboardDefaultFrame = CommandGlowsThemeTokens.keyboardDefaultFrame;
  static const keyboardStatusText = CommandGlowsThemeTokens.keyboardStatusText;
  static const keyboardKeyActive = CommandGlowsThemeTokens.keyboardKeyActive;
  static const keyboardKeySpecial = CommandGlowsThemeTokens.keyboardKeySpecial;
  static const keyboardKeyDisabled = CommandGlowsThemeTokens.keyboardKeyDisabled;
  static const keyboardKeyForeground =
      CommandGlowsThemeTokens.keyboardKeyForeground;
  static const keyboardCornerLabel = CommandGlowsThemeTokens.keyboardCornerLabel;
}

class AppTypography {
  static const fontFamily = CommandGlowsThemeTokens.fontSans;
  static const fontFallback = CommandGlowsThemeTokens.fontFallback;
  static const monospace = CommandGlowsThemeTokens.fontMonospace;

  // CommandGlows scale (cohérente avec le thème site, bornée à un set court).
  static const xs = CommandGlowsThemeTokens.typographyXs;
  static const sm = CommandGlowsThemeTokens.typographySm;
  static const base = CommandGlowsThemeTokens.typographyBase;
  // Existing body/title styles resolve to 14px. Name that compatibility
  // mapping explicitly instead of hiding it behind the semantic base role.
  static const compactBodyCompatibility = CommandGlowsThemeTokens.typographySm;
  static const lg = CommandGlowsThemeTokens.typographyLg;
  static const h3 = CommandGlowsThemeTokens.typographyH3;
  static const h2 = CommandGlowsThemeTokens.typographyH2;
  static const h1 = CommandGlowsThemeTokens.typographyH1;

  static const leadingTight = CommandGlowsThemeTokens.lineHeightTight;
  static const leadingSnug = CommandGlowsThemeTokens.lineHeightSnug;
  static const leadingNormal = CommandGlowsThemeTokens.lineHeightNormal;
  static const leadingCompact =
      CommandGlowsThemeTokens.settingsDiagnosticLogLineHeight;
  static const leadingRelaxed = CommandGlowsThemeTokens.lineHeightRelaxed;

  static const trackingWide = CommandGlowsThemeTokens.trackingWide;
  static const trackingWider = CommandGlowsThemeTokens.trackingWider;
}

class AppFontWeights {
  static const regular = FontWeight.w400;
  static const medium = FontWeight.w500;
  static const semiBold = FontWeight.w600;
  static const bold = FontWeight.w700;
  static const xBold = FontWeight.w800;
  static const heavy = FontWeight.w900;
}

class AppSpacing {
  static const x1 = CommandGlowsThemeTokens.spacing1;
  static const x2 = CommandGlowsThemeTokens.spacing2;
  static const x3 = CommandGlowsThemeTokens.spacing3;
  static const x4 = CommandGlowsThemeTokens.spacing4;
  static const x5 = CommandGlowsThemeTokens.spacing5;
  static const x6 = CommandGlowsThemeTokens.spacing6;
  static const x8 = CommandGlowsThemeTokens.spacing8;
  static const x10 = CommandGlowsThemeTokens.spacing10;
  static const x12 = CommandGlowsThemeTokens.spacing12;
  static const x16 = CommandGlowsThemeTokens.spacing16;
  static const x20 = CommandGlowsThemeTokens.spacing20;
  static const x24 = CommandGlowsThemeTokens.spacing24;
}

class AppInsets {
  static const none = EdgeInsets.zero;
  static const screen = EdgeInsets.symmetric(
    horizontal: AppSpacing.x2,
    vertical: AppSpacing.x3,
  );
  static const card = EdgeInsets.all(AppSpacing.x3);
  static const compactCard = EdgeInsets.all(AppSpacing.x2 + AppSpacing.x1 / 2);
  static const button = EdgeInsets.symmetric(
    horizontal: AppSpacing.x3,
    vertical: AppSpacing.x2,
  );
  static const textButton = EdgeInsets.symmetric(
    horizontal: AppSpacing.x2,
    vertical: AppSpacing.x1,
  );
  static const input = EdgeInsets.symmetric(
    horizontal: AppSpacing.x3,
    vertical: AppSpacing.x2,
  );
  static const onboarding = EdgeInsets.fromLTRB(
    AppSpacing.x4,
    AppSpacing.x3,
    AppSpacing.x4,
    AppSpacing.x3,
  );
  static const progress = EdgeInsets.only(top: AppSpacing.x3);
  static const message = EdgeInsets.only(top: AppSpacing.x2);
  static const stack = EdgeInsets.only(top: AppSpacing.x2);
  static const keyboardControls = EdgeInsets.symmetric(
    horizontal: AppSpacing.x3,
  );
  static const keyboardPrivacy = EdgeInsets.fromLTRB(
    AppSpacing.x3,
    0,
    AppSpacing.x3,
    AppSpacing.x2,
  );
  static const overlayControls = EdgeInsets.fromLTRB(
    AppSpacing.x3,
    0,
    AppSpacing.x3,
    AppSpacing.x2,
  );
}

class AppSectionMetrics {
  static const double sectionGap = AppSpacing.x2;
  static const double sectionRunSpacing = sectionGap;
  static const double sectionColumnGap = AppSpacing.x2;
  static const double headerContentGap = AppSpacing.x1;
  static const EdgeInsets cardMargin = EdgeInsets.zero;
  static const EdgeInsets collapsibleSectionMargin = EdgeInsets.zero;
  static const EdgeInsets collapsibleTilePadding = EdgeInsets.symmetric(
    horizontal: AppSpacing.x2,
  );
  static const EdgeInsets collapsibleChildrenPadding = EdgeInsets.fromLTRB(
    AppSpacing.x2,
    0,
    AppSpacing.x2,
    AppSpacing.x2,
  );
}

class AppGaps {
  static const x1 = SizedBox(height: AppSpacing.x1);
  static const x2 = SizedBox(height: AppSpacing.x2);
  static const x3 = SizedBox(height: AppSpacing.x3);
  static const x4 = SizedBox(height: AppSpacing.x4);
  static const x5 = SizedBox(height: AppSpacing.x5);
  static const x6 = SizedBox(height: AppSpacing.x6);

  static const horizontalX2 = SizedBox(width: AppSpacing.x2);
  static const horizontalX3 = SizedBox(width: AppSpacing.x3);
}

class AppIconMetrics {
  static const sm = AppSpacing.x4;
  static const progressStroke = AppSpacing.x1 / 2;
  static const stepAvatarRadius = AppSpacing.x3;
  static const minTarget = CommandGlowsThemeTokens.minimumTouchTarget;
  static const listActionSpacing = AppSpacing.x1;
}

class AppButtonMetrics {
  static const minHeight = CommandGlowsThemeTokens.minimumTouchTarget;
  static const compactMinHeight = CommandGlowsThemeTokens.compactControlHeight;
}

class AppInputMetrics {
  static const minHeight = CommandGlowsThemeTokens.minimumTouchTarget;
  static const iconMinSize = CommandGlowsThemeTokens.minimumTouchTarget;
}

class AppNavigationMetrics {
  static const bottomBarHeight =
      CommandGlowsThemeTokens.navigationBottomBarHeight;
  static const bottomBarShadowBlur =
      CommandGlowsThemeTokens.navigationBottomBarShadowBlur;
  static const bottomBarShadowOffset = Offset(
    0,
    CommandGlowsThemeTokens.navigationBottomBarShadowOffsetY,
  );
  static const bottomBarLightAlpha =
      CommandGlowsThemeTokens.navigationBottomBarLightAlpha;
  static const bottomBarDarkAlpha =
      CommandGlowsThemeTokens.navigationBottomBarDarkAlpha;
  static const bottomBarLightShadowAlpha =
      CommandGlowsThemeTokens.navigationBottomBarLightShadowAlpha;
  static const bottomBarDarkShadowAlpha =
      CommandGlowsThemeTokens.navigationBottomBarDarkShadowAlpha;
  static const bottomIndicatorLightAlpha =
      CommandGlowsThemeTokens.navigationBottomIndicatorLightAlpha;
  static const bottomIndicatorDarkAlpha =
      CommandGlowsThemeTokens.navigationBottomIndicatorDarkAlpha;
  static const bottomIconSize =
      CommandGlowsThemeTokens.navigationBottomIconSize;
  static const bottomSelectedIconSize =
      CommandGlowsThemeTokens.navigationBottomSelectedIconSize;
  static const bottomNavIconBoxSize =
      CommandGlowsThemeTokens.appShellBottomNavIconBoxSize;
  static const bottomNavSparkBadgeTop =
      CommandGlowsThemeTokens.appShellBottomNavSparkBadgeTop;
  static const bottomNavSparkBadgeRight =
      CommandGlowsThemeTokens.appShellBottomNavSparkBadgeRight;
  static const bottomNavSparkBorderWidth =
      CommandGlowsThemeTokens.appShellBottomNavSparkBorderWidth;
  static const utilityIconBoxSize =
      CommandGlowsThemeTokens.appShellUtilityIconBoxSize;
  static const onboardingDotSize =
      CommandGlowsThemeTokens.appShellOnboardingDotSize;
  static const onboardingDotIconSize =
      CommandGlowsThemeTokens.appShellOnboardingDotIconSize;
  static const dividerThickness = CommandGlowsThemeTokens.dividerThickness;
}

class AppLayoutMetrics {
  static const onboardingOverlayMaxWidth =
      CommandGlowsThemeTokens.onboardingOverlayMaxWidth;
  static const settingsTwoColumnBreakpoint =
      CommandGlowsThemeTokens.settingsTwoColumnBreakpoint;
  static const settingsFeatureCardWidth =
      CommandGlowsThemeTokens.settingsFeatureCardWidth;
  static const actionRailMinWidthLarge =
      CommandGlowsThemeTokens.actionRailMinWidthLarge;
  static const actionRailMinWidthSmall =
      CommandGlowsThemeTokens.actionRailMinWidthSmall;
  static const authFormMaxWidth = CommandGlowsThemeTokens.authFormMaxWidth;
  static const authGateLoadingCardWidth =
      CommandGlowsThemeTokens.authGateLoadingCardWidth;
  static const authGateErrorCardWidth =
      CommandGlowsThemeTokens.authGateErrorCardWidth;
  static const authWebSignInButtonHeight =
      CommandGlowsThemeTokens.authWebSignInButtonHeight;
  static const authWebSignInButtonMinWidth =
      CommandGlowsThemeTokens.authWebSignInButtonMinWidth;
  static const authWebSignInButtonMaxWidth =
      CommandGlowsThemeTokens.authWebSignInButtonMaxWidth;
  static const authWebSignInButtonDisabledOpacity =
      CommandGlowsThemeTokens.authWebSignInButtonDisabledAlpha;
  static const customActionChipWidth =
      CommandGlowsThemeTokens.customActionChipWidth;
  static const keyboardSyncDialogWidth =
      CommandGlowsThemeTokens.keyboardSyncDialogWidth;
}

class AppBreakpoints {
  static const double navigationRail = CommandGlowsThemeTokens.navRailBreakpoint;
  static const double navigationRailExtended =
      CommandGlowsThemeTokens.navRailExtendedBreakpoint;
}

class AppKeyboardPreview {
  static const double maxWidth =
      CommandGlowsThemeTokens.keyboardPreviewFrameMaxWidth;
  static const double dropdownWidth =
      CommandGlowsThemeTokens.keyboardPreviewCompactDropdownWidth;
  static const double pinnedBadgeInset =
      CommandGlowsThemeTokens.keyboardPreviewPinnedBadgeInset;
  static const double statusHeight =
      CommandGlowsThemeTokens.keyboardPreviewStatusHeight;
  static const double rowHeightTiny =
      CommandGlowsThemeTokens.keyboardPreviewRowHeightMini;
  static const double rowHeightMini = rowHeightTiny;
  static const double rowHeightCompact =
      CommandGlowsThemeTokens.keyboardPreviewRowHeightCompact;
  static const double rowHeightRegular =
      CommandGlowsThemeTokens.keyboardPreviewRowHeight;
  static const double rowHeightControl =
      CommandGlowsThemeTokens.keyboardPreviewControlHeight;
  static const double keyBorderWidth =
      CommandGlowsThemeTokens.keyboardKeyBorderWidth;
  static const double keyDebugBorderWidth =
      CommandGlowsThemeTokens.keyboardKeyDebugBorderWidth;
  static const double cornerLabelPadding =
      CommandGlowsThemeTokens.keyboardCornerLabelPadding;
  static const double keyWeightScale = CommandGlowsThemeTokens.keyboardWeightScale;
}

class AppSliders {
  static const double overlayBubbleSizeMin =
      CommandGlowsThemeTokens.overlayBubbleSizeMin;
  static const double overlayBubbleSizeMax =
      CommandGlowsThemeTokens.overlayBubbleSizeMax;
  static const int overlaySizeDivisions =
      CommandGlowsThemeTokens.overlaySizeDivisions;
  static const double overlayBubbleOpacityMin =
      CommandGlowsThemeTokens.overlayBubbleOpacityMin;
  static const double overlayBubbleOpacityMax =
      CommandGlowsThemeTokens.overlayBubbleOpacityMax;
  static const int overlayOpacityDivisions =
      CommandGlowsThemeTokens.overlayOpacityDivisions;
  static const double overlayDefaultSize =
      CommandGlowsThemeTokens.overlayBubbleDefaultSize;
  static const double overlayDefaultOpacity =
      CommandGlowsThemeTokens.overlayBubbleDefaultOpacity;
}

class AppKeyboardStudioMetrics {
  static const double sliderLabelWidth =
      CommandGlowsThemeTokens.keyboardStudioSliderLabelWidth;
  static const double sliderValueWidth =
      CommandGlowsThemeTokens.keyboardStudioSliderValueWidth;
  static const double importExportDialogWidth =
      CommandGlowsThemeTokens.keyboardStudioImportExportDialogWidth;
  static const double colorFieldPicker =
      CommandGlowsThemeTokens.keyboardStudioColorFieldPicker;
  static const double colorFieldPickerIcon =
      CommandGlowsThemeTokens.keyboardStudioColorFieldPickerIcon;
  static const double previewPanelHeight =
      CommandGlowsThemeTokens.keyboardStudioPreviewPanelHeight;
  static const double colorChannelWidth =
      CommandGlowsThemeTokens.keyboardStudioColorChannelWidth;
  static const double colorValueWidth =
      CommandGlowsThemeTokens.keyboardStudioColorValueWidth;
  static const double fieldCornerRadius =
      CommandGlowsThemeTokens.keyboardStudioFieldCornerRadius;
  static const double presetDropdownWidth =
      CommandGlowsThemeTokens.keyboardCornerPresetDropdownWidth;
  static const double previewLabelFontSize =
      CommandGlowsThemeTokens.settingsThemePreviewLabelFontSize;
  static const double previewSwatchHeight =
      CommandGlowsThemeTokens.settingsThemePreviewSwatchHeight;
  static const double previewSwatchRadius =
      CommandGlowsThemeTokens.keyboardStudioPreviewSwatchRadius;
}

class AppVoiceMetrics {
  static const double recordingSurfaceWidth =
      CommandGlowsThemeTokens.voiceRecordingSurfaceWidth;
  static const double recordingSurfaceHeight =
      CommandGlowsThemeTokens.voiceRecordingSurfaceHeight;
  static const double recordingBarWidth =
      CommandGlowsThemeTokens.voiceRecordingBarWidth;
  static const double recordingBarHeightBase =
      CommandGlowsThemeTokens.voiceRecordingBarHeightBase;
  static const double recordingBarHeightRange =
      CommandGlowsThemeTokens.voiceRecordingBarHeightRange;
  static const double recordingSurfaceRadius =
      CommandGlowsThemeTokens.voiceRecordingSurfaceRadius;
}

class AppElevation {
  static const overlay = CommandGlowsThemeTokens.elevationOverlay;
  static const cardLight = CommandGlowsThemeTokens.cardElevationLight;
  static const cardDark = CommandGlowsThemeTokens.cardElevationDark;
}

class AppGradients {
  static LinearGradient shell(Brightness brightness) {
    if (brightness == Brightness.dark) {
      return const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          CommandGlowsThemeTokens.siteBackground,
          CommandGlowsThemeTokens.themeGradientDarkMid,
          CommandGlowsThemeTokens.siteCard,
        ],
        stops: [0, CommandGlowsThemeTokens.shellGradientDarkMidStop, 1],
      );
    }

    return const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        CommandGlowsThemeTokens.appLightBackground,
        CommandGlowsThemeTokens.appLightSurface,
        CommandGlowsThemeTokens.themeGradientLightMid,
      ],
      stops: [0, CommandGlowsThemeTokens.shellGradientLightMidStop, 1],
    );
  }
}

class AppRadii {
  static const sm = CommandGlowsThemeTokens.siteRadiusSm;
  static const md = CommandGlowsThemeTokens.themeRadiusMd;
  static const lg = CommandGlowsThemeTokens.siteRadiusLg;
  static const xl = CommandGlowsThemeTokens.siteRadiusXl;
  static const x2l = CommandGlowsThemeTokens.siteRadius2xl;
  static const xxl = CommandGlowsThemeTokens.themeRadiusXxl;
  static const pill = CommandGlowsThemeTokens.themeRadiusPill;
}

class AppShadows {
  static const sm = [
    BoxShadow(
      color: CommandGlowsThemeTokens.shadowSoft,
      blurRadius: CommandGlowsThemeTokens.shadowSmallBlur,
      offset: Offset(0, CommandGlowsThemeTokens.shadowSmallOffsetY),
    ),
  ];

  static const card = [
    BoxShadow(
      color: CommandGlowsThemeTokens.shadowCard,
      blurRadius: CommandGlowsThemeTokens.shadowCardBlur,
      offset: Offset(0, CommandGlowsThemeTokens.shadowCardOffsetY),
    ),
  ];

  static const cardHover = [
    BoxShadow(
      color: CommandGlowsThemeTokens.shadowCardHover,
      blurRadius: CommandGlowsThemeTokens.shadowCardHoverBlur,
      offset: Offset(0, CommandGlowsThemeTokens.shadowCardHoverOffsetY),
    ),
  ];

  static const cardLarge = [
    BoxShadow(
      color: CommandGlowsThemeTokens.shadowCardLarge,
      blurRadius: CommandGlowsThemeTokens.shadowCardLargeBlur,
      offset: Offset(0, CommandGlowsThemeTokens.shadowCardLargeOffsetY),
    ),
  ];

  static const primary = [
    BoxShadow(
      color: CommandGlowsThemeTokens.shadowPrimary,
      blurRadius: CommandGlowsThemeTokens.shadowPrimaryBlur,
      offset: Offset(0, CommandGlowsThemeTokens.shadowPrimaryOffsetY),
    ),
  ];
}

class AppMotion {
  static const instant = CommandGlowsThemeTokens.motionInstant;
  static const micro = CommandGlowsThemeTokens.motionMicro;
  static const fast = CommandGlowsThemeTokens.motionFast;
  static const base = CommandGlowsThemeTokens.motionBase;
  static const slow = CommandGlowsThemeTokens.motionSlow;
  static const long = CommandGlowsThemeTokens.motionLong;
  static const navSelected = CommandGlowsThemeTokens.motionNavSelected;
  static const navUnselected = CommandGlowsThemeTokens.motionNavUnselected;
  static const voiceAction = CommandGlowsThemeTokens.motionVoiceAction;
  static const voiceBar = CommandGlowsThemeTokens.motionVoiceBar;
  static const onboardingPulse = CommandGlowsThemeTokens.motionOnboardingPulse;
  static const standardCurve = CommandGlowsThemeTokens.motionStandard;
  static const outCurve = Curves.easeOut;
  static const springCurve = CommandGlowsThemeTokens.motionSpring;
}

class AppTheme {
  static ThemeData get light => _build(
    ColorScheme.fromSeed(
      seedColor: AppColors.seedLight,
      brightness: Brightness.light,
    ).copyWith(
      primary: CommandGlowsThemeTokens.themeLightPrimary,
      onPrimary: AppColors.white,
      primaryContainer: CommandGlowsThemeTokens.themeLightPrimaryContainer,
      onPrimaryContainer: CommandGlowsThemeTokens.themeLightOnPrimaryContainer,
      secondary: CommandGlowsThemeTokens.themeLightSecondary,
      onSecondary: AppColors.white,
      secondaryContainer: CommandGlowsThemeTokens.themeLightSecondaryContainer,
      onSecondaryContainer: CommandGlowsThemeTokens.themeLightOnSecondaryContainer,
      tertiary: CommandGlowsThemeTokens.siteRing,
      onTertiary: AppColors.white,
      error: AppColors.danger,
      surface: CommandGlowsThemeTokens.themeLightSurface,
      onSurface: CommandGlowsThemeTokens.themeLightOnSurface,
      surfaceContainerLowest:
          CommandGlowsThemeTokens.themeLightSurfaceContainerLowest,
      surfaceContainerLow: CommandGlowsThemeTokens.themeLightSurfaceContainerLow,
      surfaceContainer: CommandGlowsThemeTokens.themeLightSurfaceContainer,
      surfaceContainerHighest:
          CommandGlowsThemeTokens.themeLightSurfaceContainerHighest,
      outline: CommandGlowsThemeTokens.themeLightOutline,
      outlineVariant: CommandGlowsThemeTokens.themeLightOutlineVariant,
    ),
  );

  static ThemeData get dark => _build(
    ColorScheme.fromSeed(
      seedColor: AppColors.seedLight,
      brightness: Brightness.dark,
    ).copyWith(
      primary: CommandGlowsThemeTokens.themeDarkPrimary,
      onPrimary: CommandGlowsThemeTokens.themeDarkOnPrimary,
      primaryContainer: CommandGlowsThemeTokens.themeDarkPrimaryContainer,
      onPrimaryContainer: CommandGlowsThemeTokens.themeDarkOnPrimaryContainer,
      secondary: CommandGlowsThemeTokens.themeDarkSecondary,
      onSecondary: CommandGlowsThemeTokens.themeDarkOnSecondary,
      secondaryContainer: CommandGlowsThemeTokens.themeDarkSecondaryContainer,
      onSecondaryContainer: CommandGlowsThemeTokens.themeDarkOnSecondaryContainer,
      tertiary: CommandGlowsThemeTokens.siteRing,
      onTertiary: AppColors.white,
      error: AppColors.dangerLight,
      surface: CommandGlowsThemeTokens.themeDarkSurface,
      onSurface: AppColors.textOnDark,
      surfaceContainerLowest:
          CommandGlowsThemeTokens.themeDarkSurfaceContainerLowest,
      surfaceContainerLow: CommandGlowsThemeTokens.themeDarkSurfaceContainerLow,
      surfaceContainer: CommandGlowsThemeTokens.themeDarkSurfaceContainer,
      surfaceContainerHighest:
          CommandGlowsThemeTokens.themeDarkSurfaceContainerHighest,
      outline: CommandGlowsThemeTokens.themeDarkOutline,
      outlineVariant: CommandGlowsThemeTokens.themeDarkOutlineVariant,
    ),
  );

  static ThemeData _build(ColorScheme colorScheme) {
    final textTheme = _textTheme(colorScheme);
    final iconTheme = IconThemeData(
      size: kIsWeb ? AppIconMetrics.sm * 1.3 : AppIconMetrics.sm,
      color: colorScheme.onSurfaceVariant,
    );
    final isDark = colorScheme.brightness == Brightness.dark;

    return ThemeData(
      colorScheme: colorScheme,
      useMaterial3: true,
      visualDensity: VisualDensity.compact,
      scaffoldBackgroundColor: colorScheme.surface,
      fontFamily: AppTypography.fontFamily,
      fontFamilyFallback: AppTypography.fontFallback,
      textTheme: textTheme,
      iconTheme: iconTheme,
      canvasColor: colorScheme.surface,
      appBarTheme: AppBarTheme(
        centerTitle: true,
        elevation: CommandGlowsThemeTokens.appBarElevation,
        scrolledUnderElevation: CommandGlowsThemeTokens.appBarElevation,
        backgroundColor: colorScheme.surface.withValues(
          alpha: CommandGlowsThemeTokens.appBarBackgroundAlpha,
        ),
        foregroundColor: colorScheme.onSurface,
        surfaceTintColor: AppColors.transparent,
        shape: Border(
          bottom: BorderSide(
            color: colorScheme.outlineVariant.withValues(
              alpha: CommandGlowsThemeTokens.appBarDividerAlpha,
            ),
            width: CommandGlowsThemeTokens.outlineWidth,
          ),
        ),
        titleTextStyle: textTheme.titleLarge?.copyWith(
          color: colorScheme.onSurface,
          fontWeight: AppFontWeights.xBold,
        ),
      ),
      cardTheme: CardThemeData(
        margin: AppSectionMetrics.cardMargin,
        elevation: CommandGlowsThemeTokens.appBarElevation,
        shadowColor: AppColors.black.withValues(
          alpha: isDark
              ? CommandGlowsThemeTokens.cardShadowDarkAlpha
              : CommandGlowsThemeTokens.cardShadowLightAlpha,
        ),
        color: isDark
            ? colorScheme.surfaceContainer
            : colorScheme.surfaceContainerLow,
        surfaceTintColor: AppColors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          side: BorderSide(
            color: colorScheme.outline,
            width: CommandGlowsThemeTokens.outlineWidth,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        isDense: true,
        constraints: const BoxConstraints(minHeight: AppInputMetrics.minHeight),
        prefixIconConstraints: const BoxConstraints(
          minWidth: AppInputMetrics.iconMinSize,
          minHeight: AppInputMetrics.minHeight,
        ),
        suffixIconConstraints: const BoxConstraints(
          minWidth: AppInputMetrics.iconMinSize,
          minHeight: AppInputMetrics.minHeight,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: BorderSide(
            color: colorScheme.outlineVariant,
            width: CommandGlowsThemeTokens.outlineWidth,
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: BorderSide(
            color: colorScheme.outlineVariant,
            width: CommandGlowsThemeTokens.outlineWidth,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: BorderSide(
            color: colorScheme.primary,
            width: CommandGlowsThemeTokens.focusOutlineWidth,
          ),
        ),
        filled: true,
        fillColor: isDark
            ? colorScheme.surfaceContainerLowest
            : colorScheme.surfaceContainerLow,
        contentPadding: AppInsets.input,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(0, AppButtonMetrics.minHeight),
          padding: AppInsets.button,
          backgroundColor: colorScheme.primary,
          foregroundColor: colorScheme.onPrimary,
          elevation: CommandGlowsThemeTokens.appBarElevation,
          shadowColor: AppColors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.md),
          ),
          textStyle: const TextStyle(fontWeight: AppFontWeights.bold),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, AppButtonMetrics.minHeight),
          padding: AppInsets.button,
          foregroundColor: colorScheme.primary,
          side: BorderSide(color: colorScheme.outline),
          backgroundColor: colorScheme.surfaceContainer.withValues(
            alpha: CommandGlowsThemeTokens.surfaceControlAlpha,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.md),
          ),
          textStyle: const TextStyle(fontWeight: AppFontWeights.bold),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          minimumSize: const Size(0, AppButtonMetrics.minHeight),
          padding: AppInsets.textButton,
          foregroundColor: colorScheme.primary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.sm),
          ),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          minimumSize: const Size(
            AppIconMetrics.minTarget,
            AppIconMetrics.minTarget,
          ),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: AppNavigationMetrics.bottomBarHeight,
        elevation: CommandGlowsThemeTokens.appBarElevation,
        indicatorColor: colorScheme.primary.withValues(
          alpha: CommandGlowsThemeTokens.navigationIndicatorAlpha,
        ),
        indicatorShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.pill),
        ),
        backgroundColor: colorScheme.surfaceContainerLow.withValues(
          alpha: CommandGlowsThemeTokens.navigationBackgroundAlpha,
        ),
        surfaceTintColor: AppColors.transparent,
        shadowColor: AppColors.transparent,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected
                ? colorScheme.primary
                : colorScheme.onSurfaceVariant,
            size: kIsWeb
                ? (selected
                      ? AppNavigationMetrics.bottomSelectedIconSize * 1.3
                      : AppNavigationMetrics.bottomIconSize * 1.3)
                : (selected
                      ? AppNavigationMetrics.bottomSelectedIconSize
                      : AppNavigationMetrics.bottomIconSize),
          );
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return textTheme.labelSmall?.copyWith(
            color: selected
                ? colorScheme.primary
                : colorScheme.onSurfaceVariant,
            fontWeight: selected ? AppFontWeights.bold : AppFontWeights.medium,
          );
        }),
        overlayColor: WidgetStateProperty.all(
          colorScheme.primary.withValues(
            alpha: CommandGlowsThemeTokens.navigationOverlayAlpha,
          ),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: colorScheme.outlineVariant.withValues(
          alpha: CommandGlowsThemeTokens.dividerAlpha,
        ),
        thickness: CommandGlowsThemeTokens.dividerThickness,
        space: 0,
      ),
      menuTheme: MenuThemeData(
        style: MenuStyle(
          backgroundColor: WidgetStateProperty.all(
            colorScheme.surfaceContainer,
          ),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadii.md),
              side: BorderSide(color: colorScheme.outline),
            ),
          ),
        ),
      ),
      dropdownMenuTheme: DropdownMenuThemeData(
        textStyle: textTheme.bodyMedium,
        menuStyle: MenuStyle(
          backgroundColor: WidgetStateProperty.all(
            colorScheme.surfaceContainer,
          ),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
          ),
          side: WidgetStateProperty.all(BorderSide(color: colorScheme.outline)),
        ),
        inputDecorationTheme: InputDecorationTheme(
          isDense: true,
          constraints: const BoxConstraints(
            minHeight: AppInputMetrics.minHeight,
          ),
          prefixIconConstraints: const BoxConstraints(
            minWidth: AppInputMetrics.iconMinSize,
            minHeight: AppInputMetrics.minHeight,
          ),
          suffixIconConstraints: const BoxConstraints(
            minWidth: AppInputMetrics.iconMinSize,
            minHeight: AppInputMetrics.minHeight,
          ),
          contentPadding: AppInsets.input,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadii.md),
            borderSide: BorderSide(color: colorScheme.outline),
          ),
        ),
      ),
      expansionTileTheme: ExpansionTileThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          side: BorderSide(color: colorScheme.outline),
        ),
        collapsedShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          side: BorderSide(color: colorScheme.outline),
        ),
        iconColor: colorScheme.primary,
        textColor: colorScheme.onSurface,
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: colorScheme.surface.withValues(
          alpha: CommandGlowsThemeTokens.navigationRailBackgroundAlpha,
        ),
        indicatorColor: colorScheme.primary.withValues(
          alpha: isDark
              ? CommandGlowsThemeTokens.navigationRailIndicatorDarkAlpha
              : CommandGlowsThemeTokens.navigationRailIndicatorLightAlpha,
        ),
        selectedIconTheme: IconThemeData(color: colorScheme.primary),
        selectedLabelTextStyle: textTheme.labelMedium?.copyWith(
          color: colorScheme.primary,
        ),
        unselectedIconTheme: IconThemeData(
          color: colorScheme.onSurface.withValues(
            alpha: CommandGlowsThemeTokens.navigationRailUnselectedAlpha,
          ),
        ),
        unselectedLabelTextStyle: textTheme.labelMedium?.copyWith(
          color: colorScheme.onSurface.withValues(
            alpha: CommandGlowsThemeTokens.navigationRailUnselectedAlpha,
          ),
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return isDark
                ? colorScheme.primary
                : colorScheme.onPrimaryContainer;
          }
          return isDark ? colorScheme.onSurface : colorScheme.surface;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return isDark
                ? colorScheme.primary.withValues(
                    alpha:
                        CommandGlowsThemeTokens.switchSelectedTrackDarkAlpha,
                  )
                : colorScheme.primaryContainer;
          }
          return colorScheme.onSurface.withValues(
            alpha: isDark
                ? CommandGlowsThemeTokens.switchUnselectedTrackDarkAlpha
                : CommandGlowsThemeTokens.switchUnselectedTrackLightAlpha,
          );
        }),
        trackOutlineColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return isDark
                ? colorScheme.primary.withValues(
                    alpha:
                        CommandGlowsThemeTokens.switchSelectedOutlineDarkAlpha,
                  )
                : colorScheme.onPrimaryContainer.withValues(
                    alpha: CommandGlowsThemeTokens
                        .switchSelectedOutlineLightAlpha,
                  );
          }
          return colorScheme.outline;
        }),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: colorScheme.primary,
        linearTrackColor: colorScheme.surfaceContainerHighest,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: colorScheme.surfaceContainerHighest,
        selectedColor: colorScheme.primaryContainer,
        labelStyle: textTheme.labelMedium,
        side: BorderSide(color: colorScheme.outlineVariant),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.pill),
        ),
      ),
      listTileTheme: ListTileThemeData(
        dense: true,
        iconColor: colorScheme.onSurface.withValues(
          alpha: CommandGlowsThemeTokens.listTileIconAlpha,
        ),
        textColor: colorScheme.onSurface,
        subtitleTextStyle: textTheme.bodySmall,
        minVerticalPadding: 0,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x2,
          vertical: 0,
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: colorScheme.surfaceContainer,
        surfaceTintColor: AppColors.transparent,
        elevation: AppElevation.overlay,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.lg),
          side: BorderSide(color: colorScheme.outlineVariant),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: isDark
            ? CommandGlowsThemeTokens.siteForeground
            : CommandGlowsThemeTokens.siteBackground,
        contentTextStyle: textTheme.bodyMedium?.copyWith(
          color: isDark
              ? CommandGlowsThemeTokens.sitePrimaryForeground
              : CommandGlowsThemeTokens.siteForeground,
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          textStyle: WidgetStateProperty.all(
            textTheme.labelLarge?.copyWith(fontWeight: AppFontWeights.bold),
          ),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
          ),
        ),
      ),
    );
  }

  static TextTheme _textTheme(ColorScheme colorScheme) {
    final base = Typography.material2021().black.apply(
      fontFamily: AppTypography.fontFamily,
      fontFamilyFallback: AppTypography.fontFallback,
      bodyColor: colorScheme.onSurface,
      displayColor: colorScheme.onSurface,
    );

    return base.copyWith(
      displayLarge: TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFallback,
        fontSize: AppTypography.h1,
        height: AppTypography.leadingTight,
        fontWeight: AppFontWeights.heavy,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      headlineLarge: TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFallback,
        fontSize: AppTypography.h2,
        height: AppTypography.leadingTight,
        fontWeight: AppFontWeights.xBold,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      headlineMedium: TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFallback,
        fontSize: AppTypography.h3,
        height: AppTypography.leadingSnug,
        fontWeight: AppFontWeights.bold,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      titleLarge: TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFallback,
        fontSize: AppTypography.lg,
        height: AppTypography.leadingSnug,
        fontWeight: AppFontWeights.bold,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      titleMedium: TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFallback,
        fontSize: AppTypography.compactBodyCompatibility,
        height: AppTypography.leadingNormal,
        fontWeight: AppFontWeights.bold,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      bodyLarge: TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFallback,
        fontSize: AppTypography.compactBodyCompatibility,
        height: AppTypography.leadingNormal,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      bodyMedium: TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFallback,
        fontSize: AppTypography.sm,
        height: AppTypography.leadingNormal,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      bodySmall: TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFallback,
        fontSize: AppTypography.xs,
        height: AppTypography.leadingNormal,
        letterSpacing: 0,
        color: colorScheme.onSurface.withValues(
          alpha: CommandGlowsThemeTokens.surfaceSubtleAlpha,
        ),
      ),
      labelLarge: TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFallback,
        fontSize: AppTypography.sm,
        height: AppTypography.leadingSnug,
        fontWeight: AppFontWeights.bold,
        letterSpacing: 0,
        color: colorScheme.onSurface,
      ),
      labelMedium: TextStyle(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: AppTypography.fontFallback,
        fontSize: AppTypography.xs,
        height: AppTypography.leadingSnug,
        fontWeight: AppFontWeights.bold,
        letterSpacing: AppTypography.trackingWide,
        color: colorScheme.onSurface,
      ),
    );
  }
}
