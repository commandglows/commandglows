/** @jsxImportSource react */
import { useMemo, useState, type CSSProperties } from "react"
import { termuxThemes, type TermuxTheme } from "../../data/termux-themes"

function generateColorsProperties(theme: TermuxTheme): string {
  const c = theme.colors
  return `# ${theme.name} - Termux color scheme
# Paste this into ~/.termux/colors.properties
# Then run: termux-reload-settings

foreground=${c.foreground}
background=${c.background}
cursor=${c.cursor}

color0=${c.color0}
color1=${c.color1}
color2=${c.color2}
color3=${c.color3}
color4=${c.color4}
color5=${c.color5}
color6=${c.color6}
color7=${c.color7}

color8=${c.color8}
color9=${c.color9}
color10=${c.color10}
color11=${c.color11}
color12=${c.color12}
color13=${c.color13}
color14=${c.color14}
color15=${c.color15}
`
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="termux-swatch-stack">
      <div
        className="termux-swatch"
        style={{ backgroundColor: color } as CSSProperties}
        title={`${label}: ${color}`}
      />
      <span className="termux-swatch-label">{label}</span>
    </div>
  )
}

function TerminalPreview({ theme }: { theme: TermuxTheme }) {
  const c = theme.colors

  return (
    <div className="termux-terminal" style={{ backgroundColor: c.background } as CSSProperties}>
      <div className="termux-terminal__titlebar" style={{ backgroundColor: c.color0 } as CSSProperties}>
        <div className="termux-terminal__dots">
          <div className="termux-terminal__dot" style={{ backgroundColor: c.color1 } as CSSProperties} />
          <div className="termux-terminal__dot" style={{ backgroundColor: c.color3 } as CSSProperties} />
          <div className="termux-terminal__dot" style={{ backgroundColor: c.color2 } as CSSProperties} />
        </div>
        <span style={{ color: c.color7, fontSize: "0.75rem", opacity: 0.7 }}>Termux</span>
      </div>

      <div className="termux-terminal__content">
        <div className="termux-terminal__section">
          <span style={{ color: c.color4 }}>~/projects/myapp</span>
        </div>
        <div className="termux-terminal__line">
          <span style={{ color: c.color5 }}>{"❯ "}</span>
          <span style={{ color: c.foreground }}>git status</span>
        </div>

        <div className="termux-terminal__section">
          <span style={{ color: c.foreground }}>On branch </span>
          <span style={{ color: c.color2, fontWeight: 700 }}>main</span>
        </div>
        <div style={{ color: c.foreground }}>Changes not staged for commit:</div>
        <div className="termux-terminal__line">
          <span style={{ color: c.color3 }}>{"  modified: "}</span>
          <span style={{ color: c.foreground }}>src/app.ts</span>
        </div>
        <div className="termux-terminal__line">
          <span style={{ color: c.color1 }}>{"  deleted:  "}</span>
          <span style={{ color: c.foreground }}>old-file.js</span>
        </div>
        <div className="termux-terminal__line">
          <span style={{ color: c.color2 }}>{"  added:    "}</span>
          <span style={{ color: c.foreground }}>new-feature.ts</span>
        </div>

        <div className="termux-terminal__section termux-terminal__line">
          <span style={{ color: c.color5 }}>{"❯ "}</span>
          <span style={{ color: c.foreground }}>npm run build</span>
        </div>
        <div className="termux-terminal__line">
          <span style={{ color: c.color2 }}>{"✓ "}</span>
          <span style={{ color: c.foreground }}>Build successful</span>
        </div>
        <div className="termux-terminal__line">
          <span style={{ color: c.color3 }}>{"⚠ "}</span>
          <span style={{ color: c.color3 }}>2 warnings</span>
        </div>
        <div className="termux-terminal__line">
          <span style={{ color: c.color1 }}>{"✗ "}</span>
          <span style={{ color: c.color1 }}>Error: missing module &apos;lodash&apos;</span>
        </div>

        <div className="termux-terminal__section termux-terminal__line">
          <span style={{ color: c.color5 }}>{"❯ "}</span>
          <span style={{ color: c.color6 }}>echo</span>
          <span style={{ color: c.color2 }}> &quot;Hello World&quot;</span>
        </div>
        <div style={{ color: c.foreground }}>Hello World</div>

        <div className="termux-terminal__section termux-terminal__line">
          <span style={{ color: c.color5 }}>{"❯ "}</span>
          <span
            className="termux-terminal__cursor"
            style={{ backgroundColor: c.cursor } as CSSProperties}
          />
        </div>
      </div>
    </div>
  )
}

export default function TermuxThemePreview() {
  const [selectedId, setSelectedId] = useState("nord")
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [copied, setCopied] = useState(false)

  const selectedTheme = useMemo(
    () => termuxThemes.find((t) => t.id === selectedId) || termuxThemes[0],
    [selectedId]
  )

  const filteredThemes = useMemo(() => {
    return termuxThemes.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = activeCategory === "all" || t.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [search, activeCategory])

  const categories = useMemo(() => {
    const cats = new Map<string, number>()
    cats.set("all", termuxThemes.length)
    for (const t of termuxThemes) {
      cats.set(t.category, (cats.get(t.category) || 0) + 1)
    }
    return cats
  }, [])

  async function handleCopy() {
    const text = generateColorsProperties(selectedTheme)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="termux-theme-preview">
      <style>{`
        @keyframes termux-blink {
          50% { opacity: 0; }
        }
      `}</style>

      <div>
        <input
          type="text"
          placeholder="Rechercher un thème..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="termux-theme-input"
        />

        <div className="termux-theme-filters">
          {([
            ["all", "Tous"],
            ["popular", "Populaires"],
            ["dark", "Sombres"],
            ["light", "Clairs"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              className={`termux-theme-btn${activeCategory === key ? " termux-theme-btn--active" : ""}`}
              onClick={() => setActiveCategory(key)}
            >
              {label} ({categories.get(key) || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="termux-theme-layout">
        <div className="termux-theme-list">
          {filteredThemes.map((theme) => (
            <button
              key={theme.id}
              className={`termux-theme-btn termux-theme-btn--selected termux-theme-btn--compact${
                selectedId === theme.id ? " termux-theme-btn--active" : ""
              }`}
              onClick={() => setSelectedId(theme.id)}
            >
              <div className="termux-theme-btn__preview">
                {[
                  theme.colors.background,
                  theme.colors.color1,
                  theme.colors.color2,
                  theme.colors.color4,
                  theme.colors.color5,
                ].map((color, index) => (
                  <div
                    key={index}
                    className="termux-swatch termux-theme-btn__swatch"
                    style={{ backgroundColor: color } as CSSProperties}
                  />
                ))}
              </div>
              <span className="termux-theme-btn__label">{theme.name}</span>
            </button>
          ))}

          {filteredThemes.length === 0 && (
            <div className="py-5 text-center opacity-50">
              Aucun thème trouvé
            </div>
          )}
        </div>

        <div className="termux-theme-preview-panel">
          <TerminalPreview theme={selectedTheme} />

          <div className="termux-theme-palette">
            <div className="termux-theme-palette__title">Palette</div>
            <div className="termux-theme-swatch-grid">
              <ColorSwatch color={selectedTheme.colors.foreground} label="fg" />
              <ColorSwatch color={selectedTheme.colors.background} label="bg" />
              {Array.from({ length: 16 }, (_, i) => (
                <ColorSwatch
                  key={i}
                  color={selectedTheme.colors[`color${i}` as keyof typeof selectedTheme.colors]}
                  label={`${i}`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className={`termux-copy-button${copied ? " termux-copy-button--success" : ""}`}
          >
            {copied ? "Copié !" : `Copier colors.properties — ${selectedTheme.name}`}
          </button>
        </div>
      </div>
    </div>
  )
}
