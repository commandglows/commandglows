#ifndef RUNNER_DESKTOP_CONTROL_HOST_H_
#define RUNNER_DESKTOP_CONTROL_HOST_H_

#include <memory>

#include <flutter/binary_messenger.h>
#include <windows.h>

/// Native Windows host for keyboard-driven, system-wide pointer control.
/// All public methods and window-message handling run on the runner UI thread.
class WindowsDesktopControlHost {
 public:
  WindowsDesktopControlHost(HWND owner, flutter::BinaryMessenger* messenger);
  ~WindowsDesktopControlHost();

  WindowsDesktopControlHost(const WindowsDesktopControlHost&) = delete;
  WindowsDesktopControlHost& operator=(const WindowsDesktopControlHost&) = delete;

  /// Handles messages owned by this host. Returns true when consumed.
  bool HandleWindowMessage(UINT message, WPARAM wparam, LPARAM lparam);

 private:
  class Impl;
  std::unique_ptr<Impl> impl_;
};

#endif  // RUNNER_DESKTOP_CONTROL_HOST_H_
