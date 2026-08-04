#include "flutter_window.h"

#include <chrono>
#include <cctype>
#include <cstring>
#include <optional>

#include <flutter/method_result_functions.h>
#include <flutter/standard_method_codec.h>

#include "flutter/generated_plugin_registrant.h"

namespace {

constexpr const char kWindowsOverlayChannelName[] =
    "commandglows_app/windows_overlay";

int64_t CurrentEpochMillis() {
  const auto now = std::chrono::system_clock::now();
  return std::chrono::duration_cast<std::chrono::milliseconds>(
             now.time_since_epoch())
      .count();
}

std::optional<WORD> VirtualKeyFromName(const std::string& raw) {
  if (raw.size() == 1) {
    const char ch = static_cast<char>(std::toupper(raw[0]));
    if ((ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) {
      return static_cast<WORD>(ch);
    }
  }
  if (raw == "Tab") {
    return VK_TAB;
  }
  if (raw == "Enter") {
    return VK_RETURN;
  }
  if (raw == "Space") {
    return VK_SPACE;
  }
  if (raw == "Escape") {
    return VK_ESCAPE;
  }
  if (raw == "Left") {
    return VK_LEFT;
  }
  if (raw == "Right") {
    return VK_RIGHT;
  }
  if (raw == "Up") {
    return VK_UP;
  }
  if (raw == "Down") {
    return VK_DOWN;
  }
  if (raw == "Backspace") {
    return VK_BACK;
  }
  if (raw == "Delete") {
    return VK_DELETE;
  }
  return std::nullopt;
}

void AppendKeyInput(std::vector<INPUT>* inputs, WORD vk, bool key_up = false) {
  INPUT input = {};
  input.type = INPUT_KEYBOARD;
  input.ki.wVk = vk;
  input.ki.dwFlags = key_up ? KEYEVENTF_KEYUP : 0;
  inputs->push_back(input);
}

}  // namespace

FlutterWindow::FlutterWindow(const flutter::DartProject& project)
    : project_(project) {}

FlutterWindow::~FlutterWindow() {}

bool FlutterWindow::OnCreate() {
  if (!Win32Window::OnCreate()) {
    return false;
  }

  RECT frame = GetClientArea();

  // The size here must match the window dimensions to avoid unnecessary surface
  // creation / destruction in the startup path.
  flutter_controller_ = std::make_unique<flutter::FlutterViewController>(
      frame.right - frame.left, frame.bottom - frame.top, project_);
  // Ensure that basic setup of the controller was successful.
  if (!flutter_controller_->engine() || !flutter_controller_->view()) {
    return false;
  }
  RegisterPlugins(flutter_controller_->engine());
  RegisterWindowsOverlayChannel();
  SetChildContent(flutter_controller_->view()->GetNativeWindow());

  flutter_controller_->engine()->SetNextFrameCallback([&]() {
    this->Show();
  });

  // Flutter can complete the first frame before the "show window" callback is
  // registered. The following call ensures a frame is pending to ensure the
  // window is shown. It is a no-op if the first frame hasn't completed yet.
  flutter_controller_->ForceRedraw();

  return true;
}

void FlutterWindow::OnDestroy() {
  if (hotkey_registered_) {
    UnregisterHotKey(GetHandle(), kWindowsOverlayHotkeyId);
    hotkey_registered_ = false;
  }
  if (flutter_controller_) {
    flutter_controller_ = nullptr;
  }

  Win32Window::OnDestroy();
}

LRESULT
FlutterWindow::MessageHandler(HWND hwnd, UINT const message,
                              WPARAM const wparam,
                              LPARAM const lparam) noexcept {
  // Give Flutter, including plugins, an opportunity to handle window messages.
  if (flutter_controller_) {
    std::optional<LRESULT> result =
        flutter_controller_->HandleTopLevelWindowProc(hwnd, message, wparam,
                                                      lparam);
    if (result) {
      return *result;
    }
  }

  switch (message) {
    case WM_HOTKEY:
      if (wparam == kWindowsOverlayHotkeyId) {
        PushWindowsOverlayEvent("hotkey");
        ShowWindowsOverlay();
        return 0;
      }
      break;
    case WM_FONTCHANGE:
      flutter_controller_->engine()->ReloadSystemFonts();
      break;
  }

  return Win32Window::MessageHandler(hwnd, message, wparam, lparam);
}

void FlutterWindow::RegisterWindowsOverlayChannel() {
  windows_overlay_channel_ =
      std::make_unique<flutter::MethodChannel<flutter::EncodableValue>>(
          flutter_controller_->engine()->messenger(), kWindowsOverlayChannelName,
          &flutter::StandardMethodCodec::GetInstance());

  windows_overlay_channel_->SetMethodCallHandler(
      [this](const auto& call, auto result) {
        const std::string& method = call.method_name();
        if (method == "getWindowsOverlayStatus") {
          result->Success(WindowsOverlayStatus());
          return;
        }
        if (method == "setWindowsOverlayEnabled") {
          bool enabled = false;
          if (const auto* arguments =
                  std::get_if<flutter::EncodableMap>(call.arguments())) {
            const auto enabled_it = arguments->find(
                flutter::EncodableValue(std::string("enabled")));
            if (enabled_it != arguments->end()) {
              if (const auto* value = std::get_if<bool>(&enabled_it->second)) {
                enabled = *value;
              }
            }
          }
          if (!SetWindowsOverlayEnabled(enabled)) {
            result->Error(last_error_code_, last_error_message_);
            return;
          }
          result->Success(WindowsOverlayStatus());
          return;
        }
        if (method == "showWindowsOverlay") {
          if (!ShowWindowsOverlay()) {
            result->Error(last_error_code_, last_error_message_);
            return;
          }
          result->Success(WindowsOverlayStatus());
          return;
        }
        if (method == "hideWindowsOverlay") {
          if (!HideWindowsOverlay()) {
            result->Error(last_error_code_, last_error_message_);
            return;
          }
          result->Success(WindowsOverlayStatus());
          return;
        }
        if (method == "setWindowsOverlayAppearance") {
          if (const auto* arguments =
                  std::get_if<flutter::EncodableMap>(call.arguments())) {
            const auto size_it = arguments->find(
                flutter::EncodableValue(std::string("sizeScale")));
            if (size_it != arguments->end()) {
              if (const auto* value = std::get_if<double>(&size_it->second)) {
                windows_overlay_size_scale_ = *value;
              }
            }
            const auto opacity_it =
                arguments->find(flutter::EncodableValue(std::string("opacity")));
            if (opacity_it != arguments->end()) {
              if (const auto* value = std::get_if<double>(&opacity_it->second)) {
                windows_overlay_opacity_ = *value;
              }
            }
          }
          const BYTE alpha =
              static_cast<BYTE>(255.0 * windows_overlay_opacity_);
          SetLayeredWindowAttributes(GetHandle(), 0, alpha, LWA_ALPHA);
          result->Success(WindowsOverlayStatus());
          return;
        }
        if (method == "deliverWindowsOverlayText") {
          std::string text;
          if (const auto* arguments =
                  std::get_if<flutter::EncodableMap>(call.arguments())) {
            const auto text_it =
                arguments->find(flutter::EncodableValue(std::string("text")));
            if (text_it != arguments->end()) {
              if (const auto* value = std::get_if<std::string>(&text_it->second)) {
                text = *value;
              }
            }
          }
          if (text.empty()) {
            result->Success(WindowsOverlayDeliveryResult(
                false, false, false, "EMPTY_TEXT", "No text to deliver."));
            return;
          }
          const bool copied = CopyTextToClipboard(Utf8ToWide(text));
          if (!copied) {
            result->Success(WindowsOverlayDeliveryResult(
                false, false, false, last_error_code_, last_error_message_));
            return;
          }
          const bool pasted = DeliverClipboardToLastForeground();
          result->Success(WindowsOverlayDeliveryResult(
              copied, true, pasted, pasted ? "" : "PASTE_DELIVERY_FAILED",
              pasted ? "" : "Clipboard copied, but paste delivery failed."));
          return;
        }
        if (method == "deliverWindowsOverlayKeySequence") {
          int sent_steps = 0;
          if (const auto* arguments =
                  std::get_if<flutter::EncodableMap>(call.arguments())) {
            const auto steps_it =
                arguments->find(flutter::EncodableValue(std::string("steps")));
            if (steps_it != arguments->end()) {
              if (const auto* steps =
                      std::get_if<flutter::EncodableList>(&steps_it->second)) {
                if (DeliverKeySequence(*steps, &sent_steps)) {
                  result->Success(WindowsOverlayCommandResult(
                      "delivered", sent_steps, "", ""));
                } else {
                  result->Success(WindowsOverlayCommandResult(
                      "failed", sent_steps, last_error_code_,
                      last_error_message_));
                }
                return;
              }
            }
          }
          result->Success(WindowsOverlayCommandResult(
              "failed", sent_steps, "INVALID_SEQUENCE",
              "Key sequence payload is invalid."));
          return;
        }
        if (method == "drainWindowsOverlayEvents") {
          flutter::EncodableList events;
          events.reserve(windows_overlay_events_.size());
          for (const auto& event : windows_overlay_events_) {
            events.push_back(event);
          }
          windows_overlay_events_.clear();
          result->Success(flutter::EncodableValue(events));
          return;
        }
        result->NotImplemented();
      });
}

flutter::EncodableValue FlutterWindow::WindowsOverlayStatus() const {
  flutter::EncodableMap status;
  status[flutter::EncodableValue("supported")] = flutter::EncodableValue(true);
  status[flutter::EncodableValue("enabled")] =
      flutter::EncodableValue(windows_overlay_enabled_);
  status[flutter::EncodableValue("visible")] =
      flutter::EncodableValue(windows_overlay_visible_);
  status[flutter::EncodableValue("hotkeyRegistered")] =
      flutter::EncodableValue(hotkey_registered_);
  status[flutter::EncodableValue("hotkeyLabel")] =
      flutter::EncodableValue("Ctrl+Alt+Space");
  status[flutter::EncodableValue("deliveryMode")] =
      flutter::EncodableValue("paste_and_clipboard");
  status[flutter::EncodableValue("sizeScale")] =
      flutter::EncodableValue(windows_overlay_size_scale_);
  status[flutter::EncodableValue("opacity")] =
      flutter::EncodableValue(windows_overlay_opacity_);
  status[flutter::EncodableValue("eventQueueSize")] =
      flutter::EncodableValue(static_cast<int>(windows_overlay_events_.size()));
  if (!last_error_code_.empty()) {
    status[flutter::EncodableValue("lastErrorCode")] =
        flutter::EncodableValue(last_error_code_);
    status[flutter::EncodableValue("lastErrorMessage")] =
        flutter::EncodableValue(last_error_message_);
  }
  return flutter::EncodableValue(status);
}

flutter::EncodableValue FlutterWindow::WindowsOverlayDeliveryResult(
    bool clipboard_copied,
    bool paste_attempted,
    bool paste_succeeded,
    const std::string& error_code,
    const std::string& error_message) const {
  flutter::EncodableMap result;
  result[flutter::EncodableValue("status")] = flutter::EncodableValue(
      paste_succeeded ? "delivered"
                      : (clipboard_copied ? "clipboard_only" : "failed"));
  result[flutter::EncodableValue("clipboardCopied")] =
      flutter::EncodableValue(clipboard_copied);
  result[flutter::EncodableValue("pasteAttempted")] =
      flutter::EncodableValue(paste_attempted);
  result[flutter::EncodableValue("pasteSucceeded")] =
      flutter::EncodableValue(paste_succeeded);
  if (!error_code.empty()) {
    result[flutter::EncodableValue("errorCode")] =
        flutter::EncodableValue(error_code);
    result[flutter::EncodableValue("errorMessage")] =
        flutter::EncodableValue(error_message);
  }
  return flutter::EncodableValue(result);
}

flutter::EncodableValue FlutterWindow::WindowsOverlayCommandResult(
    const std::string& status,
    int sent_steps,
    const std::string& error_code,
    const std::string& error_message) const {
  flutter::EncodableMap result;
  result[flutter::EncodableValue("status")] = flutter::EncodableValue(status);
  result[flutter::EncodableValue("sentSteps")] =
      flutter::EncodableValue(sent_steps);
  if (!error_code.empty()) {
    result[flutter::EncodableValue("errorCode")] =
        flutter::EncodableValue(error_code);
    result[flutter::EncodableValue("errorMessage")] =
        flutter::EncodableValue(error_message);
  }
  return flutter::EncodableValue(result);
}

bool FlutterWindow::SetWindowsOverlayEnabled(bool enabled) {
  last_error_code_.clear();
  last_error_message_.clear();
  if (enabled && !hotkey_registered_) {
    hotkey_registered_ = RegisterHotKey(
        GetHandle(), kWindowsOverlayHotkeyId, MOD_CONTROL | MOD_ALT, VK_SPACE);
    if (!hotkey_registered_) {
      last_error_code_ = "HOTKEY_REGISTRATION_FAILED";
      last_error_message_ = "Ctrl+Alt+Space is unavailable.";
      windows_overlay_enabled_ = false;
      return false;
    }
  }
  if (!enabled && hotkey_registered_) {
    UnregisterHotKey(GetHandle(), kWindowsOverlayHotkeyId);
    hotkey_registered_ = false;
  }
  windows_overlay_enabled_ = enabled;
  return true;
}

bool FlutterWindow::ShowWindowsOverlay() {
  last_foreground_window_ = GetForegroundWindow();
  SetWindowLongPtr(GetHandle(), GWL_EXSTYLE,
                   GetWindowLongPtr(GetHandle(), GWL_EXSTYLE) | WS_EX_TOPMOST |
                       WS_EX_LAYERED);
  const BYTE alpha = static_cast<BYTE>(255.0 * windows_overlay_opacity_);
  SetLayeredWindowAttributes(GetHandle(), 0, alpha, LWA_ALPHA);
  const bool shown = SetWindowPos(GetHandle(), HWND_TOPMOST, 0, 0, 0, 0,
                                  SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW) !=
                     0;
  windows_overlay_visible_ = shown;
  if (!shown) {
    last_error_code_ = "OVERLAY_SHOW_FAILED";
    last_error_message_ = "Windows refused to show the overlay window.";
  }
  return shown;
}

bool FlutterWindow::HideWindowsOverlay() {
  const bool hidden = ShowWindow(GetHandle(), SW_HIDE) != 0;
  windows_overlay_visible_ = false;
  return hidden || GetLastError() == 0;
}

bool FlutterWindow::CopyTextToClipboard(const std::wstring& text) const {
  if (!OpenClipboard(GetHandle())) {
    return false;
  }
  EmptyClipboard();
  const size_t bytes = (text.size() + 1) * sizeof(wchar_t);
  HGLOBAL memory = GlobalAlloc(GMEM_MOVEABLE, bytes);
  if (memory == nullptr) {
    CloseClipboard();
    return false;
  }
  void* locked_memory = GlobalLock(memory);
  if (locked_memory == nullptr) {
    GlobalFree(memory);
    CloseClipboard();
    return false;
  }
  memcpy(locked_memory, text.c_str(), bytes);
  GlobalUnlock(memory);
  if (SetClipboardData(CF_UNICODETEXT, memory) == nullptr) {
    GlobalFree(memory);
    CloseClipboard();
    return false;
  }
  CloseClipboard();
  return true;
}

bool FlutterWindow::DeliverClipboardToLastForeground() const {
  if (last_foreground_window_ == nullptr ||
      last_foreground_window_ == GetHandle()) {
    return false;
  }
  SetForegroundWindow(last_foreground_window_);
  INPUT inputs[4] = {};
  inputs[0].type = INPUT_KEYBOARD;
  inputs[0].ki.wVk = VK_CONTROL;
  inputs[1].type = INPUT_KEYBOARD;
  inputs[1].ki.wVk = 'V';
  inputs[2].type = INPUT_KEYBOARD;
  inputs[2].ki.wVk = 'V';
  inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;
  inputs[3].type = INPUT_KEYBOARD;
  inputs[3].ki.wVk = VK_CONTROL;
  inputs[3].ki.dwFlags = KEYEVENTF_KEYUP;
  return SendInput(4, inputs, sizeof(INPUT)) == 4;
}

bool FlutterWindow::DeliverKeySequence(const flutter::EncodableList& steps,
                                       int* sent_steps) {
  last_error_code_.clear();
  last_error_message_.clear();
  if (steps.empty()) {
    last_error_code_ = "EMPTY_SEQUENCE";
    last_error_message_ = "No key sequence to deliver.";
    return false;
  }
  if (last_foreground_window_ == nullptr ||
      last_foreground_window_ == GetHandle()) {
    last_error_code_ = "NO_TARGET_WINDOW";
    last_error_message_ = "No target window is available for key delivery.";
    return false;
  }
  SetForegroundWindow(last_foreground_window_);
  ::Sleep(50);
  *sent_steps = 0;
  for (const auto& entry : steps) {
    const auto* step_map = std::get_if<flutter::EncodableMap>(&entry);
    if (step_map == nullptr) {
      last_error_code_ = "INVALID_SEQUENCE_STEP";
      last_error_message_ = "A key sequence step is malformed.";
      return false;
    }
    const auto key_it =
        step_map->find(flutter::EncodableValue(std::string("key")));
    if (key_it == step_map->end()) {
      last_error_code_ = "MISSING_SEQUENCE_KEY";
      last_error_message_ = "A key sequence step is missing its key.";
      return false;
    }
    const auto* key_name = std::get_if<std::string>(&key_it->second);
    const auto vk = key_name == nullptr ? std::nullopt : VirtualKeyFromName(*key_name);
    if (!vk.has_value()) {
      last_error_code_ = "UNSUPPORTED_SEQUENCE_KEY";
      last_error_message_ = "A key sequence step uses an unsupported key.";
      return false;
    }
    bool ctrl = false;
    bool alt = false;
    bool shift = false;
    bool meta = false;
    const auto modifiers_it =
        step_map->find(flutter::EncodableValue(std::string("modifiers")));
    if (modifiers_it != step_map->end()) {
      const auto* modifiers =
          std::get_if<flutter::EncodableList>(&modifiers_it->second);
      if (modifiers == nullptr) {
        last_error_code_ = "INVALID_SEQUENCE_MODIFIERS";
        last_error_message_ = "A key sequence modifier list is malformed.";
        return false;
      }
      for (const auto& modifier_entry : *modifiers) {
        const auto* modifier_name = std::get_if<std::string>(&modifier_entry);
        if (modifier_name == nullptr) {
          continue;
        }
        if (*modifier_name == "ctrl") {
          ctrl = true;
        } else if (*modifier_name == "alt") {
          alt = true;
        } else if (*modifier_name == "shift") {
          shift = true;
        } else if (*modifier_name == "meta") {
          meta = true;
        }
      }
    }
    std::vector<INPUT> inputs;
    if (ctrl) {
      AppendKeyInput(&inputs, VK_CONTROL);
    }
    if (alt) {
      AppendKeyInput(&inputs, VK_MENU);
    }
    if (shift) {
      AppendKeyInput(&inputs, VK_SHIFT);
    }
    if (meta) {
      AppendKeyInput(&inputs, VK_LWIN);
    }
    AppendKeyInput(&inputs, *vk);
    AppendKeyInput(&inputs, *vk, true);
    if (meta) {
      AppendKeyInput(&inputs, VK_LWIN, true);
    }
    if (shift) {
      AppendKeyInput(&inputs, VK_SHIFT, true);
    }
    if (alt) {
      AppendKeyInput(&inputs, VK_MENU, true);
    }
    if (ctrl) {
      AppendKeyInput(&inputs, VK_CONTROL, true);
    }
    const UINT sent = SendInput(static_cast<UINT>(inputs.size()), inputs.data(),
                                sizeof(INPUT));
    if (sent != inputs.size()) {
      last_error_code_ = "KEY_SEQUENCE_DELIVERY_FAILED";
      last_error_message_ = "Windows key injection failed.";
      return false;
    }
    ++(*sent_steps);
    ::Sleep(25);
  }
  return true;
}

void FlutterWindow::PushWindowsOverlayEvent(const std::string& trigger) {
  flutter::EncodableMap event;
  event[flutter::EncodableValue("trigger")] = flutter::EncodableValue(trigger);
  event[flutter::EncodableValue("capturedAtEpochMillis")] =
      flutter::EncodableValue(CurrentEpochMillis());
  windows_overlay_events_.push_back(flutter::EncodableValue(event));
}

std::wstring FlutterWindow::Utf8ToWide(const std::string& value) const {
  if (value.empty()) {
    return L"";
  }
  const int size = MultiByteToWideChar(CP_UTF8, 0, value.data(),
                                       static_cast<int>(value.size()), nullptr,
                                       0);
  std::wstring wide(size, L'\0');
  MultiByteToWideChar(CP_UTF8, 0, value.data(), static_cast<int>(value.size()),
                      wide.data(), size);
  return wide;
}
