import type { Page } from '@playwright/test';

export interface PadDriver {
  press(button: number): Promise<void>;
  hold(axis: number, value: number): Promise<void>;
}

interface StubPad { buttons: Array<{ pressed: boolean; value: number }>; axes: number[] }
interface PressLatch { button: number; frame: number | null; released: boolean; reads: number }
interface StubWindow { __navPad: StubPad; __navPress: PressLatch }

export const STUB_FRAMES = 1;
export const PRESS_WAIT_FRAMES = 240;
export const IDLE_RELEASE_FRAMES = 3;
const STANDARD_BUTTON_COUNT = 17;
const AXIS_COUNT = 4;

function installStub([buttons, axes]: readonly [number, number]): void {
  const pad = { id: 'nav-walk-stub', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: new Array<number>(axes).fill(0), buttons: Array.from({ length: buttons }, () => ({ pressed: false, touched: false, value: 0 })) };
  const latch: PressLatch = { button: -1, frame: null, released: true, reads: 0 };
  const sample = (): Array<typeof pad | null> => {
    const now = document.timeline.currentTime;
    const held = pad.buttons[latch.button];
    if (held !== undefined) {latch.reads += 1;}
    if (held !== undefined && latch.frame === null) {latch.frame = typeof now === 'number' ? now : 0;}
    else if (held !== undefined && now !== latch.frame) {
      held.pressed = false;
      held.value = 0;
      latch.button = -1;
      latch.released = true;
    }
    return [pad, null, null, null];
  };
  Object.assign(window, { __navPad: pad, __navPress: latch });
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: sample });
  window.addEventListener('load', () => window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pad })));
}

async function pressInPage([button, maxFrames, idleFrames]: readonly [number, number, number]): Promise<void> {
  const { __navPad: pad, __navPress: latch } = window as unknown as StubWindow;
  const target = pad.buttons[button];
  if (target === undefined) {return;}
  target.pressed = true;
  target.value = 1;
  Object.assign(latch, { button, frame: null, released: false, reads: 0 });
  await new Promise<void>((resolve) => {
    let seen = 0;
    let idle = 0;
    const step = (left: number): void => {
      idle = latch.reads === seen ? idle + 1 : 0;
      seen = latch.reads;
      if (latch.released || left === 0 || idle >= idleFrames) {
        target.pressed = false;
        target.value = 0;
        Object.assign(latch, { button: -1, frame: null, released: true });
        resolve();
        return;
      }
      requestAnimationFrame(() => step(left - 1));
    };
    requestAnimationFrame(() => step(maxFrames));
  });
}

/** Replaces navigator.getGamepads with one standard pad (call before the page loads); returns its driver. */
export async function stubGamepad(page: Page): Promise<PadDriver> {
  await page.addInitScript(installStub, [STANDARD_BUTTON_COUNT, AXIS_COUNT] as const);
  return {
    press: (button: number): Promise<void> => page.evaluate(pressInPage, [button, PRESS_WAIT_FRAMES, IDLE_RELEASE_FRAMES] as const),
    hold: (axis: number, value: number): Promise<void> => page.evaluate(([a, v]) => {
      (window as unknown as StubWindow).__navPad.axes[a] = v;
    }, [axis, value] as const),
  };
}
