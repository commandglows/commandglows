#include <cassert>
#include <cstdint>
#include <set>
#include <unordered_set>

#include <windows.h>

#include "../desktop_control_geometry.h"
#include "../desktop_control_keymap.h"

using commandglows::desktop_control::DivideCell;
using commandglows::desktop_control::IntersectNonEmpty;
using commandglows::desktop_control::CaptureKeyDown;
using commandglows::desktop_control::KeyCaptureDecision;
using commandglows::desktop_control::KeyLegend;
using commandglows::desktop_control::kCoordinateKeys;
using commandglows::desktop_control::kGridKeys;
using commandglows::desktop_control::ReleaseKeyUp;

namespace {

void VerifyPartition(const RECT& parent, int dimension) {
  int64_t area = 0;
  for (int index = 0; index < dimension * dimension; ++index) {
    const auto cell = DivideCell(parent, dimension, dimension, index);
    assert(cell.has_value());
    assert(cell->left >= parent.left && cell->top >= parent.top);
    assert(cell->right <= parent.right && cell->bottom <= parent.bottom);
    assert(cell->right > cell->left && cell->bottom > cell->top);
    area += static_cast<int64_t>(cell->right - cell->left) *
            (cell->bottom - cell->top);
  }
  assert(area == static_cast<int64_t>(parent.right - parent.left) *
                     (parent.bottom - parent.top));
}

void VerifyRepeatedSubdivision() {
  RECT cell{0, 0, 1920, 1080};
  for (int depth = 0; depth < 5; ++depth) {
    const auto next = DivideCell(cell, 3, 3, 8);
    assert(next.has_value());
    cell = *next;
    assert(cell.right > cell.left && cell.bottom > cell.top);
  }
  assert(cell.right - cell.left <= 8);
  assert(cell.bottom - cell.top <= 5);
  assert(!DivideCell(RECT{0, 0, 2, 2}, 3, 3, 0).has_value());
  assert(!DivideCell(RECT{0, 0, 100, 100}, 3, 3, 9).has_value());
}

void VerifyWindowScopeClipping() {
  const RECT monitor{-3440, 0, 0, 1440};
  const RECT window{-2200, 120, 500, 1200};
  const auto clipped = IntersectNonEmpty(monitor, window);
  assert(clipped.has_value());
  assert(clipped->left == -2200 && clipped->right == 0);
  assert(clipped->top == 120 && clipped->bottom == 1200);
  VerifyPartition(*clipped, 3);
  assert(!IntersectNonEmpty(monitor, RECT{10, 0, 100, 100}));
  assert(!IntersectNonEmpty(monitor, RECT{-2, 0, 1, 100}));
}

void VerifyPhysicalKeyMaps() {
  assert(kGridKeys[0].scan_code == 0x10);
  assert(kGridKeys[1].scan_code == 0x11);
  assert(kGridKeys[2].scan_code == 0x12);
  assert(kGridKeys[3].scan_code == 0x1E);
  assert(kGridKeys[6].scan_code == 0x2C);
  std::set<UINT> grid_scans;
  for (const auto& key : kGridKeys) {
    assert(!key.extended);
    assert(grid_scans.insert(key.scan_code).second);
  }
  std::set<UINT> coordinate_scans;
  for (const auto& key : kCoordinateKeys) {
    assert(!key.extended);
    assert(coordinate_scans.insert(key.scan_code).second);
  }
  assert(coordinate_scans.size() == kCoordinateKeys.size());
}

void VerifyKeyboardLayoutLabels() {
  HKL qwerty = LoadKeyboardLayoutW(L"00000409", KLF_NOTELLSHELL);
  HKL azerty = LoadKeyboardLayoutW(L"0000040C", KLF_NOTELLSHELL);
  if (qwerty == nullptr || azerty == nullptr) {
    return;  // Layout language resources are optional on minimal Windows images.
  }
  assert(KeyLegend(kGridKeys[0], qwerty) == L"Q");
  assert(KeyLegend(kGridKeys[0], azerty) == L"A");
  assert(KeyLegend(kGridKeys[3], qwerty) == L"A");
  assert(KeyLegend(kGridKeys[3], azerty) == L"Q");
}

void VerifyCaptureKeyPairingOnDismiss() {
  std::unordered_set<uint32_t> held;
  constexpr uint32_t escape_key = 0x01;
  constexpr uint32_t click_key = 0x3B;  // F1 scan code.

  for (uint32_t identity : {escape_key, click_key}) {
    assert(CaptureKeyDown(held, identity, true, true, false) ==
           KeyCaptureDecision::captured);
    assert(CaptureKeyDown(held, identity, true, true, false) ==
           KeyCaptureDecision::repeat);
    // Cancel deactivates the grid before the corresponding keyup arrives.
    assert(CaptureKeyDown(held, identity + 1, false, false, false) ==
           KeyCaptureDecision::forward);
    assert(ReleaseKeyUp(held, identity));
    assert(!ReleaseKeyUp(held, identity));
  }
  assert(held.empty());
}

}  // namespace

int main() {
  const RECT negative_origin{-1920, -120, 0, 960};
  VerifyPartition(negative_origin, 3);
  VerifyPartition(negative_origin, 5);
  VerifyRepeatedSubdivision();
  VerifyWindowScopeClipping();
  VerifyPhysicalKeyMaps();
  VerifyKeyboardLayoutLabels();
  VerifyCaptureKeyPairingOnDismiss();
  return 0;
}
