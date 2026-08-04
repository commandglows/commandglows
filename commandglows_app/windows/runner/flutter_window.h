#ifndef RUNNER_FLUTTER_WINDOW_H_
#define RUNNER_FLUTTER_WINDOW_H_

#include <flutter/dart_project.h>
#include <flutter/flutter_view_controller.h>
#include <flutter/encodable_value.h>
#include <flutter/method_channel.h>

#include <memory>
#include <string>
#include <vector>

#include "win32_window.h"

// A window that does nothing but host a Flutter view.
class FlutterWindow : public Win32Window {
 public:
  // Creates a new FlutterWindow hosting a Flutter view running |project|.
  explicit FlutterWindow(const flutter::DartProject& project);
  virtual ~FlutterWindow();

 protected:
  // Win32Window:
  bool OnCreate() override;
  void OnDestroy() override;
  LRESULT MessageHandler(HWND window, UINT const message, WPARAM const wparam,
                         LPARAM const lparam) noexcept override;

 private:
  static constexpr int kWindowsOverlayHotkeyId = 0x5746;

  void RegisterWindowsOverlayChannel();
  flutter::EncodableValue WindowsOverlayStatus() const;
  flutter::EncodableValue WindowsOverlayDeliveryResult(
      bool clipboard_copied,
      bool paste_attempted,
      bool paste_succeeded,
      const std::string& error_code,
      const std::string& error_message) const;
  flutter::EncodableValue WindowsOverlayCommandResult(
      const std::string& status,
      int sent_steps,
      const std::string& error_code,
      const std::string& error_message) const;
  bool SetWindowsOverlayEnabled(bool enabled);
  bool ShowWindowsOverlay();
  bool HideWindowsOverlay();
  bool CopyTextToClipboard(const std::wstring& text) const;
  bool DeliverClipboardToLastForeground() const;
  bool DeliverKeySequence(const flutter::EncodableList& steps, int* sent_steps);
  void PushWindowsOverlayEvent(const std::string& trigger);
  std::wstring Utf8ToWide(const std::string& value) const;

  // The project to run.
  flutter::DartProject project_;

  // The Flutter instance hosted by this window.
  std::unique_ptr<flutter::FlutterViewController> flutter_controller_;

  std::unique_ptr<flutter::MethodChannel<flutter::EncodableValue>>
      windows_overlay_channel_;
  std::vector<flutter::EncodableValue> windows_overlay_events_;
  HWND last_foreground_window_ = nullptr;
  bool windows_overlay_enabled_ = false;
  bool windows_overlay_visible_ = false;
  bool hotkey_registered_ = false;
  double windows_overlay_size_scale_ = 1.0;
  double windows_overlay_opacity_ = 0.9;
  std::string last_error_code_;
  std::string last_error_message_;
};

#endif  // RUNNER_FLUTTER_WINDOW_H_
