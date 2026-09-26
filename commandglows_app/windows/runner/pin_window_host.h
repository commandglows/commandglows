#ifndef RUNNER_PIN_WINDOW_HOST_H_
#define RUNNER_PIN_WINDOW_HOST_H_

#include <memory>

namespace flutter {
class BinaryMessenger;
}  // namespace flutter

/// Owns detached native pin windows without controlling the primary window.
class WindowsPinWindowHost {
 public:
  explicit WindowsPinWindowHost(flutter::BinaryMessenger* messenger);
  ~WindowsPinWindowHost();

  WindowsPinWindowHost(const WindowsPinWindowHost&) = delete;
  WindowsPinWindowHost& operator=(const WindowsPinWindowHost&) = delete;

 private:
  class Impl;
  std::unique_ptr<Impl> impl_;
};

#endif  // RUNNER_PIN_WINDOW_HOST_H_
