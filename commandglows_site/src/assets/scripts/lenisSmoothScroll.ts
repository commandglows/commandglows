import Lenis from 'lenis';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let lenis: Lenis | undefined;
let frame: number | undefined;
let swapping = false;

function stop() {
  if (frame !== undefined) cancelAnimationFrame(frame);
  frame = undefined;
  lenis?.destroy();
  lenis = undefined;
}

function mount() {
  if (swapping || reducedMotion.matches || document.querySelector('[data-dashboard-shell]')) {
    stop();
    return;
  }
  if (lenis) return;
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
    infinite: false,
  });

  function raf(time: number) {
    if (!lenis) return;
    lenis.raf(time);
    frame = requestAnimationFrame(raf);
  }

  frame = requestAnimationFrame(raf);
}

function beforeSwap() {
  swapping = true;
  stop();
}

function pageLoad() {
  swapping = false;
  mount();
}

document.addEventListener('astro:before-swap', beforeSwap);
document.addEventListener('astro:page-load', pageLoad);
reducedMotion.addEventListener('change', mount);
mount();

// Astro keeps this module across navigation; HMR and tests can release it fully.
export function disposeSmoothScroll() {
  stop();
  document.removeEventListener('astro:before-swap', beforeSwap);
  document.removeEventListener('astro:page-load', pageLoad);
  reducedMotion.removeEventListener('change', mount);
}

if (import.meta.hot) import.meta.hot.dispose(disposeSmoothScroll);
