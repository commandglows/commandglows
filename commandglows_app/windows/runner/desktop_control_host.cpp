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
#include <unordered_set>
#include <utility>
#include <vector>

#include <flutter/encodable_value.h>
#include <flutter/method_channel.h>
#include <flutter/standard_method_codec.h>

#include "desktop_control_geometry.h"
#include "desktop_control_keymap.h"

namespace {

constexpr char kChannelName[] = "commandglows_app/desktop_control";
constexpr wchar_t kOverlayClassName[] = L"COMMANDGLOWS_DESKTOP_CONTROL";
constexpr int kActivationHotkeyId = 0x4347;
constexpr UINT_PTR kHookTeardownTimerId = 0x4348;
constexpr UINT kHookKeyMessage = WM_APP + 0x4C1;
constexpr UINT kHookCleanupMessage = WM_APP + 0x4C2;
constexpr COLORREF kTransparentColor = RGB(1, 2, 3);
constexpr COLORREF kGridColor = RGB(255, 196, 32);
constexpr COLORREF kGridTextColor = RGB(18, 22, 28);
constexpr COLORREF kRegionColor = RGB(70, 190, 240);
constexpr COLORREF kErrorColor = RGB(122, 35, 35);
constexpr UINT kDefaultWheelDelta = WHEEL_DELTA;

using commandglows::desktop_control::CenterOf;
using commandglows::desktop_control::CaptureKeyDown;
using commandglows::desktop_control::DivideCell;
using commandglows::desktop_control::kCoordinateKeys;
using commandglows::desktop_control::kGridKeys;
using commandglows::desktop_control::KeyCaptureDecision;
using commandglows::desktop_control::KeyLegend;
using commandglows::desktop_control::PhysicalKey;
using commandglows::desktop_control::ReleaseKeyUp;

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
};

bool IsModifierDown() {
  constexpr std::array<int, 8> modifiers{{VK_CONTROL, VK_LCONTROL, VK_RCONTROL,
                                          VK_MENU, VK_LMENU, VK_RMENU,
                                          VK_LWIN, VK_RWIN}};
  for (int key : modifiers) {
    if ((GetAsyncKeyState(key) & 0x8000) != 0) {
      return true;
    }
  }
  return (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0;
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
  }

  ~Impl() {
    Cancel();
    ReleaseHeldButtons();
    ForceHookTeardown();
    SetEnabled(false);
    channel_.SetMethodCallHandler(nullptr);
    if (overlay_class_registered_) {
      UnregisterClassW(kOverlayClassName, GetModuleHandleW(nullptr));
    }
  }

  bool HandleWindowMessage(UINT message, WPARAM wparam, LPARAM lparam) {
    if (message == WM_HOTKEY && wparam == kActivationHotkeyId) {
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

    const bool assigned = host->active_ &&
                          host->IsAssignedKey(key->vkCode, scan_code, extended);
    const auto decision = CaptureKeyDown(host->swallowed_keys_, identity,
                                         host->active_, assigned,
                                         IsModifierDown());
    if (decision == KeyCaptureDecision::repeat) {
      return 1;
    }
    if (decision == KeyCaptureDecision::forward) {
      return CallNextHookEx(nullptr, code, wparam, lparam);
    }
    const LPARAM payload = static_cast<LPARAM>((scan_code & 0xFF) |
                                                (extended ? 0x100 : 0) |
                                                ((key->vkCode & 0xFF) << 16));
    if (!PostMessageW(host->owner_, kHookKeyMessage, key->vkCode, payload)) {
      ReleaseKeyUp(host->swallowed_keys_, identity);
      return CallNextHookEx(nullptr, code, wparam, lparam);
    }
    return 1;
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
    status[Value("errorCode")] = Value(error_code_);
    return Value(std::move(status));
  }

  void SetEnabled(bool enabled) {
    error_code_.clear();
    if (enabled) {
      if (!hotkey_registered_) {
        hotkey_registered_ = RegisterHotKey(
            owner_, kActivationHotkeyId,
            MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, 'G') != FALSE;
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
      UnregisterHotKey(owner_, kActivationHotkeyId);
      hotkey_registered_ = false;
    }
    enabled_ = false;
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
    const DWORD target_thread = GetWindowThreadProcessId(GetForegroundWindow(), nullptr);
    keyboard_layout_ = GetKeyboardLayout(target_thread);
    if (keyboard_layout_ == nullptr) {
      keyboard_layout_ = GetKeyboardLayout(0);
    }
    region_ = monitors_[monitor_index_].bounds;
    history_.clear();
    history_states_.clear();
    coordinate_view_ = false;
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
    const COLORREF previous_background = SetBkColor(dc, kTransparentColor);
    HBRUSH region_brush = CreateHatchBrush(HS_BDIAGONAL, kRegionColor);
    HGDIOBJ old_brush = SelectObject(dc, region_brush);
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
    DeleteObject(region_brush);
    SetBkColor(dc, previous_background);

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
    const Monitor& monitor = monitors_[monitor_index_];
    swprintf_s(title, std::size(title),
               L"%s | %s %zu/%zu | CLAVIER FIGE",
               coordinate_view_ ? L"COORDONNEES 5 x 5" : L"GRILLE 3 x 3",
               monitor.device_name.c_str(), monitor_index_ + 1,
               monitors_.size());
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
    RECT hint{12, 12, std::min<LONG>(client.right - 12, 920), 44};
    HBRUSH hint_bg = CreateSolidBrush(RGB(22, 27, 34));
    FillRect(dc, &hint, hint_bg);
    DeleteObject(hint_bg);
    const wchar_t* text = coordinate_view_
                                ? L"Tab: grille recursive   Espace: reset   Retour: precedent   Echap: fermer   PagePrec/PageSuiv: ecran"
                                : L"F1 clic gauche   F2 droit   F3 milieu   F4 glisser   F5 relacher   F6/F7 molette   Tab: coordonnees"
                                  L"   Espace: reset   Retour: precedent   Echap: fermer   PagePrec/PageSuiv: ecran";
    DrawTextW(dc, text, -1, &hint, DT_LEFT | DT_VCENTER | DT_SINGLELINE |
                                      DT_END_ELLIPSIS | DT_NOPREFIX);
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

  bool IsAssignedKey(UINT virtual_key, UINT scan_code, bool extended) const {
      if (virtual_key == VK_ESCAPE || virtual_key == VK_BACK ||
        virtual_key == VK_SPACE || virtual_key == VK_TAB ||
        virtual_key == VK_F1 || virtual_key == VK_F2 ||
        virtual_key == VK_F3 || virtual_key == VK_F4 ||
        virtual_key == VK_F5 || virtual_key == VK_F6 ||
        virtual_key == VK_F7 ||
        virtual_key == VK_LEFT || virtual_key == VK_RIGHT ||
        virtual_key == VK_UP || virtual_key == VK_DOWN ||
        virtual_key == VK_PRIOR || virtual_key == VK_NEXT) {
      return true;
    }
    if (extended) {
      return false;
    }
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

  InputAction ActionFor(UINT virtual_key) const {
    switch (virtual_key) {
      case VK_ESCAPE: return InputAction::escape;
      case VK_BACK: return InputAction::back;
      case VK_SPACE: return InputAction::reset;
      case VK_TAB: return InputAction::coordinate_view;
      case VK_F1: return InputAction::left_click;
      case VK_F2: return InputAction::right_click;
      case VK_F3: return InputAction::middle_click;
      case VK_F4: return InputAction::drag_start;
      case VK_F5: return InputAction::drag_release;
      case VK_F6: return InputAction::wheel_up;
      case VK_F7: return InputAction::wheel_down;
      case VK_PRIOR: return InputAction::previous_monitor;
      case VK_NEXT: return InputAction::next_monitor;
      case VK_LEFT: return InputAction::nudge_left;
      case VK_RIGHT: return InputAction::nudge_right;
      case VK_UP: return InputAction::nudge_up;
      case VK_DOWN: return InputAction::nudge_down;
      default: return InputAction::none;
    }
  }

  void ProcessKey(UINT virtual_key, UINT packed_scan) {
    if (!active_) {
      return;
    }
    const UINT scan_code = packed_scan & 0xFF;
    const bool extended = (packed_scan & 0x100) != 0;
    const InputAction action = ActionFor(virtual_key);
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
      region_ = monitors_[monitor_index_].bounds;
      coordinate_view_ = false;
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
        cursor.x = std::clamp<LONG>(cursor.x, monitors_[monitor_index_].bounds.left,
                                    monitors_[monitor_index_].bounds.right - 1);
        cursor.y = std::clamp<LONG>(cursor.y, monitors_[monitor_index_].bounds.top,
                                    monitors_[monitor_index_].bounds.bottom - 1);
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
    region_ = monitors_[monitor_index_].bounds;
    history_.clear();
    history_states_.clear();
    coordinate_view_ = false;
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
  DWORD held_button_up_ = 0;
  bool coordinate_view_ = false;
  std::string error_code_;
  HHOOK keyboard_hook_ = nullptr;
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
