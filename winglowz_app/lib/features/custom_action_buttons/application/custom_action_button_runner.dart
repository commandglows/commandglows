import '../../../core/platform/desktop_overlay_bridge.dart';
import '../../../core/platform/platform_capabilities.dart';
import '../domain/custom_action_buttons.dart';

class CustomActionButtonRunResult {
  const CustomActionButtonRunResult({
    required this.success,
    required this.message,
  });

  final bool success;
  final String message;
}

class CustomActionButtonRunner {
  const CustomActionButtonRunner();

  Future<CustomActionButtonRunResult> run(
    CustomActionButtonRecord record,
  ) async {
    switch (record.action.kind) {
      case CustomActionKind.insertText:
        return _runText(record.action.trimmedValue);
      case CustomActionKind.keySequence:
        return _runDesktopSequence(record.action.trimmedValue);
      case CustomActionKind.clipboardCommand:
        return _runClipboardCommand(
          CustomClipboardCommandPresentation.fromName(
            record.action.trimmedValue,
          ),
        );
      case CustomActionKind.mediaCommand:
        final command = CustomMediaCommandPresentation.fromName(
          record.action.trimmedValue,
        );
        return CustomActionButtonRunResult(
          success: false,
          message:
              '${command.label} est enregistré comme action média. Exécution directe non disponible depuis cet écran sur ${PlatformCapabilities.currentPlatformLabel}.',
        );
      case CustomActionKind.keyboardExpression:
        return CustomActionButtonRunResult(
          success: false,
          message:
              'Action clavier CommandGlows enregistrée. Exécution directe non disponible depuis cet écran sur ${PlatformCapabilities.currentPlatformLabel}.',
        );
      case CustomActionKind.macro:
        return CustomActionButtonRunResult(
          success: false,
          message:
              'Macro enregistrée. L’exécution multi-actions sera activée quand le moteur de macro sera branché.',
        );
    }
  }

  Future<CustomActionButtonRunResult> _runText(String text) async {
    if (!PlatformCapabilities.desktopOverlaySupported) {
      return CustomActionButtonRunResult(
        success: false,
        message:
            'Livraison texte disponible seulement sur l’hôte overlay desktop natif.',
      );
    }
    try {
      final result = await DesktopOverlayBridge.deliverText(text);
      return CustomActionButtonRunResult(
        success: result.status != DesktopOverlayDeliveryStatus.failed,
        message: switch (result.status) {
          DesktopOverlayDeliveryStatus.delivered => 'Texte livré.',
          DesktopOverlayDeliveryStatus.clipboardOnly =>
            'Texte copié; collage direct indisponible.',
          DesktopOverlayDeliveryStatus.failed =>
            result.errorMessage ?? 'Livraison texte impossible.',
        },
      );
    } on DesktopOverlayBridgeException catch (error) {
      return CustomActionButtonRunResult(
        success: false,
        message: error.message,
      );
    }
  }

  Future<CustomActionButtonRunResult> _runDesktopSequence(String raw) async {
    if (!PlatformCapabilities.desktopOverlaySupported) {
      return CustomActionButtonRunResult(
        success: false,
        message:
            'Séquences clavier disponibles seulement sur l’hôte overlay desktop natif.',
      );
    }
    try {
      final sequence = DesktopKeySequence.parse(raw);
      final result = await DesktopOverlayBridge.deliverKeySequence(
        sequence.steps
            .map(
              (step) => DesktopOverlayKeyStroke(
                key: step.key,
                modifiers: step.modifiers
                    .map(DesktopOverlayKeyModifierFromDomain.fromDomain)
                    .toList(growable: false),
              ),
            )
            .toList(growable: false),
      );
      return CustomActionButtonRunResult(
        success: result.status == DesktopOverlayCommandStatus.delivered,
        message: switch (result.status) {
          DesktopOverlayCommandStatus.delivered => 'Séquence envoyée.',
          DesktopOverlayCommandStatus.unsupported =>
            result.errorMessage ?? 'Séquence non supportée sur cet hôte.',
          DesktopOverlayCommandStatus.failed =>
            result.errorMessage ?? 'Envoi de séquence impossible.',
        },
      );
    } on FormatException catch (error) {
      return CustomActionButtonRunResult(
        success: false,
        message: error.message,
      );
    } on DesktopOverlayBridgeException catch (error) {
      return CustomActionButtonRunResult(
        success: false,
        message: error.message,
      );
    }
  }

  Future<CustomActionButtonRunResult> _runClipboardCommand(
    CustomClipboardCommand command,
  ) async {
    final modifier = PlatformCapabilities.isMacOS
        ? DesktopKeyModifier.meta
        : DesktopKeyModifier.ctrl;
    return _runDesktopKeyStrokes(
      [
        DesktopKeyStroke(key: command.key, modifiers: [modifier]),
      ],
      deliveredMessage: '${command.label} envoyé.',
      unsupportedMessage:
          '${command.label} nécessite l’hôte overlay desktop natif.',
    );
  }

  Future<CustomActionButtonRunResult> _runDesktopKeyStrokes(
    List<DesktopKeyStroke> steps, {
    required String deliveredMessage,
    required String unsupportedMessage,
  }) async {
    if (!PlatformCapabilities.desktopOverlaySupported) {
      return CustomActionButtonRunResult(
        success: false,
        message: unsupportedMessage,
      );
    }
    try {
      final result = await DesktopOverlayBridge.deliverKeySequence(
        steps
            .map(
              (step) => DesktopOverlayKeyStroke(
                key: step.key,
                modifiers: step.modifiers
                    .map(DesktopOverlayKeyModifierFromDomain.fromDomain)
                    .toList(growable: false),
              ),
            )
            .toList(growable: false),
      );
      return CustomActionButtonRunResult(
        success: result.status == DesktopOverlayCommandStatus.delivered,
        message: switch (result.status) {
          DesktopOverlayCommandStatus.delivered => deliveredMessage,
          DesktopOverlayCommandStatus.unsupported =>
            result.errorMessage ?? 'Commande non supportée sur cet hôte.',
          DesktopOverlayCommandStatus.failed =>
            result.errorMessage ?? 'Envoi de commande impossible.',
        },
      );
    } on DesktopOverlayBridgeException catch (error) {
      return CustomActionButtonRunResult(
        success: false,
        message: error.message,
      );
    }
  }
}
