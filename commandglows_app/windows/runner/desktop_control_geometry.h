#ifndef RUNNER_DESKTOP_CONTROL_GEOMETRY_H_
#define RUNNER_DESKTOP_CONTROL_GEOMETRY_H_

#include <algorithm>
#include <cstdint>
#include <optional>

#include <windows.h>

namespace commandglows::desktop_control {

inline std::optional<RECT> DivideCell(const RECT& parent, int columns,
                                      int rows, int index) {
  const LONG width = parent.right - parent.left;
  const LONG height = parent.bottom - parent.top;
  if (columns <= 0 || rows <= 0 || width < columns || height < rows ||
      index < 0 || index >= columns * rows) {
    return std::nullopt;
  }
  const int column = index % columns;
  const int row = index / columns;
  RECT cell{
      parent.left + static_cast<LONG>((static_cast<int64_t>(width) * column) /
                                      columns),
      parent.top + static_cast<LONG>((static_cast<int64_t>(height) * row) /
                                     rows),
      parent.left + static_cast<LONG>((static_cast<int64_t>(width) *
                                       (column + 1)) /
                                      columns),
      parent.top + static_cast<LONG>((static_cast<int64_t>(height) *
                                      (row + 1)) /
                                     rows),
  };
  if (cell.right <= cell.left || cell.bottom <= cell.top) {
    return std::nullopt;
  }
  return cell;
}

inline POINT CenterOf(const RECT& rect) {
  return POINT{rect.left + (rect.right - rect.left) / 2,
               rect.top + (rect.bottom - rect.top) / 2};
}

inline std::optional<RECT> IntersectNonEmpty(const RECT& first,
                                           const RECT& second) {
  RECT overlap{std::max(first.left, second.left),
               std::max(first.top, second.top),
               std::min(first.right, second.right),
               std::min(first.bottom, second.bottom)};
  if (overlap.right - overlap.left < 3 ||
      overlap.bottom - overlap.top < 3) {
    return std::nullopt;
  }
  return overlap;
}

}  // namespace commandglows::desktop_control

#endif  // RUNNER_DESKTOP_CONTROL_GEOMETRY_H_
