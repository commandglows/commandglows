/** @jsxImportSource react */
import { useState, useEffect, useRef } from "react"

const pluginEvents = [
  { plugin: "RSSFlowz", action: "synced", color: "var(--brand-cyan)" },
  { plugin: "PluginFlowz", action: "updated", color: "var(--brand-green)" },
  { plugin: "ContentFlowz", action: "indexed", color: "var(--brand-magenta)" },
  { plugin: "NoteFlowz", action: "ready", color: "var(--brand-yellow)" },
]

export function PluginActivityTicker() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [events, setEvents] = useState<Array<{ plugin: string; action: string; color: string; id: number }>>([])
  const idRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const event = pluginEvents[activeIndex]
      idRef.current += 1
      setEvents((prev) => [{ ...event, id: idRef.current }, ...prev].slice(0, 3))
      setActiveIndex((prev) => (prev + 1) % pluginEvents.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [activeIndex])

  return (
    <div className="plugin-activity-stack flex min-w-0 flex-col">
      {events.map((event) => (
        <div
          key={event.id}
          className="plugin-activity-row flex items-center text-xs"
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 pulse-glow"
            style={{ backgroundColor: event.color }}
          />
          <span className="text-zinc-400 truncate">
            <span className="font-medium" style={{ color: event.color }}>{event.plugin}</span>
            {" "}{event.action}
          </span>
        </div>
      ))}
      {events.length === 0 && (
        <div className="plugin-activity-row flex items-center text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
          listening...
        </div>
      )}
    </div>
  )
}
