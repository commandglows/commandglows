import Cocoa
import Carbon.HIToolbox
import FlutterMacOS

class MainFlutterWindow: NSWindow {
  private var overlayEnabled = false
  private var overlayVisible = false
  private var hotkeyRegistered = false
  private var overlaySizeScale = 1.0
  private var overlayOpacity = 0.9
  private var lastErrorCode: String?
  private var lastErrorMessage: String?
  private var overlayEvents: [[String: Any]] = []
  private var globalHotKeyMonitor: Any?
  private weak var lastActiveApplication: NSRunningApplication?

  override func awakeFromNib() {
    let flutterViewController = FlutterViewController()
    let windowFrame = self.frame
    self.contentViewController = flutterViewController
    self.setFrame(windowFrame, display: true)

    RegisterGeneratedPlugins(registry: flutterViewController)
    registerMacOSOverlayChannel(flutterViewController: flutterViewController)

    super.awakeFromNib()
  }

  private func registerMacOSOverlayChannel(
    flutterViewController: FlutterViewController
  ) {
    let channel = FlutterMethodChannel(
      name: "commandglows_app/macos_overlay",
      binaryMessenger: flutterViewController.engine.binaryMessenger
    )
    channel.setMethodCallHandler { [weak self] call, result in
      guard let self else {
        result(
          FlutterError(
            code: "MACOS_OVERLAY_UNAVAILABLE",
            message: "The macOS overlay host is unavailable.",
            details: nil
          )
        )
        return
      }

      switch call.method {
      case "getMacOSOverlayStatus":
        result(self.overlayStatus())
      case "setMacOSOverlayEnabled":
        let args = call.arguments as? [String: Any]
        let enabled = args?["enabled"] as? Bool ?? false
        if self.setOverlayEnabled(enabled) {
          result(self.overlayStatus())
        } else {
          result(
            FlutterError(
              code: self.lastErrorCode ?? "HOTKEY_REGISTRATION_FAILED",
              message: self.lastErrorMessage ?? "Global hotkey registration failed.",
              details: nil
            )
          )
        }
      case "showMacOSOverlay":
        self.showOverlay()
        result(self.overlayStatus())
      case "hideMacOSOverlay":
        self.hideOverlay()
        result(self.overlayStatus())
      case "setMacOSOverlayAppearance":
        let args = call.arguments as? [String: Any]
        if let sizeScale = args?["sizeScale"] as? Double {
          self.overlaySizeScale = min(max(sizeScale, 0.8), 1.4)
        }
        if let opacity = args?["opacity"] as? Double {
          self.overlayOpacity = min(max(opacity, 0.5), 1.0)
          self.alphaValue = self.overlayOpacity
        }
        result(self.overlayStatus())
      case "deliverMacOSOverlayText":
        let args = call.arguments as? [String: Any]
        let text = args?["text"] as? String ?? ""
        result(self.deliverText(text))
      case "deliverMacOSOverlayKeySequence":
        let args = call.arguments as? [String: Any]
        let steps = args?["steps"] as? [[String: Any]] ?? []
        result(self.deliverKeySequence(steps))
      case "drainMacOSOverlayEvents":
        let events = self.overlayEvents
        self.overlayEvents.removeAll()
        result(events)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }

  private func setOverlayEnabled(_ enabled: Bool) -> Bool {
    lastErrorCode = nil
    lastErrorMessage = nil
    if enabled && globalHotKeyMonitor == nil {
      globalHotKeyMonitor = NSEvent.addGlobalMonitorForEvents(
        matching: .keyDown
      ) { [weak self] event in
        guard
          event.keyCode == 49,
          event.modifierFlags.contains(.control),
          event.modifierFlags.contains(.option)
        else {
          return
        }
        self?.pushOverlayEvent(trigger: "hotkey")
        self?.showOverlay()
      }
      if globalHotKeyMonitor == nil {
        lastErrorCode = "HOTKEY_REGISTRATION_FAILED"
        lastErrorMessage = "Control+Option+Space is unavailable."
        overlayEnabled = false
        hotkeyRegistered = false
        return false
      }
      hotkeyRegistered = true
    }
    if !enabled, let monitor = globalHotKeyMonitor {
      NSEvent.removeMonitor(monitor)
      globalHotKeyMonitor = nil
      hotkeyRegistered = false
    }
    overlayEnabled = enabled
    return true
  }

  private func showOverlay() {
    lastActiveApplication = NSWorkspace.shared.frontmostApplication
    level = .floating
    collectionBehavior.insert(.canJoinAllSpaces)
    collectionBehavior.insert(.fullScreenAuxiliary)
    alphaValue = overlayOpacity
    makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)
    overlayVisible = true
  }

  private func hideOverlay() {
    orderOut(nil)
    overlayVisible = false
  }

  private func deliverText(_ text: String) -> [String: Any] {
    guard !text.isEmpty else {
      return deliveryResult(
        clipboardCopied: false,
        pasteAttempted: false,
        pasteSucceeded: false,
        errorCode: "EMPTY_TEXT",
        errorMessage: "No text to deliver."
      )
    }
    NSPasteboard.general.clearContents()
    let copied = NSPasteboard.general.setString(text, forType: .string)
    if !copied {
      return deliveryResult(
        clipboardCopied: false,
        pasteAttempted: false,
        pasteSucceeded: false,
        errorCode: "CLIPBOARD_COPY_FAILED",
        errorMessage: "macOS refused clipboard write."
      )
    }
    let pasted = deliverClipboardToLastApplication()
    return deliveryResult(
      clipboardCopied: copied,
      pasteAttempted: true,
      pasteSucceeded: pasted,
      errorCode: pasted ? nil : "PASTE_DELIVERY_FAILED",
      errorMessage: pasted ? nil : "Clipboard copied, but paste delivery failed."
    )
  }

  private func deliverClipboardToLastApplication() -> Bool {
    guard let app = lastActiveApplication, app != NSRunningApplication.current else {
      return false
    }
    app.activate(options: [.activateIgnoringOtherApps])
    let source = CGEventSource(stateID: .combinedSessionState)
    let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 9, keyDown: true)
    let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 9, keyDown: false)
    keyDown?.flags = .maskCommand
    keyUp?.flags = .maskCommand
    keyDown?.post(tap: .cghidEventTap)
    keyUp?.post(tap: .cghidEventTap)
    return keyDown != nil && keyUp != nil
  }

  private func deliverKeySequence(_ steps: [[String: Any]]) -> [String: Any] {
    guard !steps.isEmpty else {
      return commandResult(
        status: "failed",
        sentSteps: 0,
        errorCode: "EMPTY_SEQUENCE",
        errorMessage: "No key sequence to deliver."
      )
    }
    guard let app = lastActiveApplication, app != NSRunningApplication.current else {
      return commandResult(
        status: "failed",
        sentSteps: 0,
        errorCode: "NO_TARGET_APPLICATION",
        errorMessage: "No target application is available for key delivery."
      )
    }
    app.activate(options: [.activateIgnoringOtherApps])
    usleep(50000)
    var sentSteps = 0
    for step in steps {
      guard let keyName = step["key"] as? String,
        let keyCode = keyCode(for: keyName)
      else {
        return commandResult(
          status: "failed",
          sentSteps: sentSteps,
          errorCode: "UNSUPPORTED_SEQUENCE_KEY",
          errorMessage: "A key sequence step uses an unsupported key."
        )
      }
      let modifiers = step["modifiers"] as? [String] ?? []
      let flags = eventFlags(for: modifiers)
      let source = CGEventSource(stateID: .combinedSessionState)
      let keyDown = CGEvent(
        keyboardEventSource: source,
        virtualKey: keyCode,
        keyDown: true
      )
      let keyUp = CGEvent(
        keyboardEventSource: source,
        virtualKey: keyCode,
        keyDown: false
      )
      keyDown?.flags = flags
      keyUp?.flags = flags
      keyDown?.post(tap: .cghidEventTap)
      keyUp?.post(tap: .cghidEventTap)
      guard keyDown != nil && keyUp != nil else {
        return commandResult(
          status: "failed",
          sentSteps: sentSteps,
          errorCode: "KEY_SEQUENCE_DELIVERY_FAILED",
          errorMessage: "macOS key injection failed."
        )
      }
      sentSteps += 1
      usleep(25000)
    }
    return commandResult(status: "delivered", sentSteps: sentSteps)
  }

  private func keyCode(for key: String) -> CGKeyCode? {
    switch key {
    case "A": return CGKeyCode(kVK_ANSI_A)
    case "B": return CGKeyCode(kVK_ANSI_B)
    case "C": return CGKeyCode(kVK_ANSI_C)
    case "D": return CGKeyCode(kVK_ANSI_D)
    case "E": return CGKeyCode(kVK_ANSI_E)
    case "F": return CGKeyCode(kVK_ANSI_F)
    case "G": return CGKeyCode(kVK_ANSI_G)
    case "H": return CGKeyCode(kVK_ANSI_H)
    case "I": return CGKeyCode(kVK_ANSI_I)
    case "J": return CGKeyCode(kVK_ANSI_J)
    case "K": return CGKeyCode(kVK_ANSI_K)
    case "L": return CGKeyCode(kVK_ANSI_L)
    case "M": return CGKeyCode(kVK_ANSI_M)
    case "N": return CGKeyCode(kVK_ANSI_N)
    case "O": return CGKeyCode(kVK_ANSI_O)
    case "P": return CGKeyCode(kVK_ANSI_P)
    case "Q": return CGKeyCode(kVK_ANSI_Q)
    case "R": return CGKeyCode(kVK_ANSI_R)
    case "S": return CGKeyCode(kVK_ANSI_S)
    case "T": return CGKeyCode(kVK_ANSI_T)
    case "U": return CGKeyCode(kVK_ANSI_U)
    case "V": return CGKeyCode(kVK_ANSI_V)
    case "W": return CGKeyCode(kVK_ANSI_W)
    case "X": return CGKeyCode(kVK_ANSI_X)
    case "Y": return CGKeyCode(kVK_ANSI_Y)
    case "Z": return CGKeyCode(kVK_ANSI_Z)
    case "0": return CGKeyCode(kVK_ANSI_0)
    case "1": return CGKeyCode(kVK_ANSI_1)
    case "2": return CGKeyCode(kVK_ANSI_2)
    case "3": return CGKeyCode(kVK_ANSI_3)
    case "4": return CGKeyCode(kVK_ANSI_4)
    case "5": return CGKeyCode(kVK_ANSI_5)
    case "6": return CGKeyCode(kVK_ANSI_6)
    case "7": return CGKeyCode(kVK_ANSI_7)
    case "8": return CGKeyCode(kVK_ANSI_8)
    case "9": return CGKeyCode(kVK_ANSI_9)
    case "Tab": return CGKeyCode(kVK_Tab)
    case "Enter": return CGKeyCode(kVK_Return)
    case "Space": return CGKeyCode(kVK_Space)
    case "Escape": return CGKeyCode(kVK_Escape)
    case "Left": return CGKeyCode(kVK_LeftArrow)
    case "Right": return CGKeyCode(kVK_RightArrow)
    case "Up": return CGKeyCode(kVK_UpArrow)
    case "Down": return CGKeyCode(kVK_DownArrow)
    case "Backspace": return CGKeyCode(kVK_Delete)
    case "Delete": return CGKeyCode(kVK_ForwardDelete)
    default: return nil
    }
  }

  private func eventFlags(for modifiers: [String]) -> CGEventFlags {
    var flags: CGEventFlags = []
    for modifier in modifiers {
      switch modifier {
      case "ctrl":
        flags.insert(.maskControl)
      case "alt":
        flags.insert(.maskAlternate)
      case "shift":
        flags.insert(.maskShift)
      case "meta":
        flags.insert(.maskCommand)
      default:
        break
      }
    }
    return flags
  }

  private func overlayStatus() -> [String: Any] {
    var status: [String: Any] = [
      "platform": "macos",
      "supported": true,
      "enabled": overlayEnabled,
      "visible": overlayVisible,
      "hotkeyRegistered": hotkeyRegistered,
      "hotkeyLabel": "Control+Option+Space",
      "deliveryMode": "paste_and_clipboard",
      "sizeScale": overlaySizeScale,
      "opacity": overlayOpacity,
      "eventQueueSize": overlayEvents.count,
    ]
    if let lastErrorCode {
      status["lastErrorCode"] = lastErrorCode
      status["lastErrorMessage"] = lastErrorMessage
    }
    return status
  }

  private func deliveryResult(
    clipboardCopied: Bool,
    pasteAttempted: Bool,
    pasteSucceeded: Bool,
    errorCode: String?,
    errorMessage: String?
  ) -> [String: Any] {
    var result: [String: Any] = [
      "status": pasteSucceeded
        ? "delivered"
        : (clipboardCopied ? "clipboard_only" : "failed"),
      "clipboardCopied": clipboardCopied,
      "pasteAttempted": pasteAttempted,
      "pasteSucceeded": pasteSucceeded,
    ]
    if let errorCode {
      result["errorCode"] = errorCode
      result["errorMessage"] = errorMessage
    }
    return result
  }

  private func commandResult(
    status: String,
    sentSteps: Int,
    errorCode: String? = nil,
    errorMessage: String? = nil
  ) -> [String: Any] {
    var result: [String: Any] = [
      "status": status,
      "sentSteps": sentSteps,
    ]
    if let errorCode {
      result["errorCode"] = errorCode
      result["errorMessage"] = errorMessage
    }
    return result
  }

  private func pushOverlayEvent(trigger: String) {
    overlayEvents.append([
      "trigger": trigger,
      "capturedAtEpochMillis": Int64(Date().timeIntervalSince1970 * 1000),
    ])
  }
}
