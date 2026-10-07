import { expect, type Page } from '@playwright/test';

export interface ShrinkOptions {
  relayoutGlobal?: string;
  timeout?: number;
}

export const RELAYOUT_TIMEOUT_MS = 15_000;

/** Replaces visualViewport.height before page scripts run: reads window.__gfVisibleHeight, else innerHeight. */
export async function armVisibleHeight(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (!window.visualViewport) {
      return;
    }
    const proto = Object.getPrototypeOf(window.visualViewport) as object;
    Object.defineProperty(proto, 'height', {
      configurable: true,
      get: () => (window as unknown as { __gfVisibleHeight?: number }).__gfVisibleHeight ?? window.innerHeight,
    });
  });
}

/** Drops the visible height and fires visualViewport resize; with `relayoutGlobal`, waits for every active Phaser scene to re-create. */
export async function shrinkVisibleHeight(page: Page, height: number, options: ShrinkOptions = {}): Promise<void> {
  const key = options.relayoutGlobal ?? null;
  const found = await page.evaluate(({ h, gameKey }) => {
    type Scene = { sys: { settings: { key: string } }; events: { once: (e: string, fn: () => void) => void } };
    type Game = { scene: { getScenes: (active: boolean) => Scene[] } };
    const w = window as unknown as Record<string, unknown> & { __gfVisibleHeight?: number; __gfRelaid?: Record<string, boolean> };
    let present = true;
    if (gameKey !== null) {
      const game = w[gameKey] as Game | undefined;
      present = game !== undefined;
      const relaid: Record<string, boolean> = {};
      w.__gfRelaid = relaid;
      for (const s of game?.scene.getScenes(true) ?? []) {
        const sceneKey = s.sys.settings.key;
        relaid[sceneKey] = false;
        s.events.once('create', () => {
          relaid[sceneKey] = true;
        });
      }
    }
    w.__gfVisibleHeight = h;
    window.visualViewport?.dispatchEvent(new Event('resize'));
    return present;
  }, { h: height, gameKey: key });
  if (key === null) {
    return;
  }
  if (!found) {
    throw new Error(`shrinkVisibleHeight: window.${key} is not defined, so no scene re-layout can be awaited`);
  }
  await expect.poll(() => page.evaluate(() => {
    const relaid = (window as unknown as { __gfRelaid?: Record<string, boolean> }).__gfRelaid ?? {};
    return Object.keys(relaid).filter((k) => !relaid[k]);
  }), { message: 'scenes still showing the layout of the old height', timeout: options.timeout ?? RELAYOUT_TIMEOUT_MS }).toEqual([]);
}
