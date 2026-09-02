<!-- >>> ShipGlows development environment >>> -->
## ShipGlows development environment

- Environment schema: `shipglows-project-environment/v2`
- Server manager: `shipglows-devserver`
- Project kind: `browser-extension`
- Assigned port: `pending first ShipGlows start`
- Canonical local URL: `not applicable (browser extension)`
- Browser target: `Chrome`
- Unpacked Chrome directory: `dist/chrome`
- Extension workflow: `s start -ProjectPath .` -> `s open -ProjectPath .` -> Chrome Developer mode -> Load unpacked -> `dist\chrome` -> `s stop -ProjectPath .`
- Chrome profile boundary: ShipGlows opens the extension manager and generated directory but never installs the extension automatically in a personal profile.
- Live status authority: Windows ShipGlows DevServer registry

Use the assigned URL for ordinary web projects. Browser extensions use their generated unpacked directory and browser extension manager instead of a normal page URL. Do not substitute framework defaults such as Astro/Vite `4321` or a port from another project. Read the ShipGlows registry for `running` or `stopped`; this durable document is not rewritten on start or stop.
<!-- <<< ShipGlows development environment <<< -->
