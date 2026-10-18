import type { Page } from '@playwright/test';

export interface PadDriver {
  press(button: number): Promise<void>;
  hold(axis: number, value: number): Promise<void>;
}

interface StubPad { buttons: Array<{ pressed: boolean; value: number }>; axes: number[] }

export const STUB_FRAMES = 3;
const STANDARD_BUTTON_COUNT = 17;
const AXIS_COUNT = 4;

/** Replaces navigator.getGamepads with one standard pad (call before the page loads); returns its driver. */
export async function stubGamepad(page: Page): Promise<PadDriver> {
  await page.addInitScript(([buttons, axes]) => {
    const pad = { id: 'nav-walk-stub', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: new Array<number>(axes).fill(0), buttons: Array.from({ length: buttons }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.assign(window, { __navPad: pad });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad, null, null, null] });
    window.addEventListener('load', () => window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pad })));
  }, [STANDARD_BUTTON_COUNT, AXIS_COUNT] as const);
  return {
    press: (button: number): Promise<void> => page.evaluate(async ([b, n]) => {
      const pad = (window as unknown as { __navPad: StubPad }).__navPad;
      const frames = (k: number): Promise<void> => new Promise((resolve) => {
        const step = (left: number): void => {
          if (left === 0) {
            resolve();
            return;
          }
          requestAnimationFrame(() => step(left - 1));
        };
        step(k);
      });
      const target = pad.buttons[b] ?? { pressed: false, value: 0 };
      target.pressed = true;
      target.value = 1;
      await frames(n);
      target.pressed = false;
      target.value = 0;
      await frames(n);
    }, [button, STUB_FRAMES] as const),
    hold: (axis: number, value: number): Promise<void> => page.evaluate(([a, v]) => {
      (window as unknown as { __navPad: StubPad }).__navPad.axes[a] = v;
    }, [axis, value] as const),
  };
}
