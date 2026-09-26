#include "pin_window_host.h"

#include <cmath>
#include <cstdint>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <utility>

#include <flutter/encodable_value.h>
#include <flutter/event_channel.h>
#include <flutter/event_stream_handler_functions.h>
#include <flutter/method_channel.h>
#include <flutter/standard_method_codec.h>
#include <flutter_windows.h>
#include <windows.h>

namespace {

constexpr char kMethodChannelName[] = "commandglows_app/pin_window";
constexpr char kEventChannelName[] = "commandglows_app/pin_window_events";
constexpr char kDemoPinId[] = "pin-demo-snippet";
constexpr wchar_t kPostItWindowClass[] = L"COMMANDGLOWS_PIN_POSTIT_WINDOW";
constexpr wchar_t kPostItWindowTitle[] = L"Post-it de d\u00e9monstration";
constexpr wchar_t kDemoSnippetText[] =
    L"Exemple de texte factice\r\nR\u00e9union d'\u00e9quipe, vendredi \u00e0 10 h.";
constexpr double kMaximumLogicalCoordinate = 100000.0;
constexpr int kWindowWidth = 360;
constexpr int kWindowHeight = 180;

struct LogicalPosition {
  double x;
  double y;
};

std::optional<double> ReadNumber(const flutter::EncodableValue& value) {
  if (const auto* number = std::get_if<double>(&value)) {
    return *number;
  }
  if (const auto* number = std::get_if<int32_t>(&value)) {
    return static_cast<double>(*number);
  }
  if (const auto* number = std::get_if<int64_t>(&value)) {
    return static_cast<double>(*number);
  }
  return std::nullopt;
}

std::optional<POINT> ScaleLogicalPosition(const LogicalPosition& position,
                                          UINT* dpi_out = nullptr) {
  if (!std::isfinite(position.x) || !std::isfinite(position.y) ||
      std::abs(position.x) > kMaximumLogicalCoordinate ||
      std::abs(position.y) > kMaximumLogicalCoordinate) {
    return std::nullopt;
  }
  const POINT logical{static_cast<LONG>(std::lround(position.x)),
                      static_cast<LONG>(std::lround(position.y))};
  const HMONITOR monitor = MonitorFromPoint(logical, MONITOR_DEFAULTTONEAREST);
  UINT dpi = FlutterDesktopGetDpiForMonitor(monitor);
  if (dpi == 0) {
    dpi = 96;
  }
  if (dpi_out != nullptr) {
    *dpi_out = dpi;
  }
  return POINT{static_cast<LONG>(std::lround(position.x * dpi / 96.0)),
               static_cast<LONG>(std::lround(position.y * dpi / 96.0))};
}

int ScaleLogicalSize(double size, UINT dpi) {
  return static_cast<int>(std::lround(size * dpi / 96.0));
}

flutter::EncodableValue OperationResult(const std::string& status,
                                       const std::string& message = "") {
  flutter::EncodableMap result;
  result[flutter::EncodableValue("status")] = flutter::EncodableValue(status);
  if (!message.empty()) {
    result[flutter::EncodableValue("message")] =
        flutter::EncodableValue(message);
  }
  return flutter::EncodableValue(std::move(result));
}

class NativePostItWindow {
 public:
  using EventCallback = std::function<void(const std::string&,
                                           const std::string&,
                                           const LogicalPosition*)>;

  NativePostItWindow(std::string pin_id, EventCallback on_event)
      : pin_id_(std::move(pin_id)), on_event_(std::move(on_event)) {}

  ~NativePostItWindow() { Destroy(); }

  bool Create(const LogicalPosition& position) {
    if (!RegisterWindowClass()) {
      return false;
    }
    UINT dpi = 96;
    const auto point = ScaleLogicalPosition(position, &dpi);
    if (!point) {
      return false;
    }
    const int width = ScaleLogicalSize(kWindowWidth, dpi);
    const int height = ScaleLogicalSize(kWindowHeight, dpi);

    hwnd_ = CreateWindowExW(
        WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | WS_EX_TOPMOST,
        kPostItWindowClass,
        kPostItWindowTitle, WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU, point->x,
        point->y, width, height, nullptr, nullptr, GetModuleHandleW(nullptr),
        this);
    if (!hwnd_) {
      return false;
    }

    if (!SetWindowPos(hwnd_, HWND_TOPMOST, point->x, point->y, 0, 0,
                      SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW)) {
      DestroyWindow(hwnd_);
      return false;
    }
    ShowWindow(hwnd_, SW_SHOWNOACTIVATE);
    return true;
  }

  bool IsOpen() const { return hwnd_ != nullptr && IsWindow(hwnd_); }

  bool ShowWithoutActivation() {
    if (!IsOpen()) {
      return false;
    }
    if (!SetWindowPos(hwnd_, HWND_TOPMOST, 0, 0, 0, 0,
                      SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE |
                          SWP_SHOWWINDOW)) {
      return false;
    }
    ShowWindow(hwnd_, SW_SHOWNOACTIVATE);
    return true;
  }

  bool Move(const LogicalPosition& position) {
    if (!IsOpen()) {
      return false;
    }
    const auto point = ScaleLogicalPosition(position);
    if (!point) {
      return false;
    }
    if (!SetWindowPos(hwnd_, nullptr, point->x, point->y, 0, 0,
                      SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE)) {
      return false;
    }
    EmitMovedEvent();
    return true;
  }

  bool Close() {
    if (!IsOpen()) {
      return false;
    }
    return DestroyWindow(hwnd_) != FALSE;
  }

 private:
  static bool RegisterWindowClass() {
    static ATOM window_class = []() {
      WNDCLASSW definition{};
      definition.lpfnWndProc = WindowProc;
      definition.hInstance = GetModuleHandleW(nullptr);
      definition.hCursor = LoadCursorW(nullptr, IDC_ARROW);
      definition.hbrBackground = GetSysColorBrush(COLOR_WINDOW);
      definition.lpszClassName = kPostItWindowClass;
      return RegisterClassW(&definition);
    }();
    return window_class != 0 || GetLastError() == ERROR_CLASS_ALREADY_EXISTS;
  }

  static LRESULT CALLBACK WindowProc(HWND hwnd,
                                     UINT message,
                                     WPARAM wparam,
                                     LPARAM lparam) {
    NativePostItWindow* self = reinterpret_cast<NativePostItWindow*>(
        GetWindowLongPtrW(hwnd, GWLP_USERDATA));
    if (message == WM_NCCREATE) {
      const auto* create = reinterpret_cast<const CREATESTRUCTW*>(lparam);
      self = static_cast<NativePostItWindow*>(create->lpCreateParams);
      self->hwnd_ = hwnd;
      SetWindowLongPtrW(hwnd, GWLP_USERDATA,
                        reinterpret_cast<LONG_PTR>(self));
    }
    return self ? self->HandleMessage(hwnd, message, wparam, lparam)
                : DefWindowProcW(hwnd, message, wparam, lparam);
  }

  LRESULT HandleMessage(HWND hwnd,
                        UINT message,
                        WPARAM wparam,
                        LPARAM lparam) {
    switch (message) {
      case WM_CREATE: {
        HWND text = CreateWindowExW(
            0, L"STATIC", kDemoSnippetText,
            WS_CHILD | WS_VISIBLE | SS_LEFT | SS_NOPREFIX, 16, 20, 320, 100,
            hwnd, nullptr, GetModuleHandleW(nullptr), nullptr);
        if (!text) {
          return -1;
        }
        SendMessageW(text, WM_SETFONT,
                     reinterpret_cast<WPARAM>(GetStockObject(DEFAULT_GUI_FONT)),
                     TRUE);
        return 0;
      }
      case WM_MOUSEACTIVATE:
        return MA_NOACTIVATE;
      case WM_EXITSIZEMOVE:
        EmitMovedEvent();
        return 0;
      case WM_DPICHANGED: {
        const auto* suggested = reinterpret_cast<const RECT*>(lparam);
        SetWindowPos(hwnd, nullptr, suggested->left, suggested->top,
                     suggested->right - suggested->left,
                     suggested->bottom - suggested->top,
                     SWP_NOZORDER | SWP_NOACTIVATE);
        return 0;
      }
      case WM_CLOSE:
        DestroyWindow(hwnd);
        return 0;
      case WM_DESTROY:
        hwnd_ = nullptr;
        if (on_event_) {
          on_event_(pin_id_, "closed", nullptr);
        }
        return 0;
      case WM_NCDESTROY:
        SetWindowLongPtrW(hwnd, GWLP_USERDATA, 0);
        hwnd_ = nullptr;
        return DefWindowProcW(hwnd, message, wparam, lparam);
    }
    return DefWindowProcW(hwnd, message, wparam, lparam);
  }

  void EmitMovedEvent() const {
    if (!IsOpen() || !on_event_) {
      return;
    }
    RECT bounds{};
    if (!GetWindowRect(hwnd_, &bounds)) {
      return;
    }
    const double scale = GetWindowDpi(hwnd_) / 96.0;
    const LogicalPosition position{bounds.left / scale, bounds.top / scale};
    on_event_(pin_id_, "moved", &position);
  }

  static UINT GetWindowDpi(HWND hwnd) {
    const UINT dpi = FlutterDesktopGetDpiForMonitor(
        MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST));
    return dpi == 0 ? 96 : dpi;
  }

  void Destroy() {
    if (IsOpen()) {
      DestroyWindow(hwnd_);
    }
  }

  const std::string pin_id_;
  EventCallback on_event_;
  HWND hwnd_ = nullptr;
};

}  // namespace

class WindowsPinWindowHost::Impl {
 public:
  explicit Impl(flutter::BinaryMessenger* messenger)
      : method_channel_(messenger, kMethodChannelName,
                        &flutter::StandardMethodCodec::GetInstance()),
        event_channel_(messenger, kEventChannelName,
                       &flutter::StandardMethodCodec::GetInstance()) {
    RegisterEventChannel();
    RegisterMethodChannel();
  }

  ~Impl() { window_.reset(); }

 private:
  using EncodableValue = flutter::EncodableValue;

  void RegisterEventChannel() {
    auto on_listen = [this](
                         const EncodableValue*,
                         std::unique_ptr<flutter::EventSink<EncodableValue>>&&
                             events) {
      event_sink_ = std::move(events);
      return std::unique_ptr<flutter::StreamHandlerError<EncodableValue>>();
    };
    auto on_cancel = [this](const EncodableValue*) {
      event_sink_.reset();
      return std::unique_ptr<flutter::StreamHandlerError<EncodableValue>>();
    };
    event_channel_.SetStreamHandler(
        std::make_unique<flutter::StreamHandlerFunctions<EncodableValue>>(
            std::move(on_listen), std::move(on_cancel)));
  }

  void RegisterMethodChannel() {
    method_channel_.SetMethodCallHandler(
        [this](const auto& call, auto result) {
          const auto arguments = ReadArguments(call.arguments());
          if (!arguments) {
            result->Success(OperationResult("failed", "invalid_request"));
            return;
          }

          if (call.method_name() == "openPinWindow") {
            result->Success(Open(*arguments));
            return;
          }
          if (call.method_name() == "movePinWindow") {
            result->Success(Move(*arguments));
            return;
          }
          if (call.method_name() == "closePinWindow") {
            result->Success(Close(*arguments));
            return;
          }
          result->NotImplemented();
        });
  }

  struct Request {
    std::string pin_id;
    std::optional<LogicalPosition> position;
  };

  static std::optional<Request> ReadArguments(const EncodableValue* raw) {
    if (raw == nullptr) {
      return std::nullopt;
    }
    const auto* arguments = std::get_if<flutter::EncodableMap>(raw);
    if (arguments == nullptr) {
      return std::nullopt;
    }
    const auto id_it = arguments->find(EncodableValue("pinId"));
    if (id_it == arguments->end()) {
      return std::nullopt;
    }
    const auto* pin_id = std::get_if<std::string>(&id_it->second);
    if (pin_id == nullptr || pin_id->empty()) {
      return std::nullopt;
    }
    const auto first_non_space = pin_id->find_first_not_of(" \t\r\n");
    const auto last_non_space = pin_id->find_last_not_of(" \t\r\n");
    if (first_non_space == std::string::npos || first_non_space != 0 ||
        last_non_space != pin_id->size() - 1) {
      return std::nullopt;
    }

    Request request{*pin_id, std::nullopt};
    const auto position_it = arguments->find(EncodableValue("position"));
    if (position_it != arguments->end()) {
      const auto* position =
          std::get_if<flutter::EncodableMap>(&position_it->second);
      if (position == nullptr) {
        return std::nullopt;
      }
      const auto x_it = position->find(EncodableValue("x"));
      const auto y_it = position->find(EncodableValue("y"));
      if (x_it == position->end() || y_it == position->end()) {
        return std::nullopt;
      }
      const auto x = ReadNumber(x_it->second);
      const auto y = ReadNumber(y_it->second);
      if (!x || !y) {
        return std::nullopt;
      }
      const LogicalPosition logical_position{*x, *y};
      if (!ScaleLogicalPosition(logical_position)) {
        return std::nullopt;
      }
      request.position = logical_position;
    }
    return request;
  }

  EncodableValue Open(const Request& request) {
    if (request.pin_id != kDemoPinId || !request.position) {
      return OperationResult("failed", "invalid_pin_window_request");
    }
    if (window_ && window_->IsOpen()) {
      return OperationResult(window_->ShowWithoutActivation() ? "succeeded"
                                                               : "failed");
    }
    window_.reset();
    window_ = std::make_unique<NativePostItWindow>(
        request.pin_id,
        [this](const std::string& pin_id, const std::string& type,
               const LogicalPosition* position) { EmitEvent(pin_id, type, position); });
    if (!window_->Create(*request.position)) {
      window_.reset();
      return OperationResult("failed", "native_window_creation_failed");
    }
    return OperationResult("succeeded");
  }

  EncodableValue Move(const Request& request) {
    if (!window_ || request.pin_id != kDemoPinId || !request.position ||
        !window_->IsOpen()) {
      return OperationResult("failed", "pin_window_not_found");
    }
    return OperationResult(window_->Move(*request.position) ? "succeeded"
                                                             : "failed");
  }

  EncodableValue Close(const Request& request) {
    if (!window_ || request.pin_id != kDemoPinId || !window_->IsOpen()) {
      return OperationResult("failed", "pin_window_not_found");
    }
    return OperationResult(window_->Close() ? "succeeded" : "failed");
  }

  void EmitEvent(const std::string& pin_id,
                 const std::string& type,
                 const LogicalPosition* position) {
    if (!event_sink_) {
      return;
    }
    flutter::EncodableMap event;
    event[EncodableValue("pinId")] = EncodableValue(pin_id);
    event[EncodableValue("type")] = EncodableValue(type);
    if (position != nullptr) {
      flutter::EncodableMap location;
      location[EncodableValue("x")] = EncodableValue(position->x);
      location[EncodableValue("y")] = EncodableValue(position->y);
      event[EncodableValue("position")] = EncodableValue(std::move(location));
    }
    event_sink_->Success(EncodableValue(std::move(event)));
  }

  flutter::MethodChannel<EncodableValue> method_channel_;
  flutter::EventChannel<EncodableValue> event_channel_;
  std::unique_ptr<flutter::EventSink<EncodableValue>> event_sink_;
  std::unique_ptr<NativePostItWindow> window_;
};

WindowsPinWindowHost::WindowsPinWindowHost(flutter::BinaryMessenger* messenger)
    : impl_(std::make_unique<Impl>(messenger)) {}

WindowsPinWindowHost::~WindowsPinWindowHost() = default;
