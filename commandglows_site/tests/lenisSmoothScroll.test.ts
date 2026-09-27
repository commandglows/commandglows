// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const { instances, createLenis } = vi.hoisted(() => {
  const instances: { raf: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }[] = [];
  const createLenis = vi.fn(function () {
    const instance = { raf: vi.fn(), destroy: vi.fn() };
    instances.push(instance);
    return instance;
  });
  return { instances, createLenis };
});
vi.mock('lenis', () => ({ default: createLenis }));

let media: EventTarget & { matches: boolean };
let dispose: (() => void) | undefined;
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  instances.length = 0;
  document.body.innerHTML = '<main>Public page</main>';
  media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  frames = new Map();
  let nextFrame = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
});
afterEach(() => { dispose?.(); dispose = undefined; vi.unstubAllGlobals(); });
async function start() {
  dispose = (await import('../src/assets/scripts/lenisSmoothScroll')).disposeSmoothScroll;
}
const dispatch = (name: string) => document.dispatchEvent(new Event(name));

test('public navigation owns one animation loop and releases the old instance before swapping', async () => {
  await start();
  dispatch('astro:page-load');
  dispatch('astro:page-load');
  expect(instances).toHaveLength(1);
  expect(frames.size).toBe(1);
  const [id, callback] = [...frames.entries()][0];
  frames.delete(id);
  callback(100);
  expect(instances[0].raf).toHaveBeenCalledWith(100);
  expect(frames.size).toBe(1);
  dispatch('astro:before-swap');
  expect(instances[0].destroy).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
  dispatch('astro:page-load');
  expect(instances).toHaveLength(2);
  expect(frames.size).toBe(1);
});

test('dashboard uses native scrolling, including public-to-dashboard navigation', async () => {
  await start();
  dispatch('astro:before-swap');
  document.body.innerHTML = '<main data-dashboard-shell>Dashboard</main>';
  dispatch('astro:page-load');
  expect(instances).toHaveLength(1);
  expect(frames.size).toBe(0);
  expect(instances[0].destroy).toHaveBeenCalledOnce();
});

test('initial dashboard load never creates a smooth-scroll instance', async () => {
  document.body.innerHTML = '<main data-dashboard-shell>Dashboard</main>';
  await start();
  expect(createLenis).not.toHaveBeenCalled();
});

test('reduced motion changes stop and resume public scrolling without restarting during a swap', async () => {
  media.matches = true;
  await start();
  expect(createLenis).not.toHaveBeenCalled();
  media.matches = false;
  media.dispatchEvent(new Event('change'));
  expect(instances).toHaveLength(1);
  media.matches = true;
  media.dispatchEvent(new Event('change'));
  expect(instances[0].destroy).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
  dispatch('astro:before-swap');
  media.matches = false;
  media.dispatchEvent(new Event('change'));
  expect(instances).toHaveLength(1);
  dispatch('astro:page-load');
  expect(instances).toHaveLength(2);
});

test('disposal removes page and media listeners as well as the animation loop', async () => {
  await start();
  dispose?.();
  dispatch('astro:page-load');
  media.dispatchEvent(new Event('change'));
  expect(instances).toHaveLength(1);
  expect(frames.size).toBe(0);
});
