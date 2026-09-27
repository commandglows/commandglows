#ifndef RUNNER_DESKTOP_CONTROL_KEYMAP_H_
#define RUNNER_DESKTOP_CONTROL_KEYMAP_H_

#include <array>
#include <cstdint>
#include <iterator>
#include <string>
#include <unordered_set>
#include <vector>

#include <windows.h>

namespace commandglows::desktop_control {

struct PhysicalKey {
  UINT scan_code;
  bool extended;
  UINT virtual_key;
};

struct KeyBinding {
  UINT scan_code = 0;
  bool extended = false;
  UINT modifiers = 0;
};

inline constexpr std::array<PhysicalKey, 9> kGridKeys{{
    {0x10, false, 'Q'}, {0x11, false, 'W'}, {0x12, false, 'E'},
    {0x1E, false, 'A'}, {0x1F, false, 'S'}, {0x20, false, 'D'},
    {0x2C, false, 'Z'}, {0x2D, false, 'X'}, {0x2E, false, 'C'},
}};

inline constexpr std::array<PhysicalKey, 25> kCoordinateKeys{{
    {0x10, false, 'Q'}, {0x11, false, 'W'}, {0x12, false, 'E'},
    {0x13, false, 'R'}, {0x14, false, 'T'},
    {0x1E, false, 'A'}, {0x1F, false, 'S'}, {0x20, false, 'D'},
    {0x21, false, 'F'}, {0x22, false, 'G'},
    {0x2C, false, 'Z'}, {0x2D, false, 'X'}, {0x2E, false, 'C'},
    {0x2F, false, 'V'}, {0x30, false, 'B'},
    {0x15, false, 'Y'}, {0x16, false, 'U'}, {0x17, false, 'I'},
    {0x18, false, 'O'}, {0x19, false, 'P'},
    {0x23, false, 'H'}, {0x24, false, 'J'}, {0x25, false, 'K'},
    {0x26, false, 'L'}, {0x27, false, VK_OEM_1},
}};

inline std::wstring KeyLegend(const PhysicalKey& key, HKL layout) {
  const UINT vk = MapVirtualKeyExW(key.scan_code, MAPVK_VSC_TO_VK_EX, layout);
  if (vk == 0) return L"?";
  BYTE keyboard_state[256]{};
  WCHAR chars[8]{};
  const int count = ToUnicodeEx(vk, key.scan_code, keyboard_state, chars,
                                static_cast<int>(std::size(chars)), 0, layout);
  if (count > 0) {
    std::wstring legend(chars, chars + count);
    for (wchar_t& ch : legend) {
      if (ch >= L'a' && ch <= L'z') ch = static_cast<wchar_t>(ch - L'a' + L'A');
    }
    return legend;
  }
  return L"?";
}

inline bool SameKey(const KeyBinding& a, const KeyBinding& b) {
  return a.scan_code == b.scan_code && a.extended == b.extended &&
         a.modifiers == b.modifiers;
}

inline bool IsModifierKey(const KeyBinding& key) {
  return key.scan_code == 0x2A || key.scan_code == 0x36 ||
         key.scan_code == 0x1D || key.scan_code == 0x38 ||
         (key.extended && (key.scan_code == 0x1D || key.scan_code == 0x38 ||
                           key.scan_code == 0x5B || key.scan_code == 0x5C));
}

inline bool IsCellKey(const KeyBinding& key) {
  if (key.modifiers != 0) return false;
  for (const auto& cell : kCoordinateKeys) {
    if (key.scan_code == cell.scan_code && key.extended == cell.extended) return true;
  }
  return false;
}

enum class KeyCaptureDecision { forward, captured, repeat };

inline KeyCaptureDecision CaptureKeyDown(std::unordered_set<uint32_t>& held,
                                         uint32_t identity, bool active,
                                         bool assigned) {
  if (held.find(identity) != held.end()) return KeyCaptureDecision::repeat;
  if (!active || !assigned) return KeyCaptureDecision::forward;
  held.insert(identity);
  return KeyCaptureDecision::captured;
}

inline bool ReleaseKeyUp(std::unordered_set<uint32_t>& held, uint32_t identity) {
  return held.erase(identity) != 0;
}

}  // namespace commandglows::desktop_control

#endif  // RUNNER_DESKTOP_CONTROL_KEYMAP_H_
