import type { TransitionBeforeSwapEvent } from 'astro:transitions/client'

/** Apply the current choice before Astro paints the next document. */
export function installThemeContinuity() {
  const beforeSwap = (event: Event) => {
    const next = (event as TransitionBeforeSwapEvent).newDocument.documentElement
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    next.classList.remove('dark', 'light')
    next.classList.add(theme)
    next.dataset.theme = theme
  }
  document.addEventListener('astro:before-swap', beforeSwap)
  const dispose = () => document.removeEventListener('astro:before-swap', beforeSwap)
  if (import.meta.hot) import.meta.hot.dispose(dispose)
  return dispose
}
