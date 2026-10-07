import { expect, type Page } from '@playwright/test';

export interface FitOptions {
  cssVar?: string;
  timeout?: number;
}

export interface CanvasOptions {
  canvasSelector?: string;
  timeout?: number;
}

export const GAME_SHELL_HEIGHT_VAR = '--gs-vh';
export const DEFAULT_CANVAS_SELECTOR = 'canvas';
export const FIT_TIMEOUT_MS = 10_000;
export const CANVAS_TIMEOUT_MS = 15_000;
const MISSING_BOTTOM = 1e9;

/** Waits until the game-shell height variable on :root equals `height` px. */
export async function expectFitTo(page: Page, height: number, options: FitOptions = {}): Promise<void> {
  const cssVar = options.cssVar ?? GAME_SHELL_HEIGHT_VAR;
  await expect.poll(() => page.evaluate((v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), cssVar),
    { message: `${cssVar} never became ${String(height)}px (game-shell fit not running)`, timeout: options.timeout ?? FIT_TIMEOUT_MS })
    .toBe(`${String(height)}px`);
}

/** Waits for the canvas to follow its container to exactly `height` CSS px. */
export async function expectCanvasHeight(page: Page, height: number, options: CanvasOptions = {}): Promise<void> {
  const selector = options.canvasSelector ?? DEFAULT_CANVAS_SELECTOR;
  await expect.poll(() => page.evaluate((s) => Math.round(document.querySelector(s)?.getBoundingClientRect().height ?? -1), selector),
    { message: `canvas ${selector} never re-fit to the ${String(height)}px visible height`, timeout: options.timeout ?? CANVAS_TIMEOUT_MS })
    .toBe(height);
}

/** Waits until the canvas bottom sits inside the visible `height` (a FIT-scaled canvas may be shorter). */
export async function expectCanvasInside(page: Page, height: number, options: CanvasOptions = {}): Promise<void> {
  const selector = options.canvasSelector ?? DEFAULT_CANVAS_SELECTOR;
  await expect.poll(() => page.evaluate(({ s, missing }) => Math.round(document.querySelector(s)?.getBoundingClientRect().bottom ?? missing), { s: selector, missing: MISSING_BOTTOM }),
    { message: `canvas ${selector} never re-fit inside the ${String(height)}px visible height`, timeout: options.timeout ?? CANVAS_TIMEOUT_MS })
    .toBeLessThanOrEqual(height);
}
