---
artifact: research_note
metadata_schema_version: "1.0"
source_skill: 203-sg-research
artifact_version: "1.0.0"
project: "winglowz_app"
created: "2026-05-14"
updated: "2026-05-14"
status: active
scope: "research"
owner: "codex"
title: "Free on-device ASR options for Android keyboard dictation"
confidence: medium
risk_level: medium
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app Android IME"
depends_on: []
supersedes: []
evidence:
  - "Research comparison and source links are maintained in this note."
next_step: "Benchmark the shortlisted local ASR runtimes on Android hardware"
---

# Free On-Device ASR Options

## Position

WinGlows should treat local/on-device ASR as the default keyboard dictation path. The server worker should be reserved for explicit high-quality fallback, not normal keyboard input.

The strongest first implementation candidate is `sherpa-onnx` as the runtime wrapper, because it already supports Android, Kotlin/Java, Dart, streaming and non-streaming ASR, VAD, Whisper exports, Moonshine exports, SenseVoice exports, and multiple model families behind one deployment shape.

## Shortlist

| Option | Fit for WinGlows | License posture | Strength | Risk |
| --- | --- | --- | --- | --- |
| `sherpa-onnx` | Best runtime candidate | Apache-2.0 code | Android, Kotlin/Java/Dart APIs, streaming/non-streaming, many model families | Model choice still needs benchmarking |
| Whisper via `sherpa-onnx` | Best French-capable baseline | Whisper is MIT; converted model license should be tracked | Multilingual, known quality, works with French | Tiny/base may be weak; small may be heavy |
| `whisper.cpp` | Strong fallback runtime | MIT | Mature C/C++ local Whisper, quantized models | Android IME integration and streaming UX may require more native work |
| Vosk | Best ultra-light fallback | Apache-2.0 for core and many models | Small French model around 41MB, low memory, proven Android path | Accuracy likely below Whisper/SenseVoice-class models |
| SenseVoice/FunASR | High-potential Chinese ecosystem | FunASR code MIT; model license needs legal review | Very fast, strong multilingual claims, ONNX export, sherpa integration | SenseVoice-Small does not cover French directly in listed core languages |
| Moonshine | Strong edge-device tech | English models MIT; non-English models community/commercial threshold license | Very small/fast models, Android examples | French availability/license not yet a clean fit |
| WeNet | Production ASR toolkit | Apache-2.0 | Mature, production-oriented, Chinese ecosystem | More toolkit than drop-in Android IME runtime |
| PaddleSpeech | Broad Baidu/Paddle toolkit | Apache-2.0 | ASR, TTS, punctuation, streaming server patterns | Mobile/IME embedding appears less direct than sherpa/whisper/Vosk |

## Recommended First Spike

1. Build a local ASR abstraction in native Android:
   `KeyboardVoiceEngine.start()`, `stop()`, `cancel()`, `state`, `result`.

2. Spike `sherpa-onnx` first with two model tracks:
   `whisper-base` or `whisper-small` multilingual for French/English quality, plus a tiny model for low-end devices.

3. Keep Vosk as the lightweight fallback:
   use `vosk-model-small-fr-0.22` for a low-storage French test and compare it directly against Whisper local.

4. Benchmark on real Android hardware:
   cold model load time, memory, battery feel, real-time factor, dictation quality in French, punctuation quality, and keyboard responsiveness.

5. Only after that, evaluate SenseVoice/FunASR:
   it is very promising, especially through sherpa-onnx, but its obvious small model coverage is Mandarin/Cantonese/English/Japanese/Korean rather than French.

## Why Not Android SpeechRecognizer As Default

Android exposes offline preference flags, but the platform documentation says recognizer behavior can depend on implementation and flags may have no effect. That makes it useful as fallback but weak as our default product promise.

## Evidence

- `sherpa-onnx` supports Android arm64/arm32, Kotlin/Java/Dart APIs, and both streaming and non-streaming speech-to-text.
- `sherpa-onnx` lists Android APKs and Android model examples for Whisper, Moonshine, SenseVoice, VAD, and other models.
- OpenAI Whisper is MIT and has multilingual models from tiny to large/turbo; model sizes range from 39M to 1550M parameters.
- `whisper.cpp` is MIT and provides local C/C++ Whisper inference.
- Vosk core is Apache-2.0; its model catalog includes `vosk-model-small-fr-0.22`, a 41MB French model for Android/iOS/Raspberry Pi, and an Apache-2.0 license for that model.
- FunASR code is MIT and includes ASR, VAD, punctuation restoration, and model deployment tooling; its models use a separate model license agreement that needs review before commercial shipping.
- SenseVoice advertises high-accuracy multilingual ASR and ONNX export, with third-party sherpa-onnx deployment on Android/iOS/Raspberry Pi.
- Moonshine code and English models are MIT, but non-English models use a community license with a commercial revenue threshold; French fit is not currently clear enough for default WinGlows usage.
- WeNet and PaddleSpeech are Apache-2.0 production/toolkit options, but not the shortest path for an Android IME integration.

## Source Links

- sherpa-onnx: https://github.com/k2-fsa/sherpa-onnx
- sherpa-onnx docs: https://k2-fsa.github.io/sherpa/onnx/index.html
- OpenAI Whisper: https://github.com/openai/whisper
- OpenAI Whisper license: https://raw.githubusercontent.com/openai/whisper/main/LICENSE
- whisper.cpp: https://github.com/ggml-org/whisper.cpp
- whisper.cpp license: https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/LICENSE
- Vosk API: https://github.com/alphacep/vosk-api
- Vosk models: https://alphacephei.com/vosk/models
- FunASR: https://github.com/modelscope/FunASR
- FunASR license: https://raw.githubusercontent.com/modelscope/FunASR/main/LICENSE
- SenseVoice: https://github.com/FunAudioLLM/SenseVoice
- Moonshine: https://github.com/moonshine-ai/moonshine
- Moonshine license: https://raw.githubusercontent.com/moonshine-ai/moonshine/main/LICENSE
- WeNet: https://github.com/wenet-e2e/wenet
- PaddleSpeech: https://github.com/PaddlePaddle/PaddleSpeech
- Android RecognizerIntent offline flag: https://developer.android.com/reference/android/speech/RecognizerIntent#EXTRA_PREFER_OFFLINE

## Current Recommendation

Start with `sherpa-onnx + Whisper multilingual` for the first French-capable prototype. Add Vosk French as a tiny fallback benchmark. Keep SenseVoice/FunASR on the watchlist for future high-performance models, especially if we find or train a French-capable export that is legally clean for commercial distribution.

For a global LTD launch, this should become a free language-pack catalog rather than a paid marketplace. Packs should be install-on-demand by locale, because bundling every model would make the APK too large and would still disappoint users if quality varies by language. The current packaging recommendation is to ship no heavyweight ASR model inside the APK, then offer download after install through first-run suggestions, first microphone use, and Settings. Each pack needs explicit language, engine, model, size, license, and quality tier metadata before it is marketed.

## Benchmark Gate And MVP Language Matrix

No language may move to `recommended` until it has a benchmark row with:

- device class: low-end and mid-range Android hardware names;
- ABI and RAM: exact `supported_abis`, measured RAM pressure, and cold model load time;
- latency: first partial result latency, final result latency, and real-time factor;
- quality: short dictation WER or manual transcript score on product-relevant prompts;
- responsiveness: confirmation that the IME UI thread remains responsive during load and capture;
- storage: download size, installed size, and storage preflight result;
- license: model/code license ID and commercial distribution decision;
- diagnostics: observed `runtime_mode`, `fallback_reason`, `pack_id`, and `engine`.

Initial MVP matrix:

| Language | First status | Candidate path | Shipping constraint |
| --- | --- | --- | --- |
| `fr-FR` | `candidate` | `sherpa_onnx` + Whisper multilingual candidate, Vosk small French fallback benchmark | Do not claim offline recommended until low-end and mid-range Android benchmarks pass. |
| `en-US` | `fallbackOnly` | Android `SpeechRecognizer` fallback first, local pack after benchmark | Must be labeled fallback-only until a local model row passes. |
| `es-ES` | `candidate` | Whisper multilingual through `sherpa_onnx` | Candidate only; no AppSumo/LTD offline claim yet. |
| `de-DE` | `candidate` | Whisper multilingual through `sherpa_onnx` | Candidate only; no offline quality promise yet. |
| `pt-BR` | `candidate` | Whisper multilingual through `sherpa_onnx` | Candidate only; validate regional language tag separately. |
| `it-IT` | `candidate` | Whisper multilingual through `sherpa_onnx` | Candidate only; benchmark before marketing. |
| `hi-IN` | `fallbackOnly` | Research local model availability and Android fallback behavior | Must remain fallback-only until model/license/perf evidence exists. |
| `ar` | `fallbackOnly` | Research dialect coverage before selecting a pack | Must not be marketed as generic Arabic offline support. |
| `zh-CN` | `candidate` | SenseVoice/FunASR watchlist plus Whisper comparison | License review required before commercial distribution. |
| `ja-JP` | `candidate` | SenseVoice/FunASR watchlist plus Whisper comparison | License and device benchmark required. |
| `ko-KR` | `candidate` | SenseVoice/FunASR watchlist plus Whisper comparison | License and device benchmark required. |
