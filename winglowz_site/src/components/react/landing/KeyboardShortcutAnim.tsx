/** @jsxImportSource react */
import { useState, useEffect } from "react"

const shortcuts = [
  { keys: ["Ctrl", "Space"], label: "Quick search" },
  { keys: ["Ctrl", "B"], label: "Bookmark" },
  { keys: ["Ctrl", "Shift", "S"], label: "Save all" },
]

export function KeyboardShortcutAnim() {
  const [pressed, setPressed] = useState(false)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPressed(true)
      setTimeout(() => {
        setPressed(false)
        setCurrent((prev) => (prev + 1) % shortcuts.length)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="keyboard-shortcut-stack flex flex-col">
      <div className="keyboard-shortcut-keys flex items-center">
        {shortcuts[current].keys.map((key, i) => (
          <kbd
            key={`${current}-${i}`}
            className={`landing-keyboard-key landing-keyboard-key--${i + 1} px-2 py-1 text-xs border rounded font-mono ${pressed ? "is-pressed" : ""}`}
            data-pressed={pressed}
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="landing-keyboard-label text-xs">
        {shortcuts[current].label}
      </span>
    </div>
  )
}
