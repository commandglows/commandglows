#include "desktop_control_host.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <iterator>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#include <flutter/encodable_value.h>
#include <flutter/method_channel.h>
#include <flutter/standard_method_codec.h>
#include <dwmapi.h>

#include "desktop_control_geometry.h"
#include "desktop_control_keymap.h"

namespace {

constexpr char kChannelName[] = "commandglows_app/desktop_control";
constexpr wchar_t kOverlayClassName[] = L"COMMANDGLOWS_DESKTOP_CONTROL";
constexpr int kActivationHotkeyId = 0x4347;
constexpr int kCandidateHotkeyId = 0x4349;
constexpr UINT_PTR kHookTeardownTimerId = 0x4348;
constexpr UINT kHookKeyMessage = WM_APP + 0x4C1;
constexpr UINT kHookCleanupMessage = WM_APP + 0x4C2;
constexpr ULONGLONG kCloseAppSequenceTimeoutMs = 800;
constexpr COLORREF kTransparentColor = RGB(1, 2, 3);
constexpr COLORREF kGridColor = RGB(255, 196, 32);
constexpr COLORREF kGridTextColor = RGB(18, 22, 28);
constexpr COLORREF kRegionColor = RGB(70, 190, 240);
constexpr COLORREF kErrorColor = RGB(122, 35, 35);
constexpr UINT kDefaultWheelDelta = WHEEL_DELTA;

using commandglows::desktop_control::CenterOf;
using commandglows::desktop_control::CaptureKeyDown;
using commandglows::desktop_control::DivideCell;
using commandglows::desktop_control::IntersectNonEmpty;
using commandglows::desktop_control::kCoordinateKeys;
using commandglows::desktop_control::kGridKeys;
using commandglows::desktop_control::KeyCaptureDecision;
using commandglows::desktop_control::KeyBinding;
using commandglows::desktop_control::KeyLegend;
using commandglows::desktop_control::PhysicalKey;
using commandglows::desktop_control::ReleaseKeyUp;

struct ActivationBinding {
  UINT virtual_key = 'G';
  UINT modifiers = MOD_CONTROL | MOD_ALT;
};

using BindingMap = std::unordered_map<std::string, std::vector<KeyBinding>>;

BindingMap DefaultBindings() {
  return {
      {"leftClick", {{0x39, false}, {0x3B, false}}},
      {"rightClick", {{0x3C, false}}}, {"middleClick", {{0x3D, false}}},
      {"dragStart", {{0x3E, false}}}, {"dragRelease", {{0x3F, false}}},
      {"wheelUp", {{0x40, false}}}, {"wheelDown", {{0x41, false}}},
      {"back", {{0x0E, false}}}, {"reset", {{0x43, false}}},
      {"coordinateView", {{0x0F, false}}}, {"toggleScope", {{0x42, false}}},
      {"previousMonitor", {{0x49, true}}}, {"nextMonitor", {{0x51, true}}},
      {"nudgeLeft", {{0x4B, true}}}, {"nudgeRight", {{0x4D, true}}},
      {"nudgeUp", {{0x48, true}}}, {"nudgeDown", {{0x50, true}}},
      {"close", {{0x01, false}}},
  };
}

const std::array<const char*, 18> kActionIds{{
    "leftClick", "rightClick", "middleClick", "dragStart", "dragRelease",
    "wheelUp", "wheelDown", "back", "reset", "coordinateView",
    "toggleScope", "previousMonitor", "nextMonitor", "nudgeLeft",
    "nudgeRight", "nudgeUp", "nudgeDown", "close"}};

enum class InputAction {
  none,
  escape,
  back,
  reset,
  coordinate_view,
  left_click,
  right_click,
  middle_click,
  drag_start,
  drag_release,
  wheel_up,
  wheel_down,
  nudge_left,
  nudge_right,
  nudge_up,
  nudge_down,
  previous_monitor,
  next_monitor,
  toggle_scope,
};

enum class GridScope { monitor, window };

const char* ScopeName(GridScope scope) {
  return scope == GridScope::window ? "window" : "monitor";
}

UINT CurrentModifierMask() {
  UINT modifiers = 0;
  if ((GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0) modifiers |= MOD_CONTROL;
  if ((GetAsyncKeyState(VK_MENU) & 0x8000) != 0) modifiers |= MOD_ALT;
  if ((GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0) modifiers |= MOD_SHIFT;
  if ((GetAsyncKeyState(VK_LWIN) & 0x8000) != 0 ||
      (GetAsyncKeyState(VK_RWIN) & 0x8000) != 0) modifiers |= MOD_WIN;
  return modifiers;
}

bool IsExtended(const KBDLLHOOKSTRUCT& key) {
  return (key.flags & LLKHF_EXTENDED) != 0;
}

}  // namespace

class WindowsDesktopControlHost::Impl {
 public:
  using Value = flutter::EncodableValue;

  Impl(HWND owner, flutter::BinaryMessenger* messenger)
      : owner_(owner),
        channel_(messenger, kChannelName,
                 &flutter::StandardMethodCodec::GetInstance()) {
    RegisterOverlayClass();
    channel_.SetMethodCallHandler([this](const auto& call, auto result) {
      const std::string& method = call.method_name();
      if (method == "getStatus") {
        result->Success(Status());
      } else if (method == "getBindings") {
        result->Success(BindingsValue());
      } else if (method == "setBindings") {
        std::string validation_error;
        if (!SetBindings(call.arguments(), &validation_error)) {
          if (error_code_ != "HOTKEY_UNAVAILABLE" && error_code_ != "BINDINGS_ACTIVE")
            error_code_ = "INVALID_BINDINGS";
          validation_error_ = validation_error;
          result->Success(Status());
          return;
        }
        error_code_.clear();
        validation_error_.clear();
        result->Success(Status());
      } else if (method == "setCloseAppHotkeyListening") {
        bool enabled = false;
        if (const auto* args = std::get_if<flutter::EncodableMap>(call.arguments())) {
          const auto it = args->find(Value("enabled"));
          if (it != args->end()) {
            if (const auto* value = std::get_if<bool>(&it->second)) {
              enabled = *value;
            }
          }
        }
        close_app_hotkey_listening_ = enabled;
        pending_close_app_target_ = nullptr;
        pending_close_app_index_ = 0;
        result->Success(Status());
      } else if (method == "setEnabled") {
        bool enabled = false;
        if (const auto* args = std::get_if<flutter::EncodableMap>(call.arguments())) {
          const auto it = args->find(Value("enabled"));
          if (it != args->end()) {
            if (const auto* value = std::get_if<bool>(&it->second)) {
              enabled = *value;
            }
          }
        }
        SetEnabled(enabled);
        result->Success(Status());
      } else if (method == "setPreferredScope") {
        const auto* args = std::get_if<flutter::EncodableMap>(call.arguments());
        if (args == nullptr) {
          result->Error("INVALID_SCOPE", "Expected monitor or window");
          return;
        }
        const auto it = args->find(Value("scope"));
        if (it == args->end() ||
            !std::holds_alternative<std::string>(it->second)) {
          result->Error("INVALID_SCOPE", "Expected monitor or window");
          return;
        }
        const auto& scope = std::get<std::string>(it->second);
        if (scope != "monitor" && scope != "window") {
          result->Error("INVALID_SCOPE", "Expected monitor or window");
          return;
        }
        preferred_scope_ = scope == "window" ? GridScope::window
                                                : GridScope::monitor;
        result->Success(Status());
      } else if (method == "activate") {
        Activate();
        result->Success(Status());
      } else if (method == "cancel") {
        Cancel();
        result->Success(Status());
      } else {
        result->NotImplemented();
      }
    });
    if (close_hook_host_ == nullptr) {
      close_hook_host_ = this;
      close_keyboard_hook_ = SetWindowsHookExW(
          WH_KEYBOARD_LL, CloseAppKeyboardProc, GetModuleHandleW(nullptr), 0);
      if (close_keyboard_hook_ == nullptr) {
        close_hook_host_ = nullptr;
        error_code_ = "HOOK_UNAVAILABLE";
      }
    }
  }

  ~Impl() {
    Cancel();
    ReleaseHeldButtons();
    ForceHookTeardown();
    if (close_keyboard_hook_ != nullptr) {
      UnhookWindowsHookEx(close_keyboard_hook_);
      close_keyboard_hook_ = nullptr;
    }
    if (close_hook_host_ == this) close_hook_host_ = nullptr;
    SetEnabled(false);
    channel_.SetMethodCallHandler(nullptr);
    if (overlay_class_registered_) {
      UnregisterClassW(kOverlayClassName, GetModuleHandleW(nullptr));
    }
  }

  bool HandleWindowMessage(UINT message, WPARAM wparam, LPARAM lparam) {
    if (message == WM_HOTKEY && wparam == static_cast<WPARAM>(hotkey_id_)) {
      if (active_) {
        Cancel();
      } else if (enabled_) {
        Activate();
      }
      return true;
    }
    if (message == kHookKeyMessage) {
      ProcessKey(static_cast<UINT>(wparam), static_cast<UINT>(lparam));
      return true;
    }
    if (message == kHookCleanupMessage) {
      FinishHookTeardown();
      return true;
    }
    if (message == WM_TIMER && wparam == kHookTeardownTimerId) {
      swallowed_keys_.clear();
      ForceHookTeardown();
      return true;
    }
    if ((message == WM_DISPLAYCHANGE || message == WM_DPICHANGED) && active_) {
      Cancel();
      error_code_ = "OVERLAY_UNAVAILABLE";
      return false;
    }
    return false;
  }

 private:
  struct Monitor {
    HMONITOR handle = nullptr;
    RECT bounds{};
    std::wstring device_name;
  };

  struct SelectionState {
    RECT region;
    bool coordinate_view;
  };

  static LRESULT CALLBACK LowLevelKeyboardProc(int code, WPARAM wparam,
                                               LPARAM lparam) {
    if (code < 0 || active_hook_host_ == nullptr) {
      return CallNextHookEx(nullptr, code, wparam, lparam);
    }
    auto* host = active_hook_host_;
    const auto* key = reinterpret_cast<const KBDLLHOOKSTRUCT*>(lparam);
    if ((key->flags & LLKHF_INJECTED) != 0) {
      return CallNextHookEx(nullptr, code, wparam, lparam);
    }
    const UINT scan_code = key->scanCode & 0xFF;
    const bool extended = IsExtended(*key);
    const uint32_t identity = scan_code | (extended ? 0x100 : 0);
    if (wparam == WM_KEYUP || wparam == WM_SYSKEYUP) {
      if (ReleaseKeyUp(host->swallowed_keys_, identity)) {
        if (host->teardown_pending_ && host->swallowed_keys_.empty()) {
          PostMessageW(host->owner_, kHookCleanupMessage, 0, 0);
        }
        return 1;
      }
      return CallNextHookEx(nullptr, code, wparam, lparam);
    }
    if (wparam != WM_KEYDOWN && wparam != WM_SYSKEYDOWN) {
      return CallNextHookEx(nullptr, code, wparam, lparam);
    }

    const UINT modifiers = CurrentModifierMask();
    const bool assigned = host->active_ &&
                          host->IsAssignedKey(key->vkCode, scan_code, extended,
                                              modifiers);
    const auto decision = CaptureKeyDown(host->swallowed_keys_, identity,
                                         host->active_, assigned);
    if (decision == KeyCaptureDecision::repeat) {
      return 1;
    }
    if (decision == KeyCaptureDecision::forward) {
      return CallNextHookEx(nullptr, code, wparam, lparam);
    }
    const LPARAM payload = static_cast<LPARAM>((scan_code & 0xFF) |
                                                (extended ? 0x100 : 0) |
                                                ((key->vkCode & 0xFF) << 16) |
                                                ((modifiers & MOD_SHIFT) ? 0x200 : 0) |
                                                ((modifiers & MOD_CONTROL) ? 0x400 : 0) |
                                                ((modifiers & MOD_ALT) ? 0x800 : 0) |
                                                ((modifiers & MOD_WIN) ? 0x1000 : 0));
    if (!PostMessageW(host->owner_, kHookKeyMessage, key->vkCode, payload)) {
      ReleaseKeyUp(host->swallowed_keys_, identity);
      return CallNextHookEx(nullptr, code, wparam, lparam);
    }
    return 1;
  }

  static LRESULT CALLBACK CloseAppKeyboardProc(int code, WPARAM wparam,
                                                LPARAM lparam) {
    if (code < 0 || close_hook_host_ == nullptr) {
      return CallNextHookEx(nullptr, code, wparam, lparam);
    }
    auto* host = close_hook_host_;
    const auto* key = reinterpret_cast<const KBDLLHOOKSTRUCT*>(lparam);
    const UINT scan_code = key->scanCode & 0xFF;
    const bool extended = IsExtended(*key);
    const uint32_t identity = scan_code | (extended ? 0x100 : 0);
    if ((key->flags & LLKHF_INJECTED) != 0) {
      return CallNextHookEx(host->close_keyboard_hook_, code, wparam, lparam);
    }
    if (wparam == WM_KEYUP || wparam == WM_SYSKEYUP) {
      host->close_pressed_keys_.erase(identity);
      return CallNextHookEx(host->close_keyboard_hook_, code, wparam, lparam);
    }
    if (wparam != WM_KEYDOWN && wparam != WM_SYSKEYDOWN) {
      return CallNextHookEx(host->close_keyboard_hook_, code, wparam, lparam);
    }
    if (!host->close_pressed_keys_.insert(identity).second) {
      return CallNextHookEx(host->close_keyboard_hook_, code, wparam, lparam);
    }
    if (!host->close_app_hotkey_listening_ ||
        host->close_app_sequence_.size() != 2) {
      host->pending_close_app_target_ = nullptr;
      host->pending_close_app_index_ = 0;
      return CallNextHookEx(host->close_keyboard_hook_, code, wparam, lparam);
    }

    const KeyBinding pressed{scan_code, extended, CurrentModifierMask()};
    HWND foreground = GetForegroundWindow();
    HWND target = foreground == nullptr ? nullptr
                                        : GetAncestor(foreground, GA_ROOT);
    const ULONGLONG now = GetTickCount64();
    const bool second_matches =
        host->pending_close_app_index_ == 1 &&
        host->pending_close_app_target_ == target &&
        now - host->pending_close_app_at_ <= kCloseAppSequenceTimeoutMs &&
        pressed.scan_code == host->close_app_sequence_[1].scan_code &&
        pressed.extended == host->close_app_sequence_[1].extended &&
        pressed.modifiers == host->close_app_sequence_[1].modifiers;
    if (second_matches) {
      host->pending_close_app_target_ = nullptr;
      host->pending_close_app_index_ = 0;
      if (IsWindow(target)) PostMessageW(target, WM_CLOSE, 0, 0);
    } else if (target != nullptr &&
               pressed.scan_code == host->close_app_sequence_[0].scan_code &&
               pressed.extended == host->close_app_sequence_[0].extended &&
               pressed.modifiers == host->close_app_sequence_[0].modifiers) {
      host->pending_close_app_target_ = target;
      host->pending_close_app_index_ = 1;
      host->pending_close_app_at_ = now;
    } else {
      host->pending_close_app_target_ = nullptr;
      host->pending_close_app_index_ = 0;
    }
    return CallNextHookEx(host->close_keyboard_hook_, code, wparam, lparam);
  }

  static BOOL CALLBACK EnumerateMonitor(HMONITOR monitor, HDC, LPRECT,
                                        LPARAM context) {
    auto* monitors = reinterpret_cast<std::vector<Monitor>*>(context);
    MONITORINFOEXW info{};
    info.cbSize = sizeof(info);
    if (GetMonitorInfoW(monitor, &info)) {
      monitors->push_back(Monitor{monitor, info.rcMonitor, info.szDevice});
    }
    return TRUE;
  }

  static LRESULT CALLBACK OverlayWindowProc(HWND hwnd, UINT message,
                                             WPARAM wparam, LPARAM lparam) {
    if (message == WM_NCCREATE) {
      const auto* create = reinterpret_cast<const CREATESTRUCTW*>(lparam);
      SetWindowLongPtrW(hwnd, GWLP_USERDATA,
                        reinterpret_cast<LONG_PTR>(create->lpCreateParams));
    }
    auto* host = reinterpret_cast<Impl*>(
        GetWindowLongPtrW(hwnd, GWLP_USERDATA));
    if (message == WM_NCHITTEST) {
      return HTTRANSPARENT;
    }
    if (message == WM_MOUSEACTIVATE) {
      return MA_NOACTIVATE;
    }
    if (message == WM_ERASEBKGND) {
      return 1;
    }
    if (message == WM_PAINT) {
      if (host != nullptr) {
        host->Paint(hwnd);
      } else {
        PAINTSTRUCT paint{};
        BeginPaint(hwnd, &paint);
        EndPaint(hwnd, &paint);
      }
      return 0;
    }
    if (message == WM_DPICHANGED && host != nullptr && host->active_) {
      host->Cancel();
      host->error_code_ = "OVERLAY_UNAVAILABLE";
      return 0;
    }
    return DefWindowProcW(hwnd, message, wparam, lparam);
  }

  void RegisterOverlayClass() {
    WNDCLASSW definition{};
    definition.lpfnWndProc = OverlayWindowProc;
    definition.hInstance = GetModuleHandleW(nullptr);
    definition.hCursor = LoadCursorW(nullptr, IDC_ARROW);
    definition.lpszClassName = kOverlayClassName;
    overlay_class_registered_ =
        RegisterClassW(&definition) != 0 ||
        GetLastError() == ERROR_CLASS_ALREADY_EXISTS;
  }

  Value Status() const {
    flutter::EncodableMap status;
    status[Value("supported")] = Value(true);
    status[Value("enabled")] = Value(enabled_);
    status[Value("active")] = Value(active_);
    status[Value("hotkeyRegistered")] = Value(hotkey_registered_);
    status[Value("closeAppHotkeyRegistered")] =
        Value(close_keyboard_hook_ != nullptr);
    status[Value("closeAppHotkeyListening")] =
        Value(close_app_hotkey_listening_);
    status[Value("preferredScope")] = Value(ScopeName(preferred_scope_));
    status[Value("activeScope")] = Value(ScopeName(active_scope_));
    status[Value("errorCode")] = Value(error_code_);
    status[Value("validationError")] = Value(validation_error_);
    status[Value("bindings")] = BindingsValue();
    return Value(std::move(status));
  }

  Value BindingsValue() const {
    const HKL labels_layout = active_ ? keyboard_layout_ : ForegroundKeyboardLayout();
    flutter::EncodableMap activation;
    activation[Value("virtualKey")] = Value(static_cast<int32_t>(activation_.virtual_key));
    activation[Value("modifiers")] = Value(static_cast<int32_t>(activation_.modifiers));
    flutter::EncodableMap actions;
    for (const char* id : kActionIds) {
      flutter::EncodableList list;
      const auto found = bindings_.find(id);
      if (found != bindings_.end()) {
        for (const auto& key : found->second) {
          flutter::EncodableMap item;
          item[Value("scanCode")] = Value(static_cast<int32_t>(key.scan_code));
          item[Value("extended")] = Value(key.extended);
          item[Value("modifiers")] = Value(static_cast<int32_t>(key.modifiers));
          item[Value("label")] = Value(Utf8(KeyLabel(key, labels_layout)));
          list.emplace_back(std::move(item));
        }
      }
      actions[Value(id)] = Value(std::move(list));
    }
    flutter::EncodableList close_app_sequence;
    for (const auto& key : close_app_sequence_) {
      flutter::EncodableMap item;
      item[Value("scanCode")] = Value(static_cast<int32_t>(key.scan_code));
      item[Value("extended")] = Value(key.extended);
      item[Value("modifiers")] = Value(static_cast<int32_t>(key.modifiers));
      item[Value("label")] = Value(Utf8(KeyLabel(key, labels_layout)));
      close_app_sequence.emplace_back(std::move(item));
    }
    flutter::EncodableMap result;
    result[Value("version")] = Value(int32_t{3});
    result[Value("activation")] = Value(std::move(activation));
    result[Value("closeAppSequence")] = Value(std::move(close_app_sequence));
    result[Value("actions")] = Value(std::move(actions));
    return Value(std::move(result));
  }

  bool SetBindings(const Value* raw, std::string* reason) {
    error_code_.clear();
    const auto* root = raw == nullptr ? nullptr : std::get_if<flutter::EncodableMap>(raw);
    if (root == nullptr) { *reason = "La configuration des touches est invalide."; return false; }
    const auto get = [](const flutter::EncodableMap& map, const char* key) -> const Value* {
      const auto found = map.find(Value(key));
      return found == map.end() ? nullptr : &found->second;
    };
    const Value* version_value = get(*root, "version");
    const auto* version = version_value == nullptr ? nullptr : std::get_if<int32_t>(version_value);
    if (version == nullptr || *version != 3) { *reason = "Cette version de configuration des touches n’est pas prise en charge."; return false; }
    const Value* activation_value = get(*root, "activation");
    const auto* activation_map = activation_value == nullptr ? nullptr : std::get_if<flutter::EncodableMap>(activation_value);
    const Value* actions_value = get(*root, "actions");
    const auto* actions_map = actions_value == nullptr ? nullptr : std::get_if<flutter::EncodableMap>(actions_value);
    const Value* close_sequence_value = get(*root, "closeAppSequence");
    const auto* close_sequence = close_sequence_value == nullptr ? nullptr : std::get_if<flutter::EncodableList>(close_sequence_value);
    if (activation_map == nullptr || actions_map == nullptr || close_sequence == nullptr || close_sequence->size() != 2) { *reason = "Le raccourci d’activation, la séquence de fermeture et les actions sont obligatoires."; return false; }
    const Value* vk_value = get(*activation_map, "virtualKey");
    const Value* mods_value = get(*activation_map, "modifiers");
    const auto* vk = vk_value == nullptr ? nullptr : std::get_if<int32_t>(vk_value);
    const auto* mods = mods_value == nullptr ? nullptr : std::get_if<int32_t>(mods_value);
    constexpr UINT kAllowedModifiers = MOD_ALT | MOD_CONTROL | MOD_SHIFT | MOD_WIN;
    if (vk == nullptr || mods == nullptr || *vk <= 0 || *vk > 0xFF ||
        (*mods & ~static_cast<int32_t>(kAllowedModifiers)) != 0 ||
        *mods == 0 || IsModifierVirtualKey(static_cast<UINT>(*vk))) {
      *reason = "Choisissez une touche d’activation et des modificateurs valides.";
      return false;
    }
    if (static_cast<UINT>(*vk) == VK_SPACE &&
        static_cast<UINT>(*mods) == (MOD_CONTROL | MOD_ALT)) {
      *reason = "Ctrl+Alt+Espace est réservé à l’incrustation de texte.";
      return false;
    }
    if ((*mods & MOD_WIN) != 0 &&
        (static_cast<UINT>(*vk) == 'L' || static_cast<UINT>(*vk) == 'D')) {
      *reason = "Ce raccourci Windows est réservé au système.";
      return false;
    }
    std::vector<KeyBinding> candidate_close_sequence;
    candidate_close_sequence.reserve(2);
    for (const Value& item_value : *close_sequence) {
      const auto* item = std::get_if<flutter::EncodableMap>(&item_value);
      if (item == nullptr) { *reason = "La séquence de fermeture est invalide."; return false; }
      const Value* scan_value = get(*item, "scanCode");
      const Value* ext_value = get(*item, "extended");
      const Value* key_mods_value = get(*item, "modifiers");
      const auto* scan = scan_value == nullptr ? nullptr : std::get_if<int32_t>(scan_value);
      const auto* ext = ext_value == nullptr ? nullptr : std::get_if<bool>(ext_value);
      const auto* key_mods = key_mods_value == nullptr ? nullptr : std::get_if<int32_t>(key_mods_value);
      const int32_t sequence_modifiers = key_mods == nullptr ? 0 : *key_mods;
      if (scan == nullptr || ext == nullptr || *scan <= 0 || *scan > 0x7F ||
          (sequence_modifiers & ~static_cast<int32_t>(kAllowedModifiers)) != 0 ||
          (sequence_modifiers & MOD_WIN) != 0) {
        *reason = "Une des touches de fermeture n’est pas accessible."; return false;
      }
      KeyBinding key{static_cast<UINT>(*scan), *ext,
                     static_cast<UINT>(sequence_modifiers)};
      const UINT mapped = MapVirtualKeyExW(key.scan_code | (key.extended ? 0xE000 : 0),
                                           MAPVK_VSC_TO_VK_EX, GetKeyboardLayout(0));
      if (mapped == 0 || IsModifierVirtualKey(mapped) ||
          commandglows::desktop_control::IsModifierKey(key)) {
        *reason = "Une touche de modification seule ou inconnue ne peut pas fermer une application."; return false;
      }
      if (key.modifiers == static_cast<UINT>(*mods) &&
          mapped == static_cast<UINT>(*vk)) {
        *reason = "La séquence de fermeture ne peut pas réutiliser le raccourci d’activation de la grille."; return false;
      }
      if (mapped == VK_SPACE && key.modifiers == (MOD_CONTROL | MOD_ALT)) {
        *reason = "Ctrl+Alt+Espace est réservé à l’incrustation de texte."; return false;
      }
      candidate_close_sequence.push_back(key);
    }
    BindingMap candidate;
    std::unordered_map<uint64_t, std::string> owners;
    for (const char* id : kActionIds) {
      const Value* list_value = get(*actions_map, id);
      const auto* list = list_value == nullptr ? nullptr : std::get_if<flutter::EncodableList>(list_value);
      if (list == nullptr) { *reason = std::string("Configuration absente pour l’action ") + id + "."; return false; }
      auto& keys = candidate[id];
      for (const Value& item_value : *list) {
        const auto* item = std::get_if<flutter::EncodableMap>(&item_value);
        if (item == nullptr) { *reason = "Chaque touche doit avoir une configuration valide."; return false; }
        const Value* scan_value = get(*item, "scanCode");
        const Value* ext_value = get(*item, "extended");
        const Value* key_mods_value = get(*item, "modifiers");
        const auto* scan = scan_value == nullptr ? nullptr : std::get_if<int32_t>(scan_value);
        const auto* ext = ext_value == nullptr ? nullptr : std::get_if<bool>(ext_value);
        const auto* key_mods = key_mods_value == nullptr ? nullptr : std::get_if<int32_t>(key_mods_value);
        if (scan == nullptr || ext == nullptr || *scan <= 0 || *scan > 0x7F) {
          *reason = "Cette touche physique n’est pas accessible."; return false;
        }
        const int32_t action_modifiers = key_mods == nullptr ? 0 : *key_mods;
        if ((action_modifiers & ~static_cast<int32_t>(kAllowedModifiers)) != 0) {
          *reason = "Les modificateurs de cette touche sont invalides."; return false;
        }
        if ((action_modifiers & MOD_WIN) != 0) {
          *reason = "Les raccourcis avec la touche Windows sont réservés au système."; return false;
        }
        KeyBinding key{static_cast<UINT>(*scan), *ext, static_cast<UINT>(action_modifiers)};
        const UINT mapped = MapVirtualKeyExW(key.scan_code | (key.extended ? 0xE000 : 0),
                                             MAPVK_VSC_TO_VK_EX, GetKeyboardLayout(0));
        if (mapped == 0 || IsModifierVirtualKey(mapped) ||
            commandglows::desktop_control::IsModifierKey(key)) {
          *reason = "Une touche de modification seule ou inconnue ne peut pas être affectée."; return false;
        }
        if (key.modifiers == static_cast<UINT>(*mods) &&
            mapped == static_cast<UINT>(*vk)) {
          *reason = "Une action ne peut pas reprendre le raccourci d’activation global.";
          return false;
        }
        if (mapped == VK_SPACE &&
            key.modifiers == (MOD_CONTROL | MOD_ALT)) {
          *reason = "Ctrl+Alt+Espace est réservé à l’incrustation de texte.";
          return false;
        }
        if (commandglows::desktop_control::IsCellKey(key)) {
          *reason = "Une touche de sélection de case ne peut pas piloter une action."; return false;
        }
        if (key.scan_code == 0x01 && !key.extended &&
            (std::string(id) != "close" || key.modifiers != 0)) {
          *reason = "Échap reste réservé à la fermeture d’urgence."; return false;
        }
        const uint64_t identity = key.scan_code | (key.extended ? 0x100 : 0) |
                                  (static_cast<uint64_t>(key.modifiers) << 16);
        const auto owner = owners.find(identity);
        if (owner != owners.end()) {
          *reason = "Une même touche ne peut déclencher qu’une seule action."; return false;
        }
        owners.emplace(identity, id);
        keys.push_back(key);
      }
    }
    const UINT next_vk = static_cast<UINT>(*vk);
    if (active_) {
      bool unchanged = activation_.virtual_key == next_vk &&
                       activation_.modifiers == static_cast<UINT>(*mods);
      for (const char* id : kActionIds) {
        const auto old_it = bindings_.find(id);
        const auto new_it = candidate.find(id);
        if (old_it == bindings_.end() || new_it == candidate.end() ||
            old_it->second.size() != new_it->second.size()) { unchanged = false; break; }
        for (size_t i = 0; i < old_it->second.size(); ++i) {
          if (!commandglows::desktop_control::SameKey(old_it->second[i], new_it->second[i])) {
            unchanged = false; break;
          }
        }
      }
      if (unchanged) {
        close_app_sequence_ = std::move(candidate_close_sequence);
        pending_close_app_target_ = nullptr;
        pending_close_app_index_ = 0;
        return true;
      }
      *reason = "Fermez la grille avant de modifier les touches.";
      error_code_ = "BINDINGS_ACTIVE";
      return false;
    }
    const UINT next_modifiers = static_cast<UINT>(*mods) | MOD_NOREPEAT;
    const bool same_activation = activation_.virtual_key == next_vk &&
                                 activation_.modifiers == static_cast<UINT>(*mods);
    const int candidate_id = hotkey_id_ == kActivationHotkeyId
                                 ? kCandidateHotkeyId : kActivationHotkeyId;
    if (enabled_ && !same_activation &&
        !RegisterHotKey(owner_, candidate_id, next_modifiers, next_vk)) {
      *reason = "Ce raccourci d’activation est déjà utilisé.";
      error_code_ = "HOTKEY_UNAVAILABLE";
      return false;
    }
    if (enabled_ && !same_activation) {
      if (hotkey_registered_) UnregisterHotKey(owner_, hotkey_id_);
      activation_ = ActivationBinding{next_vk, static_cast<UINT>(*mods)};
      hotkey_id_ = candidate_id;
      hotkey_registered_ = true;
    } else {
      activation_ = ActivationBinding{next_vk, static_cast<UINT>(*mods)};
    }
    bindings_ = std::move(candidate);
    close_app_sequence_ = std::move(candidate_close_sequence);
    pending_close_app_target_ = nullptr;
    pending_close_app_index_ = 0;
    return true;
  }

  static bool IsModifierVirtualKey(UINT vk) {
    return vk == VK_SHIFT || vk == VK_CONTROL || vk == VK_MENU ||
           vk == VK_LSHIFT || vk == VK_RSHIFT || vk == VK_LCONTROL ||
           vk == VK_RCONTROL || vk == VK_LMENU || vk == VK_RMENU ||
           vk == VK_LWIN || vk == VK_RWIN;
  }

  HKL ForegroundKeyboardLayout() const {
    const HWND foreground = GetForegroundWindow();
    DWORD thread = foreground == nullptr ? 0 : GetWindowThreadProcessId(foreground, nullptr);
    HKL layout = thread == 0 ? nullptr : GetKeyboardLayout(thread);
    return layout == nullptr ? GetKeyboardLayout(0) : layout;
  }

  static std::wstring KeyLabel(const KeyBinding& key, HKL layout) {
    const UINT scan = key.scan_code | (key.extended ? 0xE000 : 0);
    const UINT vk = MapVirtualKeyExW(scan, MAPVK_VSC_TO_VK_EX, layout);
    if (vk == VK_SPACE) return L"Espace";
    if (vk == VK_ESCAPE) return L"Échap";
    BYTE state[256]{};
    if ((key.modifiers & MOD_SHIFT) != 0) state[VK_SHIFT] = 0x80;
    if ((key.modifiers & MOD_CONTROL) != 0) state[VK_CONTROL] = 0x80;
    if ((key.modifiers & MOD_ALT) != 0) state[VK_MENU] = 0x80;
    WCHAR chars[8]{};
    const int count = vk == 0 ? 0 : ToUnicodeEx(
        vk, key.scan_code, state, chars, static_cast<int>(std::size(chars)),
        0, layout);
    if (count > 0 && chars[0] >= 0x20) {
      std::wstring result(chars, chars + count);
      for (wchar_t& ch : result) {
        if (ch >= L'a' && ch <= L'z') ch -= L'a' - L'A';
      }
      return result;
    }
    wchar_t name[64]{};
    const LONG parameter = static_cast<LONG>(key.scan_code << 16) |
                           (key.extended ? (1L << 24) : 0);
    const int length = GetKeyNameTextW(parameter, name,
                                       static_cast<int>(std::size(name)));
    return length > 0 ? std::wstring(name, name + length) : L"?";
  }

  static std::string Utf8(const std::wstring& value) {
    if (value.empty()) return {};
    const int size = WideCharToMultiByte(CP_UTF8, 0, value.data(),
                                         static_cast<int>(value.size()),
                                         nullptr, 0, nullptr, nullptr);
    if (size <= 0) return {};
    std::string result(static_cast<size_t>(size), '\0');
    WideCharToMultiByte(CP_UTF8, 0, value.data(),
                        static_cast<int>(value.size()), result.data(), size,
                        nullptr, nullptr);
    return result;
  }

  void SetEnabled(bool enabled) {
    error_code_.clear();
    if (enabled) {
      if (!hotkey_registered_) {
        hotkey_registered_ = RegisterHotKey(
            owner_, hotkey_id_, activation_.modifiers | MOD_NOREPEAT,
            activation_.virtual_key) != FALSE;
      }
      if (!hotkey_registered_) {
        enabled_ = false;
        error_code_ = "HOTKEY_UNAVAILABLE";
        return;
      }
      enabled_ = true;
      return;
    }
    Cancel();
    if (hotkey_registered_) {
      UnregisterHotKey(owner_, hotkey_id_);
      hotkey_registered_ = false;
    }
    enabled_ = false;
  }

  std::optional<RECT> ForegroundBounds(HWND foreground) const {
    if (foreground == nullptr || foreground == GetShellWindow() ||
        foreground == GetDesktopWindow() ||
        !IsWindowVisible(foreground) || IsIconic(foreground)) {
      return std::nullopt;
    }
    BOOL cloaked = FALSE;
    if (SUCCEEDED(DwmGetWindowAttribute(foreground, DWMWA_CLOAKED,
                                        &cloaked, sizeof(cloaked))) && cloaked) {
      return std::nullopt;
    }
    RECT bounds{};
    if (FAILED(DwmGetWindowAttribute(foreground,
                                     DWMWA_EXTENDED_FRAME_BOUNDS,
                                     &bounds, sizeof(bounds))) &&
        !GetWindowRect(foreground, &bounds)) {
      return std::nullopt;
    }
    if (bounds.right - bounds.left < 3 ||
        bounds.bottom - bounds.top < 3) {
      return std::nullopt;
    }
    return bounds;
  }

  RECT BaseRegionForMonitor(size_t index, GridScope requested) {
    const RECT& monitor = monitors_[index].bounds;
    if (requested == GridScope::window && window_bounds_) {
      if (const auto clipped = IntersectNonEmpty(*window_bounds_, monitor)) {
        active_scope_ = GridScope::window;
        return *clipped;
      }
    }
    active_scope_ = GridScope::monitor;
    return monitor;
  }

  void ResetRegion(GridScope requested) {
    region_ = BaseRegionForMonitor(monitor_index_, requested);
    history_.clear();
    history_states_.clear();
    coordinate_view_ = false;
  }

  void Activate() {
    error_code_.clear();
    if (teardown_pending_) {
      error_code_ = "HOOK_UNAVAILABLE";
      return;
    }
    if (active_) {
      Cancel();
      return;
    }
    if (!overlay_class_registered_) {
      error_code_ = "OVERLAY_UNAVAILABLE";
      return;
    }
    POINT cursor{};
    if (!GetCursorPos(&cursor)) {
      error_code_ = "OVERLAY_UNAVAILABLE";
      return;
    }
    monitors_.clear();
    EnumDisplayMonitors(nullptr, nullptr, EnumerateMonitor,
                        reinterpret_cast<LPARAM>(&monitors_));
    if (monitors_.empty()) {
      error_code_ = "OVERLAY_UNAVAILABLE";
      return;
    }
    monitor_index_ = 0;
    for (size_t i = 0; i < monitors_.size(); ++i) {
      const RECT& bounds = monitors_[i].bounds;
      if (cursor.x >= bounds.left && cursor.x < bounds.right &&
          cursor.y >= bounds.top && cursor.y < bounds.bottom) {
        monitor_index_ = i;
        break;
      }
    }
    HWND foreground = GetForegroundWindow();
    window_bounds_ = ForegroundBounds(foreground);
    if (preferred_scope_ == GridScope::window && window_bounds_) {
      int64_t largest_area = 0;
      for (size_t i = 0; i < monitors_.size(); ++i) {
        if (const auto clipped =
                IntersectNonEmpty(*window_bounds_, monitors_[i].bounds)) {
          const int64_t area =
              static_cast<int64_t>(clipped->right - clipped->left) *
              (clipped->bottom - clipped->top);
          if (area > largest_area) {
            largest_area = area;
            monitor_index_ = i;
          }
        }
      }
    }
    const DWORD target_thread = GetWindowThreadProcessId(foreground, nullptr);
    keyboard_layout_ = GetKeyboardLayout(target_thread);
    if (keyboard_layout_ == nullptr) {
      keyboard_layout_ = GetKeyboardLayout(0);
    }
    session_scope_ = preferred_scope_;
    ResetRegion(session_scope_);
    swallowed_keys_.clear();
    active_ = true;
    active_hook_host_ = this;
    keyboard_hook_ = SetWindowsHookExW(WH_KEYBOARD_LL, LowLevelKeyboardProc,
                                       GetModuleHandleW(nullptr), 0);
    if (keyboard_hook_ == nullptr) {
      active_ = false;
      active_hook_host_ = nullptr;
      error_code_ = "HOOK_UNAVAILABLE";
      return;
    }
    if (!CreateOverlay()) {
      error_code_ = "OVERLAY_UNAVAILABLE";
      Cancel();
      return;
    }
  }

  void Cancel() {
    ReleaseHeldButtons();
    active_ = false;
    teardown_pending_ = keyboard_hook_ != nullptr;
    if (swallowed_keys_.empty()) {
      FinishHookTeardown();
    } else {
      SetTimer(owner_, kHookTeardownTimerId, 3000, nullptr);
    }
    if (overlay_ != nullptr && IsWindow(overlay_)) {
      DestroyWindow(overlay_);
    }
    overlay_ = nullptr;
    history_.clear();
  }

  bool CreateOverlay() {
    const RECT& bounds = monitors_[monitor_index_].bounds;
    overlay_ = CreateWindowExW(
        WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE,
        kOverlayClassName, L"CommandGlows desktop control", WS_POPUP,
        bounds.left, bounds.top, bounds.right - bounds.left,
        bounds.bottom - bounds.top, nullptr, nullptr, GetModuleHandleW(nullptr),
        this);
    if (overlay_ == nullptr) {
      return false;
    }
    if (!SetLayeredWindowAttributes(overlay_, kTransparentColor, 0,
                                    LWA_COLORKEY)) {
      DestroyWindow(overlay_);
      overlay_ = nullptr;
      return false;
    }
    if (!SetWindowPos(overlay_, HWND_TOPMOST, bounds.left, bounds.top,
                      bounds.right - bounds.left, bounds.bottom - bounds.top,
                      SWP_NOACTIVATE | SWP_SHOWWINDOW)) {
      DestroyWindow(overlay_);
      overlay_ = nullptr;
      return false;
    }
    ShowWindow(overlay_, SW_SHOWNOACTIVATE);
    InvalidateRect(overlay_, nullptr, TRUE);
    return true;
  }

  void Paint(HWND hwnd) {
    PAINTSTRUCT paint{};
    HDC dc = BeginPaint(hwnd, &paint);
    RECT client{};
    GetClientRect(hwnd, &client);
    HBRUSH clear = CreateSolidBrush(kTransparentColor);
    FillRect(dc, &client, clear);
    DeleteObject(clear);

    const LONG origin_x = monitors_[monitor_index_].bounds.left;
    const LONG origin_y = monitors_[monitor_index_].bounds.top;
    RECT local{region_.left - origin_x, region_.top - origin_y,
               region_.right - origin_x, region_.bottom - origin_y};
    const int dimension = coordinate_view_ ? 5 : 3;
    const int cell_count = dimension * dimension;
    HPEN grid_pen = CreatePen(PS_SOLID, 2, kGridColor);
    HGDIOBJ old_pen = SelectObject(dc, grid_pen);
    // Keep the target application readable through the click-through overlay.
    HGDIOBJ old_brush = SelectObject(dc, GetStockObject(NULL_BRUSH));
    Rectangle(dc, local.left, local.top, local.right, local.bottom);
    for (int i = 1; i < dimension; ++i) {
      const LONG x = local.left + (local.right - local.left) * i / dimension;
      const LONG y = local.top + (local.bottom - local.top) * i / dimension;
      MoveToEx(dc, x, local.top, nullptr);
      LineTo(dc, x, local.bottom);
      MoveToEx(dc, local.left, y, nullptr);
      LineTo(dc, local.right, y);
    }
    SelectObject(dc, old_brush);

    POINT center{};
    if (GetCursorPos(&center)) {
      center.x -= origin_x;
      center.y -= origin_y;
    } else {
      center = CenterOf(local);
    }
    const int radius = std::max(4, static_cast<int>(8.0 * GetDpiForWindow(hwnd) / 96.0));
    HBRUSH center_brush = CreateSolidBrush(kRegionColor);
    HGDIOBJ old_center_brush = SelectObject(dc, center_brush);
    Ellipse(dc, center.x - radius, center.y - radius,
            center.x + radius + 1, center.y + radius + 1);
    SelectObject(dc, old_center_brush);
    DeleteObject(center_brush);

    SetBkMode(dc, TRANSPARENT);
    SetTextColor(dc, kGridTextColor);
    for (int i = 0; i < cell_count; ++i) {
      const auto cell = DivideCell(local, dimension, dimension, i);
      if (!cell || cell->right - cell->left < 28 ||
          cell->bottom - cell->top < 20) {
        continue;
      }
      std::wstring label = coordinate_view_
                               ? KeyLegend(kCoordinateKeys[i], keyboard_layout_)
                               : KeyLegend(kGridKeys[i], keyboard_layout_);
      const LONG min_cell_size = std::min(cell->right - cell->left,
                                          cell->bottom - cell->top);
      const LONG marker = std::min<LONG>(
          std::max<LONG>(12, 24 * GetDpiForWindow(hwnd) / 96),
          min_cell_size - 4);
      RECT label_rect = *cell;
      label_rect.left += 8;
      label_rect.top += 8;
      label_rect.right = label_rect.left + marker;
      label_rect.bottom = label_rect.top + marker;
      const int font_height = std::max(
          8, MulDiv(static_cast<int>(marker * 0.72), 72,
                    static_cast<int>(GetDpiForWindow(hwnd))));
      HFONT font = CreateFontW(-font_height, 0, 0, 0, FW_BOLD, FALSE, FALSE,
                               FALSE, DEFAULT_CHARSET, OUT_DEFAULT_PRECIS,
                               CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
                               DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
      HGDIOBJ old_font = SelectObject(dc, font);
      HBRUSH label_bg = CreateSolidBrush(kGridColor);
      FillRect(dc, &label_rect, label_bg);
      DeleteObject(label_bg);
      DrawTextW(dc, label.c_str(), static_cast<int>(label.size()), &label_rect,
                DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
      SelectObject(dc, old_font);
      DeleteObject(font);
    }

    // Keep the complete physical-key map readable after the recursive cells
    // become smaller than a keycap. The map always preserves the same spatial
    // row and column relationship as the active grid.
    const LONG key_size = std::clamp<LONG>(28 * GetDpiForWindow(hwnd) / 96,
                                           24, 40);
    const LONG panel_padding = 8;
    const LONG panel_width = std::max<LONG>(
        dimension * key_size + panel_padding * 2,
        380 * GetDpiForWindow(hwnd) / 96);
    const LONG panel_height = dimension * key_size + panel_padding * 2 + 20;
    RECT panel{16, 64, 16 + panel_width, 64 + panel_height};
    HBRUSH panel_brush = CreateSolidBrush(RGB(22, 27, 34));
    FillRect(dc, &panel, panel_brush);
    DeleteObject(panel_brush);
    SetTextColor(dc, RGB(255, 255, 255));
    HFONT map_font = CreateFontW(-MulDiv(13, static_cast<int>(GetDpiForWindow(hwnd)), 72),
                                 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE,
                                 DEFAULT_CHARSET, OUT_DEFAULT_PRECIS,
                                 CLIP_DEFAULT_PRECIS, CLEARTYPE_QUALITY,
                                 DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");
    HGDIOBJ old_map_font = SelectObject(dc, map_font);
    RECT panel_title{panel.left + panel_padding, panel.top + 2,
                     panel.right - panel_padding, panel.top + 19};
    wchar_t title[128]{};
    swprintf_s(title, std::size(title),
               L"%s | %s | MONITEUR %zu/%zu",
               coordinate_view_ ? L"COORDONNEES 5 x 5" : L"GRILLE 3 x 3",
               active_scope_ == GridScope::window ? L"FENETRE" : L"ECRAN",
               monitor_index_ + 1, monitors_.size());
    DrawTextW(dc, title, -1, &panel_title,
              DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    for (int i = 0; i < cell_count; ++i) {
      const auto& key = coordinate_view_ ? kCoordinateKeys[i] : kGridKeys[i];
      std::wstring label = KeyLegend(key, keyboard_layout_);
      const LONG x = panel.left + panel_padding + (i % dimension) * key_size;
      const LONG y = panel.top + 20 + (i / dimension) * key_size;
      RECT key_rect{x + 2, y + 2, x + key_size - 2, y + key_size - 2};
      HBRUSH key_brush = CreateSolidBrush(kGridColor);
      FillRect(dc, &key_rect, key_brush);
      DeleteObject(key_brush);
      SetTextColor(dc, kGridTextColor);
      DrawTextW(dc, label.c_str(), static_cast<int>(label.size()), &key_rect,
                DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
      SetTextColor(dc, RGB(255, 255, 255));
    }
    SelectObject(dc, old_map_font);
    DeleteObject(map_font);
    SelectObject(dc, old_pen);
    DeleteObject(grid_pen);

    SetTextColor(dc, RGB(255, 255, 255));
    RECT hint{12, 12, std::max<LONG>(13, client.right - 12), 78};
    HBRUSH hint_bg = CreateSolidBrush(RGB(22, 27, 34));
    FillRect(dc, &hint, hint_bg);
    DeleteObject(hint_bg);
    const std::wstring text = DynamicGuide(coordinate_view_);
    DrawTextW(dc, text.c_str(), static_cast<int>(text.size()), &hint,
              DT_LEFT | DT_TOP | DT_WORDBREAK | DT_NOPREFIX);
    if (error_code_ == "INPUT_UNAVAILABLE") {
      RECT error{16, std::max<LONG>(16, client.bottom - 64),
                 std::min<LONG>(client.right - 16, 580),
                 std::max<LONG>(48, client.bottom - 20)};
      HBRUSH error_bg = CreateSolidBrush(kErrorColor);
      FillRect(dc, &error, error_bg);
      DeleteObject(error_bg);
      DrawTextW(dc,
                L"Action non envoy\u00e9e. V\u00e9rifiez la cible ou fermez la grille.",
                -1, &error, DT_CENTER | DT_VCENTER | DT_SINGLELINE |
                                DT_END_ELLIPSIS | DT_NOPREFIX);
    }
    EndPaint(hwnd, &paint);
  }

  std::wstring BindingLabel(const char* id) const {
    const auto found = bindings_.find(id);
    if (found == bindings_.end() || found->second.empty()) return L"-";
    std::wstring result;
    for (const auto& key : found->second) {
      if (!result.empty()) result += L"/";
      result += KeyLabel(key, active_ ? keyboard_layout_ : ForegroundKeyboardLayout());
    }
    return result;
  }

  std::wstring DynamicGuide(bool coordinate) const {
    std::wstring activation = L"";
    if ((activation_.modifiers & MOD_CONTROL) != 0) activation += L"Ctrl+";
    if ((activation_.modifiers & MOD_ALT) != 0) activation += L"Alt+";
    if ((activation_.modifiers & MOD_SHIFT) != 0) activation += L"Shift+";
    if ((activation_.modifiers & MOD_WIN) != 0) activation += L"Win+";
    wchar_t activation_name[64]{};
    const UINT activation_scan = MapVirtualKeyExW(
        activation_.virtual_key, MAPVK_VK_TO_VSC_EX, keyboard_layout_);
    const LONG activation_key_param = static_cast<LONG>(activation_scan << 16) |
                                      ((activation_scan & 0xFF00) == 0xE000
                                           ? (1L << 24) : 0);
    const int activation_name_length = GetKeyNameTextW(
        activation_key_param, activation_name,
        static_cast<int>(std::size(activation_name)));
    if (activation_name_length > 0) {
      activation.append(activation_name, activation_name + activation_name_length);
    } else {
      activation += L"?";
    }
    const std::wstring click = BindingLabel("leftClick");
    const std::wstring more =
        L"clic " + click + L"  clic droit " + BindingLabel("rightClick") +
        L"  milieu " + BindingLabel("middleClick") +
        L"  glisser " + BindingLabel("dragStart") + L"/" + BindingLabel("dragRelease") +
        L"  molette " + BindingLabel("wheelUp") + L"/" + BindingLabel("wheelDown") +
        L"  retour " + BindingLabel("back") + L"  reset " + BindingLabel("reset") +
        L"  coordonnees " + BindingLabel("coordinateView") +
        L"  fenetre/ecran " + BindingLabel("toggleScope") +
        L"  ecran precedent/suivant " + BindingLabel("previousMonitor") + L"/" +
        BindingLabel("nextMonitor") + L"  deplacer "+ BindingLabel("nudgeLeft") + L"/" +
        BindingLabel("nudgeRight") + L"/" + BindingLabel("nudgeUp") + L"/" +
        BindingLabel("nudgeDown") + L"  fermer " + BindingLabel("close") +
        L" (Echap toujours actif)";
    return std::wstring(coordinate ? L"COORDONNEES 5x5 | "
                                    : L"GRILLE RECURSIVE | ") +
           L"Activer/fermer " + activation + L" | " + more;
  }

  bool IsAssignedKey(UINT, UINT scan_code, bool extended, UINT modifiers) const {
    if (scan_code == 0x01 && !extended) return true;  // Emergency close.
    const KeyBinding pressed{scan_code, extended, modifiers};
    for (const auto& [_, keys] : bindings_) {
      for (const auto& key : keys) {
        if (commandglows::desktop_control::SameKey(pressed, key)) return true;
      }
    }
    if (extended || modifiers != 0) return false;
    if (coordinate_view_) {
      for (const auto& key : kCoordinateKeys) {
        if (key.scan_code == scan_code && key.extended == extended) {
          return true;
        }
      }
    } else {
      for (const auto& key : kGridKeys) {
        if (key.scan_code == scan_code && key.extended == extended) {
          return true;
        }
      }
    }
    return false;
  }

  InputAction ActionFor(UINT scan_code, bool extended, UINT modifiers) const {
    if (scan_code == 0x01 && !extended) return InputAction::escape;
    const KeyBinding pressed{scan_code, extended, modifiers};
    const std::pair<const char*, InputAction> actions[] = {
        {"leftClick", InputAction::left_click}, {"rightClick", InputAction::right_click},
        {"middleClick", InputAction::middle_click}, {"dragStart", InputAction::drag_start},
        {"dragRelease", InputAction::drag_release}, {"wheelUp", InputAction::wheel_up},
        {"wheelDown", InputAction::wheel_down}, {"back", InputAction::back},
        {"reset", InputAction::reset}, {"coordinateView", InputAction::coordinate_view},
        {"toggleScope", InputAction::toggle_scope},
        {"previousMonitor", InputAction::previous_monitor},
        {"nextMonitor", InputAction::next_monitor}, {"nudgeLeft", InputAction::nudge_left},
        {"nudgeRight", InputAction::nudge_right}, {"nudgeUp", InputAction::nudge_up},
        {"nudgeDown", InputAction::nudge_down}, {"close", InputAction::escape}};
    for (const auto& [id, action] : actions) {
      const auto found = bindings_.find(id);
      if (found != bindings_.end()) {
        for (const auto& key : found->second) {
          if (commandglows::desktop_control::SameKey(pressed, key)) return action;
        }
      }
    }
    return InputAction::none;
  }

  void ProcessKey(UINT virtual_key, UINT packed_scan) {
    if (!active_) {
      return;
    }
    const UINT scan_code = packed_scan & 0xFF;
    const bool extended = (packed_scan & 0x100) != 0;
    UINT modifiers = 0;
    if ((packed_scan & 0x200) != 0) modifiers |= MOD_SHIFT;
    if ((packed_scan & 0x400) != 0) modifiers |= MOD_CONTROL;
    if ((packed_scan & 0x800) != 0) modifiers |= MOD_ALT;
    if ((packed_scan & 0x1000) != 0) modifiers |= MOD_WIN;
    const InputAction action = ActionFor(scan_code, extended, modifiers);
    if (action == InputAction::escape) {
      Cancel();
      return;
    }
    if (action == InputAction::back) {
      if (!history_.empty()) {
        region_ = history_.back();
        history_.pop_back();
        coordinate_view_ = history_states_.back().coordinate_view;
        history_states_.pop_back();
        SetCursorInRegion();
      }
      Redraw();
      return;
    }
    if (action == InputAction::reset) {
      history_.clear();
      history_states_.clear();
      region_ = BaseRegionForMonitor(monitor_index_, session_scope_);
      coordinate_view_ = false;
      SetCursorInRegion();
      Redraw();
      return;
    }
    if (action == InputAction::toggle_scope) {
      session_scope_ = session_scope_ == GridScope::window
                           ? GridScope::monitor : GridScope::window;
      ResetRegion(session_scope_);
      SetCursorInRegion();
      Redraw();
      return;
    }
    if (action == InputAction::coordinate_view) {
      coordinate_view_ = !coordinate_view_;
      Redraw();
      return;
    }
    if (action == InputAction::next_monitor ||
        action == InputAction::previous_monitor) {
      MoveToMonitor(action == InputAction::next_monitor);
      return;
    }
    if (action != InputAction::none) {
      HandleAction(action);
      return;
    }
    const int dimension = coordinate_view_ ? 5 : 3;
    const size_t count = coordinate_view_ ? kCoordinateKeys.size()
                                          : kGridKeys.size();
    const PhysicalKey* keys = coordinate_view_ ? kCoordinateKeys.data()
                                                : kGridKeys.data();
    for (size_t index = 0; index < count; ++index) {
      if (keys[index].scan_code == scan_code && keys[index].extended == extended) {
        const auto selected = DivideCell(region_, dimension, dimension,
                                         static_cast<int>(index));
        if (!selected) {
          Redraw();
          return;
        }
        history_.push_back(region_);
        history_states_.push_back(SelectionState{region_, coordinate_view_});
        region_ = *selected;
        coordinate_view_ = false;
        SetCursorInRegion();
        Redraw();
        return;
      }
    }
  }

  void HandleAction(InputAction action) {
    if (action == InputAction::nudge_left || action == InputAction::nudge_right ||
        action == InputAction::nudge_up || action == InputAction::nudge_down) {
      POINT cursor{};
      if (GetCursorPos(&cursor)) {
        constexpr int step = 24;
        cursor.x += action == InputAction::nudge_left ? -step
                    : action == InputAction::nudge_right ? step : 0;
        cursor.y += action == InputAction::nudge_up ? -step
                    : action == InputAction::nudge_down ? step : 0;
        const RECT bounds = BaseRegionForMonitor(monitor_index_, active_scope_);
        cursor.x = std::clamp<LONG>(cursor.x, bounds.left,
                                    bounds.right - 1);
        cursor.y = std::clamp<LONG>(cursor.y, bounds.top,
                                    bounds.bottom - 1);
        if (!MoveCursorTo(cursor)) {
          error_code_ = "INPUT_UNAVAILABLE";
        } else {
          error_code_.clear();
        }
        Redraw();
      }
      return;
    }
    if (action == InputAction::drag_start) {
      if (held_button_up_ == 0) {
        INPUT input{};
        input.type = INPUT_MOUSE;
        input.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
        if (SendInput(1, &input, sizeof(input)) == 1) {
          held_button_up_ = MOUSEEVENTF_LEFTUP;
          error_code_.clear();
        } else {
          error_code_ = "INPUT_UNAVAILABLE";
          Redraw();
        }
      }
      return;
    }
    if (action == InputAction::drag_release) {
      ReleaseHeldButtons();
      if (held_button_up_ == 0) {
        error_code_.clear();
      }
      Redraw();
      return;
    }
    if (action == InputAction::wheel_up || action == InputAction::wheel_down) {
      INPUT input{};
      input.type = INPUT_MOUSE;
      input.mi.dwFlags = MOUSEEVENTF_WHEEL;
      input.mi.mouseData = action == InputAction::wheel_up
                               ? kDefaultWheelDelta
                               : static_cast<DWORD>(-static_cast<int>(kDefaultWheelDelta));
      if (SendInput(1, &input, sizeof(input)) != 1) {
        error_code_ = "INPUT_UNAVAILABLE";
        Redraw();
      } else {
        error_code_.clear();
        Redraw();
      }
      return;
    }
    DWORD down = 0;
    DWORD up = 0;
    switch (action) {
      case InputAction::left_click:
        down = MOUSEEVENTF_LEFTDOWN; up = MOUSEEVENTF_LEFTUP; break;
      case InputAction::right_click:
        down = MOUSEEVENTF_RIGHTDOWN; up = MOUSEEVENTF_RIGHTUP; break;
      case InputAction::middle_click:
        down = MOUSEEVENTF_MIDDLEDOWN; up = MOUSEEVENTF_MIDDLEUP; break;
      default:
        return;
    }
    INPUT input{};
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = down;
    if (SendInput(1, &input, sizeof(INPUT)) != 1) {
      error_code_ = "INPUT_UNAVAILABLE";
      Redraw();
      return;
    }
    error_code_.clear();
    held_button_up_ = up;
    input.mi.dwFlags = up;
    if (SendInput(1, &input, sizeof(INPUT)) == 1) {
      held_button_up_ = 0;
    } else {
      error_code_ = "INPUT_UNAVAILABLE";
    }
    if (error_code_ == "INPUT_UNAVAILABLE") {
      ReleaseHeldButtons();
      Redraw();
    } else {
      Cancel();
    }
  }

  void ReleaseHeldButtons() {
    if (held_button_up_ == 0) {
      return;
    }
    for (int attempt = 0; attempt < 3 && held_button_up_ != 0; ++attempt) {
      INPUT input{};
      input.type = INPUT_MOUSE;
      input.mi.dwFlags = held_button_up_;
      if (SendInput(1, &input, sizeof(input)) == 1) {
        held_button_up_ = 0;
      } else {
        error_code_ = "INPUT_UNAVAILABLE";
      }
    }
  }

  void FinishHookTeardown() {
    if (!swallowed_keys_.empty()) {
      return;
    }
    teardown_pending_ = false;
    KillTimer(owner_, kHookTeardownTimerId);
    if (keyboard_hook_ != nullptr) {
      UnhookWindowsHookEx(keyboard_hook_);
      keyboard_hook_ = nullptr;
    }
    if (active_hook_host_ == this) {
      active_hook_host_ = nullptr;
    }
  }

  void ForceHookTeardown() {
    KillTimer(owner_, kHookTeardownTimerId);
    if (keyboard_hook_ != nullptr) {
      UnhookWindowsHookEx(keyboard_hook_);
      keyboard_hook_ = nullptr;
    }
    swallowed_keys_.clear();
    teardown_pending_ = false;
    if (active_hook_host_ == this) {
      active_hook_host_ = nullptr;
    }
  }

  void MoveToMonitor(bool forward) {
    if (monitors_.size() <= 1) {
      return;
    }
    if (forward) {
      monitor_index_ = (monitor_index_ + 1) % monitors_.size();
    } else {
      monitor_index_ = monitor_index_ == 0 ? monitors_.size() - 1
                                          : monitor_index_ - 1;
    }
    ResetRegion(session_scope_);
    if (overlay_ != nullptr && IsWindow(overlay_)) {
      DestroyWindow(overlay_);
    }
    overlay_ = nullptr;
    if (!CreateOverlay()) {
      error_code_ = "OVERLAY_UNAVAILABLE";
      Cancel();
      return;
    }
    SetCursorInRegion();
  }

  void SetCursorInRegion() {
    POINT center = CenterOf(region_);
    const RECT& monitor = monitors_[monitor_index_].bounds;
    center.x = std::clamp<LONG>(center.x, monitor.left, monitor.right - 1);
    center.y = std::clamp<LONG>(center.y, monitor.top, monitor.bottom - 1);
    if (!MoveCursorTo(center)) {
      error_code_ = "INPUT_UNAVAILABLE";
      Redraw();
    } else {
      error_code_.clear();
    }
  }

  bool MoveCursorTo(const POINT& target) {
    if (held_button_up_ == 0) {
      return SetCursorPos(target.x, target.y) != FALSE;
    }
    POINT start{};
    if (!GetCursorPos(&start)) {
      return false;
    }
    const int64_t dx = static_cast<int64_t>(target.x) - start.x;
    const int64_t dy = static_cast<int64_t>(target.y) - start.y;
    const int steps = std::clamp(
        static_cast<int>((std::max(std::abs(dx), std::abs(dy)) + 23) / 24),
        1, 48);
    const int virtual_left = GetSystemMetrics(SM_XVIRTUALSCREEN);
    const int virtual_top = GetSystemMetrics(SM_YVIRTUALSCREEN);
    const int virtual_width = std::max(1, GetSystemMetrics(SM_CXVIRTUALSCREEN));
    const int virtual_height = std::max(1, GetSystemMetrics(SM_CYVIRTUALSCREEN));
    std::vector<INPUT> movement;
    movement.reserve(static_cast<size_t>(steps));
    for (int step = 1; step <= steps; ++step) {
      const int x = start.x + static_cast<int>(dx * step / steps);
      const int y = start.y + static_cast<int>(dy * step / steps);
      INPUT input{};
      input.type = INPUT_MOUSE;
      input.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE |
                         MOUSEEVENTF_VIRTUALDESK;
      input.mi.dx = static_cast<LONG>(
          (static_cast<int64_t>(x - virtual_left) * 65535) /
          std::max(1, virtual_width - 1));
      input.mi.dy = static_cast<LONG>(
          (static_cast<int64_t>(y - virtual_top) * 65535) /
          std::max(1, virtual_height - 1));
      movement.push_back(input);
    }
    return SendInput(static_cast<UINT>(movement.size()), movement.data(),
                     sizeof(INPUT)) == movement.size();
  }

  void Redraw() {
    if (overlay_ != nullptr && IsWindow(overlay_)) {
      InvalidateRect(overlay_, nullptr, TRUE);
      UpdateWindow(overlay_);
    }
  }

  HWND owner_ = nullptr;
  flutter::MethodChannel<Value> channel_;
  bool overlay_class_registered_ = false;
  bool enabled_ = false;
  bool active_ = false;
  bool hotkey_registered_ = false;
  bool close_app_hotkey_listening_ = true;
  int hotkey_id_ = kActivationHotkeyId;
  ActivationBinding activation_{};
  BindingMap bindings_ = DefaultBindings();
  std::vector<KeyBinding> close_app_sequence_{{0x01, false, 0},
                                               {0x01, false, 0}};
  std::unordered_set<uint32_t> close_pressed_keys_;
  HWND pending_close_app_target_ = nullptr;
  size_t pending_close_app_index_ = 0;
  ULONGLONG pending_close_app_at_ = 0;
  DWORD held_button_up_ = 0;
  bool coordinate_view_ = false;
  GridScope preferred_scope_ = GridScope::monitor;
  GridScope session_scope_ = GridScope::monitor;
  GridScope active_scope_ = GridScope::monitor;
  std::optional<RECT> window_bounds_;
  std::string error_code_;
  std::string validation_error_;
  HHOOK keyboard_hook_ = nullptr;
  HHOOK close_keyboard_hook_ = nullptr;
  HWND overlay_ = nullptr;
  HKL keyboard_layout_ = nullptr;
  size_t monitor_index_ = 0;
  RECT region_{};
  std::vector<RECT> history_;
  std::vector<SelectionState> history_states_;
  std::vector<Monitor> monitors_;
  std::unordered_set<uint32_t> swallowed_keys_;
  bool teardown_pending_ = false;
  static inline Impl* active_hook_host_ = nullptr;
  static inline Impl* close_hook_host_ = nullptr;
};

WindowsDesktopControlHost::WindowsDesktopControlHost(
    HWND owner, flutter::BinaryMessenger* messenger)
    : impl_(std::make_unique<Impl>(owner, messenger)) {}

WindowsDesktopControlHost::~WindowsDesktopControlHost() = default;

bool WindowsDesktopControlHost::HandleWindowMessage(UINT message,
                                                     WPARAM wparam,
                                                     LPARAM lparam) {
  return impl_->HandleWindowMessage(message, wparam, lparam);
}
