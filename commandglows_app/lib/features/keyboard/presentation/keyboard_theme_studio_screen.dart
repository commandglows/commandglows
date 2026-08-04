import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/android_keyboard_bridge.dart';
import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../application/keyboard_sync_providers.dart';
import '../domain/keyboard_models.dart';
import '../domain/keyboard_theme_validation.dart';

enum _SaveButtonFeedback { idle, saving, success, failure }

class KeyboardThemeStudioScreen extends ConsumerStatefulWidget {
  const KeyboardThemeStudioScreen({super.key});

  @override
  ConsumerState<KeyboardThemeStudioScreen> createState() =>
      _KeyboardThemeStudioScreenState();
}

class _KeyboardThemeStudioScreenState
    extends ConsumerState<KeyboardThemeStudioScreen> {
  KeyboardThemeConfig _saved = KeyboardThemeConfig.defaults();
  KeyboardThemeConfig _draft = KeyboardThemeConfig.defaults();
  bool _loading = true;
  bool _saving = false;
  _SaveButtonFeedback _saveFeedback = _SaveButtonFeedback.idle;
  Timer? _saveFeedbackResetTimer;
  int _saveFeedbackEpoch = 0;
  String? _message;
  String? _expandedStudioSectionId;

  bool get _dirty => _saved != _draft;
  KeyboardThemeValidationResult get _validation =>
      KeyboardThemeValidator.validate(_draft);

  bool _isStudioSectionExpanded(String id) => _expandedStudioSectionId == id;

  void _setStudioSectionExpanded(String id, bool expanded) {
    setState(() => _expandedStudioSectionId = expanded ? id : null);
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _saveFeedbackResetTimer?.cancel();
    super.dispose();
  }

  void _markSaveFeedback(_SaveButtonFeedback feedback, {Duration? resetAfter}) {
    _saveFeedbackResetTimer?.cancel();
    final epoch = ++_saveFeedbackEpoch;
    _saveFeedback = feedback;
    if (resetAfter == null) {
      return;
    }
    _saveFeedbackResetTimer = Timer(resetAfter, () {
      if (!mounted || epoch != _saveFeedbackEpoch) {
        return;
      }
      setState(() => _saveFeedback = _SaveButtonFeedback.idle);
    });
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final config = await AndroidKeyboardBridge.getKeyboardThemeConfig();
      if (!mounted) return;
      setState(() {
        _saved = config;
        _draft = config;
        _message = PlatformCapabilities.keyboardImeSupported
            ? 'Thème chargé. Les changements restent en brouillon jusqu’à l’enregistrement.'
            : 'Simulation sur ${PlatformCapabilities.currentPlatformLabel}: ${PlatformCapabilities.keyboardImeUnavailableReason}';
      });
    } catch (error) {
      if (!mounted) return;
      setState(
        () => _message = 'Chargement du thème clavier impossible: $error',
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final validation = _validation;
    if (!validation.canSave) {
      setState(() {
        _message = validation.errors.first;
        _markSaveFeedback(
          _SaveButtonFeedback.failure,
          resetAfter: const Duration(milliseconds: 2200),
        );
      });
      return;
    }
    if (!PlatformCapabilities.keyboardImeSupported) {
      setState(() {
        _message =
            'L’enregistrement du thème clavier natif est réservé à Android.';
        _markSaveFeedback(
          _SaveButtonFeedback.failure,
          resetAfter: const Duration(milliseconds: 2200),
        );
      });
      return;
    }
    setState(() {
      _saving = true;
      _markSaveFeedback(_SaveButtonFeedback.saving);
    });
    try {
      final saved = await AndroidKeyboardBridge.setKeyboardThemeConfig(_draft);
      if (!mounted) return;
      setState(() {
        _saved = saved;
        _draft = saved;
        _message = 'Thème clavier enregistré.';
        _markSaveFeedback(
          _SaveButtonFeedback.success,
          resetAfter: const Duration(milliseconds: 2200),
        );
      });
      ref
          .read(keyboardSyncChangeNotifierProvider.notifier)
          .markKeyboardProfileChanged();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _message = 'Enregistrement du thème clavier impossible: $error';
        _markSaveFeedback(
          _SaveButtonFeedback.failure,
          resetAfter: const Duration(milliseconds: 2200),
        );
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _reset() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      setState(() {
        _draft = KeyboardThemeConfig.defaults();
        _message =
            'Brouillon réinitialisé avec les valeurs par défaut (simulation).';
      });
      return;
    }
    try {
      final reset = await AndroidKeyboardBridge.resetKeyboardThemeConfig();
      if (!mounted) return;
      setState(() {
        _saved = reset;
        _draft = reset;
        _message = 'Thème clavier réinitialisé avec les valeurs par défaut.';
      });
      ref
          .read(keyboardSyncChangeNotifierProvider.notifier)
          .markKeyboardProfileChanged();
    } catch (error) {
      if (!mounted) return;
      setState(
        () => _message = 'Réinitialisation du thème clavier impossible: $error',
      );
    }
  }

  Future<void> _importImage() async {
    try {
      final result = await AndroidKeyboardBridge.importKeyboardThemeImage();
      final path = result['path'] as String?;
      if (!mounted) {
        return;
      }
      if (path == null || path.trim().isEmpty) {
        setState(() => _message = 'Import d’image impossible: chemin vide.');
        return;
      }
      setState(() {
        _draft = _draft.copyWith(useImage: true, backgroundImagePath: path);
        _message = 'Image importée pour le fond du clavier.';
      });
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Import d’image impossible (${error.code}): ${error.message}',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _message = 'Import d’image impossible: $error');
    }
  }

  Future<void> _exportJson() async {
    final jsonText = const JsonEncoder.withIndent('  ').convert(_draft.toMap());
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Exporter le thème JSON'),
        content: SizedBox(
          width: 520,
          child: SelectableText(jsonText, key: const Key('theme-export-json')),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  Future<void> _importJson() async {
    final controller = TextEditingController();
    final raw = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Importer un thème JSON'),
        content: SizedBox(
          width: 520,
          child: TextField(
            key: const Key('theme-import-json-field'),
            controller: controller,
            minLines: 8,
            maxLines: 12,
            decoration: const InputDecoration(
              hintText: '{"version":1,"presetId":"..."}',
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('Prévisualiser l’import'),
          ),
        ],
      ),
    );
    if (raw == null) return;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        setState(
          () => _message =
              'Import du thème impossible: le JSON doit être un objet.',
        );
        return;
      }
      final imported = KeyboardThemeConfig.fromMap(
        Map<Object?, Object?>.from(decoded),
      );
      final validation = KeyboardThemeValidator.validate(imported);
      if (!validation.canSave) {
        setState(
          () => _message = 'Import du thème bloqué: ${validation.errors.first}',
        );
        return;
      }
      setState(() {
        _draft = imported;
        _message =
            'Thème JSON importé dans le brouillon. Appuie sur Enregistrer pour appliquer.';
      });
    } catch (error) {
      setState(() => _message = 'Import du thème impossible: JSON invalide.');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final mediaQuery = MediaQuery.of(context);
    final safeBottomPadding = mediaQuery.viewPadding.bottom;
    final saveFeedback = _saving ? _SaveButtonFeedback.saving : _saveFeedback;
    return Scaffold(
      appBar: AppBar(title: const Text('Studio de thème clavier')),
      body: CustomScrollView(
        slivers: [
          SliverPersistentHeader(
            pinned: true,
            delegate: _StickyPreviewHeaderDelegate(
              theme: _draft,
              topPadding: AppSpacing.x2,
              dirty: _dirty,
              saving: _saving,
              saveFeedback: saveFeedback,
              validation: _validation,
              onPresetChanged: (value) {
                if (value == null) return;
                final brightness = Theme.of(context).brightness;
                setState(
                  () => _draft = KeyboardThemePresetCatalog.configFor(
                    value,
                    brightness: brightness,
                  ),
                );
              },
              onDiscard: _dirty ? () => setState(() => _draft = _saved) : null,
              onReset: _saving ? null : _reset,
              onSave: _saving || !_validation.canSave ? null : _save,
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(
              AppSpacing.x4,
              AppSpacing.x2,
              AppSpacing.x4,
              AppSpacing.x4 + safeBottomPadding,
            ),
            sliver: SliverList.list(
              children: [
                _StudioSection(
                  id: 'background',
                  title: 'Fond',
                  subtitle: 'Utilise un fond uni ou un dégradé.',
                  expanded: _isStudioSectionExpanded('background'),
                  onExpansionChanged: _setStudioSectionExpanded,
                  child: Column(
                    children: [
                      SwitchListTile.adaptive(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Fond en dégradé'),
                        value: _draft.useGradient,
                        onChanged: (value) => setState(
                          () => _draft = _draft.copyWith(useGradient: value),
                        ),
                      ),
                      DropdownButtonFormField<KeyboardThemeGradientStyle>(
                        key: ValueKey(
                          'theme-gradient-${_draft.gradientStyle.name}',
                        ),
                        initialValue: _draft.gradientStyle,
                        decoration: const InputDecoration(
                          labelText: 'Style de dégradé',
                        ),
                        items: KeyboardThemeGradientStyle.values
                            .map(
                              (style) => DropdownMenuItem(
                                value: style,
                                child: Text(_gradientLabel(style)),
                              ),
                            )
                            .toList(growable: false),
                        onChanged: _draft.useGradient
                            ? (style) {
                                if (style == null) return;
                                setState(
                                  () => _draft = _draft.copyWith(
                                    gradientStyle: style,
                                  ),
                                );
                              }
                            : null,
                      ),
                      SwitchListTile.adaptive(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Image de fond'),
                        value: _draft.useImage,
                        onChanged: (value) => setState(
                          () => _draft = _draft.copyWith(useImage: value),
                        ),
                      ),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: OutlinedButton.icon(
                          onPressed: _importImage,
                          icon: const Icon(Icons.image_outlined),
                          label: const Text('Importer une image'),
                        ),
                      ),
                      if (_draft.backgroundImagePath != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.x2),
                          child: Text(
                            'Image : ${_draft.backgroundImagePath}',
                            style: Theme.of(context).textTheme.bodySmall,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      _SliderField(
                        label: 'Opacité des touches',
                        value: _draft.keyboardOpacity,
                        min: 0.25,
                        max: 1,
                        divisions: 15,
                        valueLabel:
                            '${(_draft.keyboardOpacity * 100).round()}%',
                        onChanged: (value) => setState(
                          () =>
                              _draft = _draft.copyWith(keyboardOpacity: value),
                        ),
                      ),
                      _ColorField(
                        label: 'Début du fond',
                        value: _draft.backgroundStartColor,
                        onChanged: (color) => setState(
                          () => _draft = _draft.copyWith(
                            backgroundStartColor: color,
                          ),
                        ),
                      ),
                      _ColorField(
                        label: 'Fin du fond',
                        value: _draft.backgroundEndColor,
                        onChanged: (color) => setState(
                          () => _draft = _draft.copyWith(
                            backgroundEndColor: color,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: AppSectionMetrics.sectionGap),
                _StudioSection(
                  id: 'keys',
                  title: 'Touches',
                  subtitle:
                      'Couleurs principales appliquées par le rendu natif du clavier.',
                  expanded: _isStudioSectionExpanded('keys'),
                  onExpansionChanged: _setStudioSectionExpanded,
                  child: Column(
                    children: [
                      _ColorField(
                        label: 'Couleur des touches',
                        value: _draft.keyColor,
                        onChanged: (c) => setState(
                          () => _draft = _draft.copyWith(keyColor: c),
                        ),
                      ),
                      _ColorField(
                        label: 'Touche spéciale',
                        value: _draft.specialKeyColor,
                        onChanged: (c) => setState(
                          () => _draft = _draft.copyWith(specialKeyColor: c),
                        ),
                      ),
                      _ColorField(
                        label: 'Touche active',
                        value: _draft.activeKeyColor,
                        onChanged: (c) => setState(
                          () => _draft = _draft.copyWith(activeKeyColor: c),
                        ),
                      ),
                      _ColorField(
                        label: 'Touche pressée',
                        value: _draft.pressedKeyColor,
                        onChanged: (c) => setState(
                          () => _draft = _draft.copyWith(pressedKeyColor: c),
                        ),
                      ),
                      _ColorField(
                        label: 'Texte',
                        value: _draft.textColor,
                        onChanged: (c) => setState(
                          () => _draft = _draft.copyWith(textColor: c),
                        ),
                      ),
                      _ColorField(
                        label: 'Texte d’angle',
                        value: _draft.cornerTextColor,
                        onChanged: (c) => setState(
                          () => _draft = _draft.copyWith(cornerTextColor: c),
                        ),
                      ),
                      _SliderField(
                        label: 'Opacité du texte d’angle',
                        value: _draft.cornerTextOpacity,
                        min: 0,
                        max: 0.85,
                        divisions: 17,
                        valueLabel:
                            '${(_draft.cornerTextOpacity * 100).round()}%',
                        onChanged: (value) => setState(
                          () => _draft = _draft.copyWith(
                            cornerTextOpacity: value,
                          ),
                        ),
                      ),
                      _ColorField(
                        label: 'Texte de statut',
                        value: _draft.statusTextColor,
                        onChanged: (c) => setState(
                          () => _draft = _draft.copyWith(statusTextColor: c),
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: AppSectionMetrics.sectionGap),
                _StudioSection(
                  id: 'spacing',
                  title: 'Espacement',
                  subtitle:
                      'Règle la densité tactile: sans écart pour de grandes cibles, avec plus d’air pour le style visuel.',
                  expanded: _isStudioSectionExpanded('spacing'),
                  onExpansionChanged: _setStudioSectionExpanded,
                  child: Column(
                    children: [
                      _SliderField(
                        label: 'Écart des touches',
                        value: _draft.keyHorizontalGap,
                        min: 0,
                        max: 16,
                        divisions: 16,
                        valueLabel: '${_draft.keyHorizontalGap.round()} px',
                        onChanged: (value) => setState(
                          () =>
                              _draft = _draft.copyWith(keyHorizontalGap: value),
                        ),
                      ),
                      _SliderField(
                        label: 'Écart des rangées',
                        value: _draft.rowVerticalGap,
                        min: 0,
                        max: 16,
                        divisions: 16,
                        valueLabel: '${_draft.rowVerticalGap.round()} px',
                        onChanged: (value) => setState(
                          () => _draft = _draft.copyWith(rowVerticalGap: value),
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: AppSectionMetrics.sectionGap),
                _StudioSection(
                  id: 'borders',
                  title: 'Bordures et ombres',
                  subtitle:
                      'Touches arrondies, bordures fines et ombres maîtrisées.',
                  expanded: _isStudioSectionExpanded('borders'),
                  onExpansionChanged: _setStudioSectionExpanded,
                  child: Column(
                    children: [
                      _ColorField(
                        label: 'Bordure',
                        value: _draft.borderColor,
                        onChanged: (c) => setState(
                          () => _draft = _draft.copyWith(borderColor: c),
                        ),
                      ),
                      _ColorField(
                        label: 'Ombre',
                        value: _draft.shadowColor,
                        onChanged: (c) => setState(
                          () => _draft = _draft.copyWith(shadowColor: c),
                        ),
                      ),
                      _SliderField(
                        label: 'Bordure',
                        value: _draft.borderWidth,
                        min: 0,
                        max: 4,
                        divisions: 8,
                        valueLabel:
                            '${_draft.borderWidth.toStringAsFixed(1)} px',
                        onChanged: (value) => setState(
                          () => _draft = _draft.copyWith(borderWidth: value),
                        ),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        value: _draft.keyReliefEnabled,
                        onChanged: (value) => setState(
                          () =>
                              _draft = _draft.copyWith(keyReliefEnabled: value),
                        ),
                        title: const Text('Relief'),
                        subtitle: const Text(
                          'Ajoute un bord de touche physique intégré qui s’enfonce à l’appui.',
                        ),
                      ),
                      _SliderField(
                        label: 'Profondeur du relief',
                        value: _draft.keyReliefDepth,
                        min: 0,
                        max: 6,
                        divisions: 6,
                        valueLabel:
                            '${_draft.keyReliefDepth.toStringAsFixed(0)} px',
                        onChanged: _draft.keyReliefEnabled
                            ? (value) => setState(
                                () => _draft = _draft.copyWith(
                                  keyReliefDepth: value,
                                ),
                              )
                            : null,
                      ),
                      _SliderField(
                        label: 'Rayon',
                        value: _draft.keyRadius,
                        min: 0,
                        max: 24,
                        divisions: 12,
                        valueLabel: '${_draft.keyRadius.round()} px',
                        onChanged: (value) => setState(
                          () => _draft = _draft.copyWith(keyRadius: value),
                        ),
                      ),
                      _SliderField(
                        label: 'Flou',
                        value: _draft.shadowBlur,
                        min: 0,
                        max: 18,
                        divisions: 9,
                        valueLabel: '${_draft.shadowBlur.round()} px',
                        onChanged: (value) => setState(
                          () => _draft = _draft.copyWith(shadowBlur: value),
                        ),
                      ),
                      _SliderField(
                        label: 'Décalage',
                        value: _draft.shadowOffsetY,
                        min: -4,
                        max: 10,
                        divisions: 14,
                        valueLabel: '${_draft.shadowOffsetY.round()} px',
                        onChanged: (value) => setState(
                          () => _draft = _draft.copyWith(shadowOffsetY: value),
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: AppSectionMetrics.sectionGap),
                _StudioSection(
                  id: 'effects',
                  title: 'Effets',
                  subtitle:
                      'Effets natifs courts à l’appui, réduits dans les champs privés.',
                  expanded: _isStudioSectionExpanded('effects'),
                  onExpansionChanged: _setStudioSectionExpanded,
                  child: Column(
                    children: [
                      DropdownButtonFormField<KeyboardThemePressEffect>(
                        key: ValueKey(
                          'theme-effect-${_draft.pressEffect.name}',
                        ),
                        initialValue: _draft.pressEffect,
                        decoration: const InputDecoration(
                          labelText: 'Effet d’appui',
                        ),
                        items: KeyboardThemePressEffect.values
                            .where(
                              (effect) =>
                                  effect != KeyboardThemePressEffect.glow,
                            )
                            .map(
                              (effect) => DropdownMenuItem(
                                value: effect,
                                child: Text(_effectLabel(effect)),
                              ),
                            )
                            .toList(growable: false),
                        onChanged: (effect) {
                          if (effect == null) return;
                          setState(
                            () => _draft = _draft.copyWith(pressEffect: effect),
                          );
                        },
                      ),
                      const SizedBox(height: AppSpacing.x2),
                      DropdownButtonFormField<KeyboardThemeEffectEasing>(
                        key: ValueKey(
                          'theme-easing-${_draft.effectEasing.name}',
                        ),
                        initialValue: _draft.effectEasing,
                        decoration: const InputDecoration(
                          labelText: 'Animation',
                        ),
                        items: KeyboardThemeEffectEasing.values
                            .map(
                              (easing) => DropdownMenuItem(
                                value: easing,
                                child: Text(_easingLabel(easing)),
                              ),
                            )
                            .toList(growable: false),
                        onChanged: (easing) {
                          if (easing == null) return;
                          setState(
                            () =>
                                _draft = _draft.copyWith(effectEasing: easing),
                          );
                        },
                      ),
                      const SizedBox(height: AppSpacing.x2),
                      _SliderField(
                        label: 'Intensité',
                        value: _draft.effectIntensity,
                        min: 0,
                        max: 1,
                        divisions: 10,
                        valueLabel: _draft.effectIntensity.toStringAsFixed(1),
                        onChanged: (value) => setState(
                          () =>
                              _draft = _draft.copyWith(effectIntensity: value),
                        ),
                      ),
                      _SliderField(
                        label: 'Maintien couleur',
                        value: _draft.pressHighlightDurationMs.toDouble(),
                        min: 0,
                        max: 1200,
                        divisions: 12,
                        valueLabel: '${_draft.pressHighlightDurationMs} ms',
                        onChanged: (value) => setState(
                          () => _draft = _draft.copyWith(
                            pressHighlightDurationMs: value.round(),
                          ),
                        ),
                      ),
                      _SliderField(
                        label: 'Durée de l’effet',
                        value: _draft.effectDurationMs.toDouble(),
                        min: 80,
                        max: 600,
                        divisions: 13,
                        valueLabel: '${_draft.effectDurationMs} ms',
                        onChanged: (value) => setState(
                          () => _draft = _draft.copyWith(
                            effectDurationMs: value.round(),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: AppSectionMetrics.sectionGap),
                _StudioSection(
                  id: 'import_export',
                  title: 'Import / export',
                  subtitle:
                      'Le JSON du thème exclut les images et reste local.',
                  expanded: _isStudioSectionExpanded('import_export'),
                  onExpansionChanged: _setStudioSectionExpanded,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      OutlinedButton.icon(
                        key: const Key('theme-import-json'),
                        onPressed: _importJson,
                        icon: const Icon(Icons.upload_file_outlined),
                        label: const Text('Importer JSON'),
                      ),
                      OutlinedButton.icon(
                        key: const Key('theme-export-json-button'),
                        onPressed: _exportJson,
                        icon: const Icon(Icons.data_object_outlined),
                        label: const Text('Exporter JSON'),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: AppSectionMetrics.sectionGap),
                _ValidationPanel(validation: _validation),
                if (_message != null) ...[
                  const SizedBox(height: AppSpacing.x3),
                  Text(_message!),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _effectLabel(KeyboardThemePressEffect effect) {
  return switch (effect) {
    KeyboardThemePressEffect.none => 'Aucun',
    KeyboardThemePressEffect.scale => 'Échelle',
    KeyboardThemePressEffect.pulse => 'Impulsion',
    KeyboardThemePressEffect.shake => 'Secousse',
    KeyboardThemePressEffect.ripple => 'Ondulation',
    KeyboardThemePressEffect.garland => 'Guirlande',
    KeyboardThemePressEffect.glow => 'Guirlande',
    KeyboardThemePressEffect.electricArc => 'Arc électrique',
    KeyboardThemePressEffect.specularSweep => 'Reflet balayé',
    KeyboardThemePressEffect.inkPress => 'Encre',
    KeyboardThemePressEffect.keycapTilt => 'Inclinaison',
    KeyboardThemePressEffect.edgeCompression => 'Compression des bords',
    KeyboardThemePressEffect.confettiLite => 'Confettis légers',
    KeyboardThemePressEffect.fireworksLite => 'Feu d’artifice léger',
    KeyboardThemePressEffect.waterSplash => 'Splash d’eau',
    KeyboardThemePressEffect.emberBurst => 'Brasier léger',
    KeyboardThemePressEffect.dragonTrail => 'Dragon discret',
    KeyboardThemePressEffect.spiderTrail => 'Araignée discrète',
  };
}

String _gradientLabel(KeyboardThemeGradientStyle style) {
  return switch (style) {
    KeyboardThemeGradientStyle.linear => 'Linéaire',
    KeyboardThemeGradientStyle.radial => 'Radial',
  };
}

String _easingLabel(KeyboardThemeEffectEasing easing) {
  return switch (easing) {
    KeyboardThemeEffectEasing.easeOut => 'Décélération',
    KeyboardThemeEffectEasing.linear => 'Linéaire',
    KeyboardThemeEffectEasing.spring => 'Ressort',
  };
}

class _StudioSection extends StatelessWidget {
  const _StudioSection({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.child,
    required this.expanded,
    required this.onExpansionChanged,
  });

  final String id;
  final String title;
  final String subtitle;
  final Widget child;
  final bool expanded;
  final void Function(String id, bool expanded) onExpansionChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ExpansionTile(
        key: ValueKey<String>('keyboard_theme_studio_section_${id}_$expanded'),
        initiallyExpanded: expanded,
        onExpansionChanged: (value) => onExpansionChanged(id, value),
        title: Text(title),
        subtitle: Text(subtitle),
        childrenPadding: const EdgeInsets.fromLTRB(
          AppSpacing.x4,
          0,
          AppSpacing.x4,
          AppSpacing.x4,
        ),
        children: [child],
      ),
    );
  }
}

class _ValidationPanel extends StatelessWidget {
  const _ValidationPanel({required this.validation});

  final KeyboardThemeValidationResult validation;

  @override
  Widget build(BuildContext context) {
    if (validation.errors.isEmpty && validation.warnings.isEmpty) {
      return const AppStatusCard(
        title: 'Thème lisible',
        subtitle:
            'Le contraste et les limites de performance sont acceptables.',
        icon: Icons.check_circle_outline,
      );
    }
    return AppStatusCard(
      title: validation.canSave
          ? 'Alertes du thème'
          : 'Corrections nécessaires',
      subtitle: [...validation.errors, ...validation.warnings].join('\n'),
      icon: validation.canSave ? Icons.info_outline : Icons.error_outline,
    );
  }
}

class _StickyPreviewHeaderDelegate extends SliverPersistentHeaderDelegate {
  _StickyPreviewHeaderDelegate({
    required this.theme,
    required this.topPadding,
    required this.dirty,
    required this.saving,
    required this.saveFeedback,
    required this.validation,
    required this.onPresetChanged,
    required this.onDiscard,
    required this.onReset,
    required this.onSave,
  });

  final KeyboardThemeConfig theme;
  final double topPadding;
  final bool dirty;
  final bool saving;
  final _SaveButtonFeedback saveFeedback;
  final KeyboardThemeValidationResult validation;
  final ValueChanged<String?> onPresetChanged;
  final VoidCallback? onDiscard;
  final VoidCallback? onReset;
  final VoidCallback? onSave;

  @override
  double get minExtent => maxExtent;

  @override
  double get maxExtent => topPadding + 364;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return ColoredBox(
      color: Theme.of(context).scaffoldBackgroundColor,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          AppSpacing.x4,
          topPadding,
          AppSpacing.x4,
          AppSpacing.x1,
        ),
        child: Align(
          alignment: Alignment.topCenter,
          child: SizedBox(
            width: double.infinity,
            child: _PreviewSectionCard(
              theme: theme,
              dirty: dirty,
              saving: saving,
              saveFeedback: saveFeedback,
              validation: validation,
              onPresetChanged: onPresetChanged,
              onDiscard: onDiscard,
              onReset: onReset,
              onSave: onSave,
            ),
          ),
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _StickyPreviewHeaderDelegate oldDelegate) {
    return oldDelegate.theme != theme ||
        oldDelegate.topPadding != topPadding ||
        oldDelegate.dirty != dirty ||
        oldDelegate.saving != saving ||
        oldDelegate.saveFeedback != saveFeedback ||
        oldDelegate.validation != validation;
  }
}

class _PreviewSectionCard extends StatelessWidget {
  const _PreviewSectionCard({
    required this.theme,
    required this.dirty,
    required this.saving,
    required this.saveFeedback,
    required this.validation,
    required this.onPresetChanged,
    required this.onDiscard,
    required this.onReset,
    required this.onSave,
  });

  final KeyboardThemeConfig theme;
  final bool dirty;
  final bool saving;
  final _SaveButtonFeedback saveFeedback;
  final KeyboardThemeValidationResult validation;
  final ValueChanged<String?> onPresetChanged;
  final VoidCallback? onDiscard;
  final VoidCallback? onReset;
  final VoidCallback? onSave;

  @override
  Widget build(BuildContext context) {
    final subtitleStyle = Theme.of(context).textTheme.bodySmall;
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.x4,
          AppSpacing.x3,
          AppSpacing.x4,
          AppSpacing.x3,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text('Aperçu', style: Theme.of(context).textTheme.titleSmall),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(left: AppSpacing.x3),
                    child: DropdownButtonFormField<String>(
                      key: ValueKey('theme-preset-${theme.presetId}'),
                      initialValue: theme.presetId,
                      decoration: const InputDecoration(
                        isDense: true,
                        labelText: 'Thème',
                      ),
                      items: KeyboardThemePresetCatalog.presets
                          .map(
                            (preset) => DropdownMenuItem<String>(
                              value: preset.id,
                              child: Text(preset.name),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: onPresetChanged,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.x2),
            Flexible(
              fit: FlexFit.loose,
              child: _ThemeDraftPreview(theme: theme),
            ),
            const SizedBox(height: AppSpacing.x2),
            Text(
              'Simulation du brouillon avant l’enregistrement natif.',
              textAlign: TextAlign.left,
              style: subtitleStyle,
            ),
            const SizedBox(height: AppSpacing.x2),
            _PreviewActionRow(
              dirty: dirty,
              saving: saving,
              saveFeedback: saveFeedback,
              validation: validation,
              onDiscard: onDiscard,
              onReset: onReset,
              onSave: onSave,
            ),
          ],
        ),
      ),
    );
  }
}

class _PreviewActionRow extends StatelessWidget {
  const _PreviewActionRow({
    required this.dirty,
    required this.saving,
    required this.saveFeedback,
    required this.validation,
    required this.onDiscard,
    required this.onReset,
    required this.onSave,
  });

  final bool dirty;
  final bool saving;
  final _SaveButtonFeedback saveFeedback;
  final KeyboardThemeValidationResult validation;
  final VoidCallback? onDiscard;
  final VoidCallback? onReset;
  final VoidCallback? onSave;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerRight,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            OutlinedButton(
              onPressed: dirty ? onDiscard : null,
              child: const Text('Annuler'),
            ),
            const SizedBox(width: AppSpacing.x2),
            OutlinedButton(
              onPressed: saving ? null : onReset,
              child: const Text('Réinitialiser'),
            ),
            const SizedBox(width: AppSpacing.x2),
            _AnimatedSaveButton(
              feedback: saveFeedback,
              onPressed: saving || !validation.canSave ? null : onSave,
            ),
          ],
        ),
      ),
    );
  }
}

class _AnimatedSaveButton extends StatelessWidget {
  const _AnimatedSaveButton({required this.feedback, required this.onPressed});

  final _SaveButtonFeedback feedback;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return FilledButton(
      key: const Key('keyboard-theme-save-button'),
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.x2),
        backgroundColor: switch (feedback) {
          _SaveButtonFeedback.failure => colorScheme.error,
          _SaveButtonFeedback.success => colorScheme.primary,
          _ => null,
        },
        foregroundColor: switch (feedback) {
          _SaveButtonFeedback.failure => colorScheme.onError,
          _SaveButtonFeedback.success => colorScheme.onPrimary,
          _ => null,
        },
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox.square(
            dimension: 18,
            child: Center(child: _SaveFeedbackIcon(feedback: feedback)),
          ),
          const SizedBox(width: AppSpacing.x1),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            child: Text(
              _saveButtonLabel(feedback),
              key: ValueKey('keyboard-theme-save-label-${feedback.name}'),
              maxLines: 1,
              overflow: TextOverflow.visible,
            ),
          ),
        ],
      ),
    );
  }
}

class _SaveFeedbackIcon extends StatelessWidget {
  const _SaveFeedbackIcon({required this.feedback});

  final _SaveButtonFeedback feedback;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 260),
      switchInCurve: Curves.easeOutBack,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) {
        return ScaleTransition(
          scale: animation,
          child: FadeTransition(opacity: animation, child: child),
        );
      },
      child: switch (feedback) {
        _SaveButtonFeedback.saving => const SizedBox.square(
          key: Key('keyboard-theme-save-progress-icon'),
          dimension: 18,
          child: CircularProgressIndicator(strokeWidth: 2.4),
        ),
        _SaveButtonFeedback.success => _SaveResultIcon(
          key: const Key('keyboard-theme-save-success-icon'),
          icon: Icons.check_box_rounded,
          semanticLabel: 'Thème enregistré',
          turns: 0.02,
        ),
        _SaveButtonFeedback.failure => _SaveResultIcon(
          key: const Key('keyboard-theme-save-failure-icon'),
          icon: Icons.disabled_by_default_rounded,
          semanticLabel: 'Échec de l’enregistrement',
          turns: -0.02,
        ),
        _SaveButtonFeedback.idle => const Icon(
          Icons.save_outlined,
          key: Key('keyboard-theme-save-idle-icon'),
          size: 20,
          semanticLabel: 'Enregistrer le thème',
        ),
      },
    );
  }
}

class _SaveResultIcon extends StatelessWidget {
  const _SaveResultIcon({
    super.key,
    required this.icon,
    required this.semanticLabel,
    required this.turns,
  });

  final IconData icon;
  final String semanticLabel;
  final double turns;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 520),
      curve: Curves.elasticOut,
      builder: (context, value, child) {
        final clamped = value.clamp(0.0, 1.0);
        return Transform.rotate(
          angle: (1 - clamped) * turns * math.pi,
          child: Transform.scale(scale: 0.62 + clamped * 0.38, child: child),
        );
      },
      child: Icon(icon, size: 22, semanticLabel: semanticLabel),
    );
  }
}

String _saveButtonLabel(_SaveButtonFeedback feedback) {
  return switch (feedback) {
    _SaveButtonFeedback.saving => 'Enregistrement',
    _SaveButtonFeedback.success => 'Enregistré',
    _SaveButtonFeedback.failure => 'Échec',
    _SaveButtonFeedback.idle => 'Enregistrer',
  };
}

class _SliderField extends StatelessWidget {
  const _SliderField({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.divisions,
    required this.valueLabel,
    required this.onChanged,
  });

  final String label;
  final double value;
  final double min;
  final double max;
  final int divisions;
  final String valueLabel;
  final ValueChanged<double>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: AppKeyboardStudioMetrics.sliderLabelWidth,
          child: Text(label),
        ),
        Expanded(
          child: Slider(
            value: value.clamp(min, max),
            min: min,
            max: max,
            divisions: divisions,
            label: valueLabel,
            onChanged: onChanged,
          ),
        ),
        SizedBox(
          width: AppKeyboardStudioMetrics.sliderValueWidth,
          child: Text(valueLabel, textAlign: TextAlign.end),
        ),
      ],
    );
  }
}

class _ColorField extends StatefulWidget {
  const _ColorField({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  State<_ColorField> createState() => _ColorFieldState();
}

class _ColorFieldState extends State<_ColorField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: _hex(widget.value));
  }

  @override
  void didUpdateWidget(covariant _ColorField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value &&
        _controller.text != _hex(widget.value)) {
      _controller.text = _hex(widget.value);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _openPicker() async {
    final picked = await showDialog<int>(
      context: context,
      builder: (context) =>
          _ColorPickerDialog(label: widget.label, initialValue: widget.value),
    );
    if (picked != null) {
      widget.onChanged(picked);
    }
  }

  void _applyHex(String raw) {
    final parsed = int.tryParse(raw.trim(), radix: 16);
    if (parsed != null) {
      widget.onChanged(parsed);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.x2),
      child: Row(
        children: [
          Expanded(
            child: TextFormField(
              key: ValueKey('keyboard-theme-color-${widget.label}'),
              controller: _controller,
              decoration: InputDecoration(
                labelText: '${widget.label} (AARRGGBB)',
              ),
              onChanged: _applyHex,
              onFieldSubmitted: _applyHex,
            ),
          ),
          const SizedBox(width: AppSpacing.x2),
          SizedBox(
            width: AppKeyboardStudioMetrics.colorFieldPicker,
            height: AppKeyboardStudioMetrics.colorFieldPicker,
            child: IconButton(
              key: ValueKey('keyboard-theme-color-picker-${widget.label}'),
              onPressed: _openPicker,
              tooltip: 'Choisir la couleur',
              icon: DecoratedBox(
                decoration: BoxDecoration(
                  color: Color(widget.value),
                  borderRadius: BorderRadius.circular(
                    AppKeyboardStudioMetrics.fieldCornerRadius,
                  ),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline,
                  ),
                ),
                child: const SizedBox(
                  width: AppKeyboardStudioMetrics.colorFieldPickerIcon,
                  height: AppKeyboardStudioMetrics.colorFieldPickerIcon,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _hex(int value) =>
      (value & 0xFFFFFFFF).toRadixString(16).toUpperCase().padLeft(8, '0');
}

class _ColorPickerDialog extends StatefulWidget {
  const _ColorPickerDialog({required this.label, required this.initialValue});

  final String label;
  final int initialValue;

  @override
  State<_ColorPickerDialog> createState() => _ColorPickerDialogState();
}

class _ColorPickerDialogState extends State<_ColorPickerDialog> {
  late int _alpha;
  late int _red;
  late int _green;
  late int _blue;

  int get _value =>
      ((_alpha & 0xFF) << 24) |
      ((_red & 0xFF) << 16) |
      ((_green & 0xFF) << 8) |
      (_blue & 0xFF);

  @override
  void initState() {
    super.initState();
    final value = widget.initialValue & 0xFFFFFFFF;
    _alpha = (value >> 24) & 0xFF;
    _red = (value >> 16) & 0xFF;
    _green = (value >> 8) & 0xFF;
    _blue = value & 0xFF;
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(_value);
    return AlertDialog(
      title: Text('Choisir ${widget.label}'),
      content: SizedBox(
        width: AppKeyboardStudioMetrics.importExportDialogWidth,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Theme.of(context).colorScheme.outline,
                ),
              ),
              child: const SizedBox(
                height: AppKeyboardStudioMetrics.previewPanelHeight,
                width: double.infinity,
              ),
            ),
            const SizedBox(height: AppSpacing.x3),
            _ColorChannelSlider(
              label: 'A',
              value: _alpha,
              onChanged: (value) => setState(() => _alpha = value),
            ),
            _ColorChannelSlider(
              label: 'R',
              value: _red,
              color: Colors.red,
              onChanged: (value) => setState(() => _red = value),
            ),
            _ColorChannelSlider(
              label: 'G',
              value: _green,
              color: Colors.green,
              onChanged: (value) => setState(() => _green = value),
            ),
            _ColorChannelSlider(
              label: 'B',
              value: _blue,
              color: Colors.blue,
              onChanged: (value) => setState(() => _blue = value),
            ),
            const SizedBox(height: AppSpacing.x2),
            SelectableText(
              (_value & 0xFFFFFFFF)
                  .toRadixString(16)
                  .toUpperCase()
                  .padLeft(8, '0'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(_value),
          child: const Text('Appliquer'),
        ),
      ],
    );
  }
}

class _ColorChannelSlider extends StatelessWidget {
  const _ColorChannelSlider({
    required this.label,
    required this.value,
    required this.onChanged,
    this.color,
  });

  final String label;
  final int value;
  final Color? color;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: AppKeyboardStudioMetrics.colorChannelWidth,
          child: Text(label),
        ),
        Expanded(
          child: Slider(
            value: value.toDouble(),
            min: 0,
            max: 255,
            divisions: 255,
            activeColor: color,
            label: value.toString(),
            onChanged: (next) => onChanged(next.round()),
          ),
        ),
        SizedBox(
          width: AppKeyboardStudioMetrics.colorValueWidth,
          child: Text(value.toString().padLeft(3)),
        ),
      ],
    );
  }
}

class _ThemeDraftPreview extends StatefulWidget {
  const _ThemeDraftPreview({required this.theme});

  final KeyboardThemeConfig theme;

  @override
  State<_ThemeDraftPreview> createState() => _ThemeDraftPreviewState();
}

class _ThemeDraftPreviewState extends State<_ThemeDraftPreview> {
  final Set<String> _pressedKeys = <String>{};
  final Map<String, int> _pressTokens = <String, int>{};

  void _press(String key) {
    final token = (_pressTokens[key] ?? 0) + 1;
    setState(() => _pressedKeys.add(key));
    _pressTokens[key] = token;
  }

  void _release(String key) {
    final holdMs = widget.theme.pressHighlightDurationMs.clamp(0, 1200).toInt();
    final token = (_pressTokens[key] ?? 0) + 1;
    _pressTokens[key] = token;
    if (holdMs == 0) {
      setState(() => _pressedKeys.remove(key));
      return;
    }
    Future<void>.delayed(Duration(milliseconds: holdMs), () {
      if (!mounted) return;
      if (_pressTokens[key] != token) return;
      setState(() => _pressedKeys.remove(key));
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = KeyboardThemePresetCatalog.resolveVariantForBrightness(
      widget.theme,
      brightness: Theme.of(context).brightness,
    );
    final gradientColors = [
      Color(theme.backgroundStartColor),
      Color(theme.backgroundEndColor),
    ];
    final background = BoxDecoration(
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: Theme.of(context).colorScheme.outline),
      color: _themeBackgroundColor(theme),
      gradient: theme.useGradient && !theme.useImage
          ? (theme.gradientStyle == KeyboardThemeGradientStyle.radial
                ? RadialGradient(
                    colors: gradientColors
                        .map((color) => _weightedThemeColor(color, theme))
                        .toList(growable: false),
                    center: Alignment.topLeft,
                    radius: 1.25,
                  )
                : LinearGradient(
                    colors: gradientColors
                        .map((color) => _weightedThemeColor(color, theme))
                        .toList(growable: false),
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ))
          : null,
    );
    return SizedBox(
      width: double.infinity,
      child: DecoratedBox(
        key: const Key('keyboard-theme-studio-preview'),
        decoration: background,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.x2),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _previewActionRow(theme),
              SizedBox(height: theme.rowVerticalGap.clamp(4, 8).toDouble()),
              _previewRow(theme, const ['Q', 'W', 'E', 'R', 'T']),
              SizedBox(height: theme.rowVerticalGap.clamp(4, 8).toDouble()),
              _previewRow(theme, const [
                'A',
                'S',
                'D',
                'F',
                'G',
              ], pinnedLabel: 'D'),
              SizedBox(height: theme.rowVerticalGap.clamp(4, 8).toDouble()),
              _previewRow(theme, const ['Maj', 'Z', 'X', 'C', '⌫']),
              SizedBox(height: theme.rowVerticalGap.clamp(4, 8).toDouble()),
              Row(
                children: [
                  Expanded(child: _previewKey(theme, ',', special: true)),
                  SizedBox(width: theme.keyHorizontalGap),
                  Expanded(flex: 2, child: _previewKey(theme, 'espace')),
                  SizedBox(width: theme.keyHorizontalGap),
                  Expanded(
                    child: _previewKey(theme, '↵', special: true, active: true),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _previewRow(
    KeyboardThemeConfig theme,
    List<String> labels, {
    String? pinnedLabel,
  }) {
    return Row(
      children: [
        for (var i = 0; i < labels.length; i++) ...[
          Expanded(
            child: _previewKey(
              theme,
              labels[i],
              special: labels[i] == 'Maj' || labels[i] == '⌫',
              pinned: labels[i] == pinnedLabel,
            ),
          ),
          if (i != labels.length - 1) SizedBox(width: theme.keyHorizontalGap),
        ],
      ],
    );
  }

  Widget _previewActionRow(KeyboardThemeConfig theme) {
    const labels = ['Préfs', 'Thème', 'Clip', 'Voix', 'Média'];
    return Row(
      children: [
        for (var i = 0; i < labels.length; i++) ...[
          Expanded(
            child: _previewKey(
              theme,
              labels[i],
              special: true,
              pinned: labels[i] == 'Thème',
              compact: true,
            ),
          ),
          if (i != labels.length - 1)
            SizedBox(width: theme.keyHorizontalGap.clamp(4, 8).toDouble()),
        ],
      ],
    );
  }

  Widget _previewKey(
    KeyboardThemeConfig theme,
    String label, {
    bool special = false,
    bool active = false,
    bool pinned = false,
    bool compact = false,
  }) {
    final pressed = _pressedKeys.contains(label);
    final bg = active
        ? theme.activeKeyColor
        : (pressed
              ? theme.pressedKeyColor
              : (special ? theme.specialKeyColor : theme.keyColor));
    final labelColor = active
        ? _weightedThemeColor(
            _contrastTextColor(Color(bg)),
            theme,
            boost: _keyboardTextOpacityBoost,
          )
        : _weightedThemeColor(
            Color(theme.textColor),
            theme,
            boost: _keyboardTextOpacityBoost,
          );
    final double animatedScale = switch (theme.pressEffect) {
      KeyboardThemePressEffect.scale =>
        pressed ? 1 + 0.16 * theme.effectIntensity.clamp(0.25, 1) : 1,
      KeyboardThemePressEffect.pulse =>
        pressed ? 1 + 0.12 * theme.effectIntensity.clamp(0.25, 1) : 1,
      KeyboardThemePressEffect.shake => pressed ? 1.04 : 1,
      KeyboardThemePressEffect.edgeCompression => pressed ? 0.985 : 1,
      KeyboardThemePressEffect.none ||
      KeyboardThemePressEffect.ripple ||
      KeyboardThemePressEffect.garland ||
      KeyboardThemePressEffect.glow ||
      KeyboardThemePressEffect.electricArc ||
      KeyboardThemePressEffect.specularSweep ||
      KeyboardThemePressEffect.inkPress ||
      KeyboardThemePressEffect.keycapTilt ||
      KeyboardThemePressEffect.confettiLite ||
      KeyboardThemePressEffect.fireworksLite ||
      KeyboardThemePressEffect.waterSplash ||
      KeyboardThemePressEffect.emberBurst ||
      KeyboardThemePressEffect.dragonTrail ||
      KeyboardThemePressEffect.spiderTrail => 1,
    };
    final animatedOffsetX = switch (theme.pressEffect) {
      KeyboardThemePressEffect.shake when pressed =>
        8.0 * theme.effectIntensity.clamp(0.35, 1),
      KeyboardThemePressEffect.keycapTilt when pressed =>
        1.5 * theme.effectIntensity.clamp(0.35, 1),
      _ => 0.0,
    };
    final animatedTiltAngle =
        pressed && theme.pressEffect == KeyboardThemePressEffect.keycapTilt
        ? -0.018 * theme.effectIntensity.clamp(0.35, 1)
        : 0.0;
    final reliefDepth = theme.keyReliefEnabled
        ? theme.keyReliefDepth.clamp(0.0, 6.0)
        : 0.0;
    final visibleReliefDepth = _previewVisibleReliefDepth(reliefDepth, pressed);
    final reliefTravel = reliefDepth - visibleReliefDepth;
    final reliefSideDepth = _previewSideReliefDepth(reliefDepth);
    final keyHeight = compact ? 24.0 : 28.0;
    final reliefSurfaceHeight = math.max(12.0, keyHeight - reliefDepth);
    final weightedBg = _weightedThemeColor(Color(bg), theme);
    final previewShadows = _previewKeyShadows(
      theme: theme,
      pressed: pressed,
      reliefDepth: reliefDepth,
    );
    return GestureDetector(
      onTapDown: (_) => _press(label),
      onTapUp: (_) => _release(label),
      onTapCancel: () => _release(label),
      child: AnimatedContainer(
        duration: Duration(
          milliseconds: (theme.effectDurationMs * 0.45).round().clamp(60, 220),
        ),
        curve: Curves.easeOut,
        height: keyHeight,
        transform: Matrix4.translationValues(animatedOffsetX, 0, 0),
        child: AnimatedScale(
          scale: animatedScale,
          duration: Duration(
            milliseconds: (theme.effectDurationMs * 0.4).round().clamp(60, 200),
          ),
          curve: Curves.easeOut,
          child: Transform.rotate(
            angle: animatedTiltAngle,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                if (reliefDepth > 0)
                  Positioned.fill(
                    child: IgnorePointer(
                      child: CustomPaint(
                        painter: _PreviewKeyReliefPainter(
                          baseColor: Color(bg),
                          theme: theme,
                          radius: theme.keyRadius,
                          pressed: pressed,
                          reliefDepth: reliefDepth,
                        ),
                      ),
                    ),
                  ),
                AnimatedPositioned(
                  duration: Duration(
                    milliseconds: (theme.effectDurationMs * 0.45).round().clamp(
                      60,
                      220,
                    ),
                  ),
                  curve: Curves.easeOut,
                  left: reliefSideDepth,
                  top: reliefTravel,
                  right: reliefSideDepth,
                  height: reliefSurfaceHeight,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: weightedBg,
                            gradient: _previewKeyGradient(
                              theme,
                              Color(bg),
                              pressed,
                            ),
                            borderRadius: BorderRadius.circular(
                              theme.keyRadius,
                            ),
                            border:
                                pressed &&
                                    theme.pressEffect !=
                                        KeyboardThemePressEffect.none
                                ? Border.all(
                                    color: _weightedThemeColor(
                                      Color(theme.activeKeyColor),
                                      theme,
                                      boost: _keyboardBorderOpacityBoost,
                                    ),
                                    width: 2,
                                  )
                                : (theme.borderWidth > 0
                                      ? Border.all(
                                          color: _weightedThemeColor(
                                            Color(theme.borderColor),
                                            theme,
                                            boost: _keyboardBorderOpacityBoost,
                                          ),
                                          width: theme.borderWidth,
                                        )
                                      : null),
                            boxShadow: previewShadows,
                          ),
                          child: Stack(
                            children: [
                              if (pinned)
                                _ThemePinnedBadge(
                                  theme: theme,
                                  keyColor: Color(bg),
                                ),
                              Center(
                                child: Text(
                                  label,
                                  style: TextStyle(
                                    color: labelColor,
                                    fontSize: compact ? 11 : null,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (pressed && _usesEmittedPressEffect(theme.pressEffect))
                        Positioned.fill(
                          child: IgnorePointer(
                            child: CustomPaint(
                              painter: _PreviewPressEffectPainter(theme: theme),
                            ),
                          ),
                        ),
                      if (theme.presetId ==
                          KeyboardThemePresetCatalog.minimalContrast)
                        const Positioned.fill(
                          child: IgnorePointer(
                            child: CustomPaint(painter: _HazardBorderPainter()),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

double _previewVisibleReliefDepth(double depth, bool pressed) {
  if (depth <= 0) return 0;
  final visibleDepth = pressed ? math.max(0.55, depth * 0.20) : depth;
  return visibleDepth.clamp(0.0, depth).toDouble();
}

double _previewSideReliefDepth(double depth) {
  if (depth <= 0) return 0;
  return math.min(depth * 0.34, 2.2);
}

class _PreviewKeyReliefPainter extends CustomPainter {
  const _PreviewKeyReliefPainter({
    required this.baseColor,
    required this.theme,
    required this.radius,
    required this.pressed,
    required this.reliefDepth,
  });

  final Color baseColor;
  final KeyboardThemeConfig theme;
  final double radius;
  final bool pressed;
  final double reliefDepth;

  @override
  void paint(Canvas canvas, Size size) {
    final visibleDepth = _previewVisibleReliefDepth(reliefDepth, pressed);
    if (visibleDepth <= 0.35 || size.width <= 0 || size.height <= 0) {
      return;
    }

    final sideDepth = _previewSideReliefDepth(reliefDepth);
    final travel = reliefDepth - visibleDepth;
    final surfaceRect = Rect.fromLTWH(
      sideDepth,
      travel,
      math.max(0, size.width - sideDepth * 2),
      math.max(0, size.height - reliefDepth),
    );
    if (surfaceRect.width <= 0 || surfaceRect.height <= 0) {
      return;
    }

    final faceAlpha = pressed ? 0.62 : 0.92;
    final surfaceColor = _weightedThemeColor(baseColor, theme);
    final paint = Paint()
      ..isAntiAlias = true
      ..style = PaintingStyle.fill;

    final topInset = math.min(radius * 0.56, surfaceRect.height * 0.42);
    final sideTopY = pressed
        ? math.max(surfaceRect.top, surfaceRect.bottom - visibleDepth)
        : surfaceRect.top + topInset;

    final clipBounds = Offset.zero & size;
    canvas.save();
    canvas.clipRect(clipBounds);
    paint.color = _darkenThemeColor(
      surfaceColor,
      pressed ? 0.24 : 0.18,
    ).withValues(alpha: faceAlpha);
    paint.shader = null;
    canvas.drawRRect(
      RRect.fromRectAndRadius(clipBounds, Radius.circular(radius)),
      paint,
    );

    if (sideDepth > 0.35) {
      final leftPath = Path()
        ..moveTo(surfaceRect.left, sideTopY)
        ..lineTo(surfaceRect.left, surfaceRect.bottom)
        ..lineTo(surfaceRect.left - sideDepth, surfaceRect.bottom + reliefDepth)
        ..lineTo(surfaceRect.left - sideDepth, sideTopY + reliefDepth)
        ..close();
      paint.shader = LinearGradient(
        colors: [
          _darkenThemeColor(surfaceColor, 0.10).withValues(alpha: faceAlpha),
          _darkenThemeColor(surfaceColor, 0.24).withValues(alpha: faceAlpha),
        ],
      ).createShader(leftPath.getBounds());
      canvas.drawPath(leftPath, paint);
      paint.shader = null;
    }

    if (sideDepth > 0.35) {
      final rightPath = Path()
        ..moveTo(surfaceRect.right, sideTopY)
        ..lineTo(surfaceRect.right + sideDepth, sideTopY + reliefDepth)
        ..lineTo(
          surfaceRect.right + sideDepth,
          surfaceRect.bottom + reliefDepth,
        )
        ..lineTo(surfaceRect.right, surfaceRect.bottom)
        ..close();
      final rightBounds = rightPath.getBounds();
      paint.shader = LinearGradient(
        colors: [
          _darkenThemeColor(surfaceColor, 0.18).withValues(alpha: faceAlpha),
          _darkenThemeColor(surfaceColor, 0.34).withValues(alpha: faceAlpha),
        ],
      ).createShader(rightBounds);
      canvas.drawPath(rightPath, paint);
      paint.shader = null;
    }

    final bottomPath = Path()
      ..moveTo(surfaceRect.left, surfaceRect.bottom)
      ..lineTo(surfaceRect.right, surfaceRect.bottom)
      ..lineTo(surfaceRect.right + sideDepth, surfaceRect.bottom + reliefDepth)
      ..lineTo(surfaceRect.left - sideDepth, surfaceRect.bottom + reliefDepth)
      ..close();
    paint.shader = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        _darkenThemeColor(surfaceColor, 0.12).withValues(alpha: faceAlpha),
        _darkenThemeColor(surfaceColor, 0.28).withValues(alpha: faceAlpha),
      ],
    ).createShader(bottomPath.getBounds());
    canvas.drawPath(bottomPath, paint);
    paint.shader = null;
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _PreviewKeyReliefPainter oldDelegate) {
    return oldDelegate.baseColor != baseColor ||
        oldDelegate.theme != theme ||
        oldDelegate.radius != radius ||
        oldDelegate.pressed != pressed ||
        oldDelegate.reliefDepth != reliefDepth;
  }
}

class _HazardBorderPainter extends CustomPainter {
  const _HazardBorderPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final clip = RRect.fromRectAndRadius(
      Offset.zero & size,
      const Radius.circular(4),
    );
    canvas.save();
    canvas.clipRRect(clip);
    final paint = Paint()
      ..isAntiAlias = true
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = const Color(0xFFFFD400);
    canvas.drawRRect(clip.deflate(1.5), paint);
    paint
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..color = Colors.black;
    for (var x = -size.height; x < size.width + size.height; x += 14) {
      canvas.drawLine(
        Offset(x, size.height),
        Offset(x + size.height, 0),
        paint,
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _HazardBorderPainter oldDelegate) => false;
}

Color _contrastTextColor(Color background) {
  return _relativeLuminance(background) > .45 ? Colors.black : Colors.white;
}

const double _keyboardBackgroundOpacityBoost = 0;
const double _keyboardSurfaceOpacityBoost = 0;
const double _keyboardBorderOpacityBoost = 0.48;
const double _keyboardTextOpacityBoost = 0.58;

Color _themeBackgroundColor(KeyboardThemeConfig theme) {
  return _weightedThemeColor(
    Color(theme.backgroundStartColor),
    theme,
    boost: _keyboardBackgroundOpacityBoost,
  );
}

Color _weightedThemeColor(
  Color color,
  KeyboardThemeConfig theme, {
  double boost = _keyboardSurfaceOpacityBoost,
}) {
  final opacity = _weightedKeyboardOpacity(theme, boost: boost);
  return color.withValues(alpha: color.a * opacity);
}

Color _lightenThemeColor(Color color, double amount) {
  final hsl = HSLColor.fromColor(color);
  return hsl.withLightness((hsl.lightness + amount).clamp(0.0, 1.0)).toColor();
}

Color _darkenThemeColor(Color color, double amount) {
  final hsl = HSLColor.fromColor(color);
  return hsl.withLightness((hsl.lightness - amount).clamp(0.0, 1.0)).toColor();
}

Gradient? _previewKeyGradient(
  KeyboardThemeConfig theme,
  Color base,
  bool pressed,
) {
  if (!pressed) {
    return null;
  }
  final active = _weightedThemeColor(Color(theme.activeKeyColor), theme);
  final surface = _weightedThemeColor(base, theme);
  return switch (theme.pressEffect) {
    KeyboardThemePressEffect.garland => RadialGradient(
      center: Alignment.topLeft,
      radius: 1.25,
      colors: [active.withValues(alpha: 0.34), surface],
    ),
    KeyboardThemePressEffect.glow => RadialGradient(
      center: Alignment.topLeft,
      radius: 1.25,
      colors: [active.withValues(alpha: 0.34), surface],
    ),
    KeyboardThemePressEffect.electricArc => LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        active.withValues(alpha: 0.36),
        surface,
        active.withValues(alpha: 0.18),
      ],
      stops: const [0, 0.42, 1],
    ),
    KeyboardThemePressEffect.specularSweep => LinearGradient(
      begin: Alignment.centerLeft,
      end: Alignment.centerRight,
      colors: [surface, Colors.white.withValues(alpha: 0.34), surface],
      stops: const [0.12, 0.5, 0.88],
    ),
    KeyboardThemePressEffect.inkPress => LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        _weightedThemeColor(_darkenThemeColor(base, 0.08), theme),
        _weightedThemeColor(_darkenThemeColor(base, 0.18), theme),
      ],
    ),
    KeyboardThemePressEffect.keycapTilt => LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        _weightedThemeColor(_lightenThemeColor(base, 0.10), theme),
        surface,
        _weightedThemeColor(_darkenThemeColor(base, 0.13), theme),
      ],
      stops: const [0, 0.52, 1],
    ),
    KeyboardThemePressEffect.edgeCompression => LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        _weightedThemeColor(_lightenThemeColor(base, 0.08), theme),
        surface,
        _weightedThemeColor(_darkenThemeColor(base, 0.20), theme),
      ],
      stops: const [0, 0.58, 1],
    ),
    _ => null,
  };
}

List<BoxShadow>? _previewKeyShadows({
  required KeyboardThemeConfig theme,
  required bool pressed,
  required double reliefDepth,
}) {
  final shadows = <BoxShadow>[];
  final effect = theme.pressEffect;
  final opacity = _weightedKeyboardOpacity(
    theme,
    boost: _keyboardSurfaceOpacityBoost,
  );
  if (pressed &&
      (effect == KeyboardThemePressEffect.garland ||
          effect == KeyboardThemePressEffect.glow ||
          effect == KeyboardThemePressEffect.electricArc) &&
      reliefDepth <= 0) {
    shadows.add(
      BoxShadow(
        color: Color(theme.activeKeyColor).withValues(
          alpha:
              (effect == KeyboardThemePressEffect.electricArc ? 0.16 : 0.22) *
              opacity,
        ),
        blurRadius:
            (effect == KeyboardThemePressEffect.electricArc ? 4 : 6) +
            theme.effectIntensity * 8,
        spreadRadius:
            (effect == KeyboardThemePressEffect.electricArc ? 0.0 : 0.5) +
            theme.effectIntensity * 1.2,
      ),
    );
  } else if (pressed && effect == KeyboardThemePressEffect.pulse) {
    shadows.add(
      BoxShadow(
        color: Color(theme.activeKeyColor).withValues(alpha: 0.20 * opacity),
        blurRadius: 8 + theme.effectIntensity * 8,
        spreadRadius: 0.5 + theme.effectIntensity * 1.5,
      ),
    );
  }
  if (theme.shadowBlur > 0 && reliefDepth <= 0) {
    shadows.add(
      BoxShadow(
        color: _weightedThemeColor(Color(theme.shadowColor), theme),
        blurRadius: theme.shadowBlur,
        offset: Offset(0, theme.shadowOffsetY),
      ),
    );
  }
  return shadows.isEmpty ? null : shadows;
}

bool _usesEmittedPressEffect(KeyboardThemePressEffect effect) {
  return effect == KeyboardThemePressEffect.ripple ||
      effect == KeyboardThemePressEffect.confettiLite ||
      effect == KeyboardThemePressEffect.fireworksLite ||
      effect == KeyboardThemePressEffect.waterSplash ||
      effect == KeyboardThemePressEffect.emberBurst ||
      effect == KeyboardThemePressEffect.dragonTrail ||
      effect == KeyboardThemePressEffect.spiderTrail;
}

double _weightedKeyboardOpacity(
  KeyboardThemeConfig theme, {
  required double boost,
}) {
  final opacity = theme.keyboardOpacity.clamp(0.25, 1.0).toDouble();
  return (opacity + (1 - opacity) * boost).clamp(0.0, 1.0).toDouble();
}

class _ThemePinnedBadge extends StatelessWidget {
  const _ThemePinnedBadge({required this.theme, required this.keyColor});

  final KeyboardThemeConfig theme;
  final Color keyColor;

  @override
  Widget build(BuildContext context) {
    final baseColor = _relativeLuminance(keyColor) > .55
        ? const Color(0xEB181C20)
        : const Color(0xEBFFFFFF);
    final borderColor = _relativeLuminance(keyColor) > .55
        ? Colors.white
        : Colors.black;
    return Positioned(
      top: 3,
      right: 3,
      child: CustomPaint(
        size: const Size(12, 12),
        painter: _PinnedBadgePainter(
          presetId: theme.presetId,
          baseColor: baseColor,
          accentColor: borderColor,
        ),
      ),
    );
  }
}

class _PinnedBadgePainter extends CustomPainter {
  const _PinnedBadgePainter({
    required this.presetId,
    required this.baseColor,
    required this.accentColor,
  });

  final String presetId;
  final Color baseColor;
  final Color accentColor;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..isAntiAlias = true;
    final center = Offset(size.width * .55, size.height * .45);
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(_rotationForPreset());
    switch (presetId) {
      case KeyboardThemePresetCatalog.pixelCandy:
        _drawCandy(canvas, paint, size);
      case KeyboardThemePresetCatalog.sunsetGradient:
        _drawCloud(canvas, paint, size);
      case KeyboardThemePresetCatalog.glassMint:
        _drawDrop(canvas, paint, size);
      case KeyboardThemePresetCatalog.midnightAurora:
        _drawStar(canvas, paint, size);
      default:
        _drawLed(canvas, paint, size);
    }
    canvas.restore();
  }

  double _rotationForPreset() {
    return switch (presetId) {
      KeyboardThemePresetCatalog.glassMint => -math.pi / 4,
      KeyboardThemePresetCatalog.midnightAurora => 0,
      _ => math.pi / 4,
    };
  }

  Color _accentColorForPreset() {
    return presetId == KeyboardThemePresetCatalog.midnightAurora
        ? const Color(0xFFFFD84D)
        : accentColor;
  }

  void _drawCandy(Canvas canvas, Paint paint, Size size) {
    paint
      ..style = PaintingStyle.fill
      ..color = accentColor;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset.zero,
          width: size.width * .72,
          height: size.height * .46,
        ),
        const Radius.circular(2),
      ),
      paint,
    );
    paint.color = baseColor;
    canvas.drawCircle(Offset.zero, size.width * .17, paint);
    final left = Path()
      ..moveTo(-size.width * .36, 0)
      ..lineTo(-size.width * .67, -size.height * .25)
      ..lineTo(-size.width * .67, size.height * .25)
      ..close();
    final right = Path()
      ..moveTo(size.width * .36, 0)
      ..lineTo(size.width * .67, -size.height * .25)
      ..lineTo(size.width * .67, size.height * .25)
      ..close();
    canvas.drawPath(left, paint);
    canvas.drawPath(right, paint);
  }

  void _drawCloud(Canvas canvas, Paint paint, Size size) {
    paint
      ..style = PaintingStyle.fill
      ..color = baseColor;
    canvas.drawCircle(
      Offset(-size.width * .25, size.height * .08),
      size.width * .27,
      paint,
    );
    canvas.drawCircle(
      Offset(size.width * .08, -size.height * .08),
      size.width * .34,
      paint,
    );
    canvas.drawCircle(
      Offset(size.width * .42, size.height * .1),
      size.width * .25,
      paint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(size.width * .08, size.height * .2),
          width: size.width * 1.12,
          height: size.height * .38,
        ),
        const Radius.circular(2),
      ),
      paint,
    );
  }

  void _drawLed(Canvas canvas, Paint paint, Size size) {
    paint
      ..style = PaintingStyle.fill
      ..color = baseColor;
    canvas.drawCircle(Offset.zero, size.width * .52, paint);
    paint.color = accentColor;
    canvas.drawCircle(Offset.zero, size.width * .28, paint);
  }

  void _drawDrop(Canvas canvas, Paint paint, Size size) {
    paint
      ..style = PaintingStyle.fill
      ..color = accentColor;
    final drop = Path()
      ..moveTo(0, -size.height * .5)
      ..cubicTo(
        size.width * .42,
        -size.height * .08,
        size.width * .33,
        size.height * .42,
        0,
        size.height * .42,
      )
      ..cubicTo(
        -size.width * .33,
        size.height * .42,
        -size.width * .42,
        -size.height * .08,
        0,
        -size.height * .5,
      )
      ..close();
    canvas.drawPath(drop, paint);
  }

  void _drawStar(Canvas canvas, Paint paint, Size size) {
    paint
      ..style = PaintingStyle.fill
      ..color = _accentColorForPreset();
    final star = Path()
      ..moveTo(0, -size.height * .5)
      ..lineTo(size.width * .15, -size.height * .15)
      ..lineTo(size.width * .5, 0)
      ..lineTo(size.width * .15, size.height * .15)
      ..lineTo(0, size.height * .5)
      ..lineTo(-size.width * .15, size.height * .15)
      ..lineTo(-size.width * .5, 0)
      ..lineTo(-size.width * .15, -size.height * .15)
      ..close();
    canvas.drawPath(star, paint);
  }

  @override
  bool shouldRepaint(covariant _PinnedBadgePainter oldDelegate) {
    return oldDelegate.presetId != presetId ||
        oldDelegate.baseColor != baseColor ||
        oldDelegate.accentColor != accentColor;
  }
}

double _relativeLuminance(Color color) {
  double channel(double value) {
    final normalized = value / 255;
    return normalized <= .03928
        ? normalized / 12.92
        : math.pow((normalized + .055) / 1.055, 2.4).toDouble();
  }

  return .2126 * channel((color.r * 255).roundToDouble()) +
      .7152 * channel((color.g * 255).roundToDouble()) +
      .0722 * channel((color.b * 255).roundToDouble());
}

class _PreviewPressEffectPainter extends CustomPainter {
  const _PreviewPressEffectPainter({required this.theme});

  final KeyboardThemeConfig theme;

  static const _celebrationPalette = <Color>[
    Color(0xFF36B384),
    Color(0xFFFFD166),
    Color(0xFFEF476F),
    Color(0xFF4CC9F0),
  ];
  static const _waterPalette = <Color>[
    Color(0xFF4CC9F0),
    Color(0xFF90E0EF),
    Color(0xFFCAF0F8),
    Color(0xFF48CAE4),
  ];
  static const _emberPalette = <Color>[
    Color(0xFFFFD166),
    Color(0xFFFF8C42),
    Color(0xFFEF476F),
    Color(0xFFFFF1A8),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final accent = Color(theme.activeKeyColor);
    final bounds = Offset.zero & size;
    final anchor = Offset(size.width * 0.76, size.height * 0.24);
    final paint = Paint()..isAntiAlias = true;
    canvas.save();
    canvas.clipRect(bounds);
    switch (theme.pressEffect) {
      case KeyboardThemePressEffect.ripple:
        paint
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.2
          ..color = accent.withValues(alpha: 0.58);
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            bounds.deflate(1.4),
            Radius.circular(math.min(size.width, size.height) * 0.28),
          ),
          paint,
        );
      case KeyboardThemePressEffect.confettiLite:
      case KeyboardThemePressEffect.fireworksLite:
      case KeyboardThemePressEffect.waterSplash:
      case KeyboardThemePressEffect.emberBurst:
        final count =
            theme.pressEffect == KeyboardThemePressEffect.fireworksLite
            ? 16
            : theme.pressEffect == KeyboardThemePressEffect.waterSplash
            ? 12
            : 10;
        final colors = switch (theme.pressEffect) {
          KeyboardThemePressEffect.waterSplash => _waterPalette,
          KeyboardThemePressEffect.emberBurst => _emberPalette,
          _ => _celebrationPalette,
        };
        for (var i = 0; i < count; i++) {
          final angle = math.pi * 2 * i / count;
          final distance =
              14 +
              (i % 4) * 5 +
              theme.effectIntensity *
                  (theme.pressEffect == KeyboardThemePressEffect.emberBurst
                      ? 20
                      : 16);
          paint
            ..style = PaintingStyle.fill
            ..color = colors[i % colors.length];
          canvas.drawCircle(
            anchor +
                Offset(math.cos(angle) * distance, math.sin(angle) * distance),
            theme.pressEffect == KeyboardThemePressEffect.waterSplash
                ? 2.2
                : 2.8,
            paint,
          );
        }
      case KeyboardThemePressEffect.dragonTrail:
        _drawMascotTrail(canvas, size, accent, spider: false);
      case KeyboardThemePressEffect.spiderTrail:
        _drawMascotTrail(canvas, size, accent, spider: true);
      case KeyboardThemePressEffect.none:
      case KeyboardThemePressEffect.scale:
      case KeyboardThemePressEffect.pulse:
      case KeyboardThemePressEffect.shake:
      case KeyboardThemePressEffect.garland:
      case KeyboardThemePressEffect.glow:
      case KeyboardThemePressEffect.electricArc:
      case KeyboardThemePressEffect.specularSweep:
      case KeyboardThemePressEffect.inkPress:
      case KeyboardThemePressEffect.keycapTilt:
      case KeyboardThemePressEffect.edgeCompression:
        break;
    }
    canvas.restore();
  }

  void _drawMascotTrail(
    Canvas canvas,
    Size size,
    Color accent, {
    required bool spider,
  }) {
    final path = Path()
      ..moveTo(size.width * .18, size.height * .70)
      ..quadraticBezierTo(
        size.width * .42,
        size.height * .30,
        size.width * .70,
        size.height * .42,
      )
      ..lineTo(size.width * .82, size.height * .30);
    final strokePaint = Paint()
      ..isAntiAlias = true
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = spider ? 1.4 : 2.4
      ..color = (spider ? Colors.white : accent).withValues(alpha: .70);
    canvas.drawPath(path, strokePaint);
    if (spider) {
      _drawPreviewWebThreads(canvas, size);
    } else {
      _drawPreviewDragonSparks(canvas, size);
    }

    final center = Offset(size.width * .82, size.height * .30);
    _drawPreviewMascotShadow(canvas, center, accent, spider: spider);
    canvas.save();
    canvas.translate(center.dx, center.dy);
    if (spider) {
      _drawPreviewSpider(canvas, math.min(size.width, size.height) * .15);
    } else {
      _drawPreviewDragon(
        canvas,
        math.min(size.width, size.height) * .16,
        accent,
      );
    }
    canvas.restore();
  }

  void _drawPreviewMascotShadow(
    Canvas canvas,
    Offset center,
    Color accent, {
    required bool spider,
  }) {
    final paint = Paint()
      ..isAntiAlias = true
      ..style = PaintingStyle.fill
      ..color =
          (spider
                  ? Colors.black
                  : Color.lerp(Colors.black, accent, .26) ?? Colors.black)
              .withValues(alpha: spider ? .30 : .34);
    canvas.drawOval(
      Rect.fromCenter(
        center: center.translate(0, 4.4),
        width: spider ? 9.5 : 13.0,
        height: spider ? 3.4 : 4.2,
      ),
      paint,
    );
  }

  void _drawPreviewDragonSparks(Canvas canvas, Size size) {
    final paint = Paint()
      ..isAntiAlias = true
      ..style = PaintingStyle.fill;
    final points = <Offset>[
      Offset(size.width * .24, size.height * .62),
      Offset(size.width * .38, size.height * .44),
      Offset(size.width * .54, size.height * .38),
      Offset(size.width * .66, size.height * .42),
    ];
    for (var index = 0; index < points.length; index++) {
      paint.color = _emberPalette[index % _emberPalette.length].withValues(
        alpha: .80 - index * .10,
      );
      canvas.drawCircle(points[index], 1.7 + (index % 2) * .6, paint);
    }
  }

  void _drawPreviewWebThreads(Canvas canvas, Size size) {
    final paint = Paint()
      ..isAntiAlias = true
      ..style = PaintingStyle.stroke
      ..strokeWidth = .8
      ..strokeCap = StrokeCap.round
      ..color = Colors.white.withValues(alpha: .56);
    final threads = <(Offset, Offset)>[
      (
        Offset(size.width * .34, size.height * .48),
        Offset(size.width * .42, size.height * .56),
      ),
      (
        Offset(size.width * .49, size.height * .36),
        Offset(size.width * .58, size.height * .46),
      ),
      (
        Offset(size.width * .65, size.height * .39),
        Offset(size.width * .70, size.height * .50),
      ),
    ];
    for (final thread in threads) {
      canvas.drawLine(thread.$1, thread.$2, paint);
    }
  }

  void _drawPreviewDragon(Canvas canvas, double size, Color accent) {
    final paint = Paint()
      ..isAntiAlias = true
      ..style = PaintingStyle.fill
      ..color = accent.withValues(alpha: .90);
    final body = Path()
      ..moveTo(size * 1.2, 0)
      ..lineTo(-size * .8, -size * .55)
      ..lineTo(-size * .32, 0)
      ..lineTo(-size * .8, size * .55)
      ..close();
    canvas.drawPath(body, paint);
    paint.color = Colors.white.withValues(alpha: .82);
    canvas.drawCircle(Offset(size * .44, -size * .14), size * .12, paint);
  }

  void _drawPreviewSpider(Canvas canvas, double size) {
    final strokePaint = Paint()
      ..isAntiAlias = true
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1
      ..color = Colors.white.withValues(alpha: .82);
    for (var index = 0; index < 4; index++) {
      final y = (-.45 + index * .30) * size;
      canvas.drawLine(
        Offset(-size * .14, y),
        Offset(-size * .9, y - size * .25),
        strokePaint,
      );
      canvas.drawLine(
        Offset(size * .14, y),
        Offset(size * .9, y - size * .25),
        strokePaint,
      );
    }
    final fillPaint = Paint()
      ..isAntiAlias = true
      ..style = PaintingStyle.fill
      ..color = const Color(0xFF1E2421).withValues(alpha: .94);
    canvas.drawOval(
      Rect.fromLTRB(-size * .42, -size * .52, size * .42, size * .52),
      fillPaint,
    );
    fillPaint.color = Colors.white.withValues(alpha: .88);
    canvas.drawCircle(Offset(size * .16, -size * .16), size * .08, fillPaint);
    canvas.drawCircle(Offset(size * .16, size * .16), size * .08, fillPaint);
  }

  @override
  bool shouldRepaint(covariant _PreviewPressEffectPainter oldDelegate) {
    return oldDelegate.theme != theme;
  }
}
