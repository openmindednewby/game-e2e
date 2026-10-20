import { buildSync } from 'esbuild';
import { type Browser, chromium, type Page } from '@playwright/test';
import { STANDARD_BUTTON } from '@dloizides/game-input';
import { stubGamepad, type PadDriver } from './gamepad-stub';

const FIXTURE_URL = 'http://pad-stub.test/';
const SLOW_FRAME_MS = 450;
const IDLE_FRAME_BUDGET = 4;
const TEST_TIMEOUT_MS = 60000;

const engine = buildSync({
  stdin: { contents: "import { createGamepadPoller } from '@dloizides/game-input'; Object.assign(window, { GI: { createGamepadPoller } });", resolveDir: __dirname, loader: 'ts' },
  bundle: true,
  format: 'iife',
  write: false,
}).outputFiles?.[0]?.text ?? '';

const fixture = (poll: boolean, slowMs: number): string => `<!doctype html><html><body><script>${engine}</script><script>
  window.actions = [];
  window.frames = 0;
  const tick = () => { window.frames += 1; const end = performance.now() + ${slowMs}; while (performance.now() < end) {} requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  if (${poll}) GI.createGamepadPoller({ getPads: () => navigator.getGamepads(), requestFrame: (cb) => requestAnimationFrame(cb), cancelFrame: (id) => cancelAnimationFrame(id), onAction: (a) => window.actions.push(a) }).start();
</script></body></html>`;

let browser: Browser;

async function stubbedPage(poll: boolean, slowMs = 0): Promise<{ page: Page; pad: PadDriver }> {
  const page = await (await browser.newContext()).newPage();
  await page.route(FIXTURE_URL, (route) => route.fulfill({ contentType: 'text/html', body: fixture(poll, slowMs) }));
  const pad = await stubGamepad(page);
  await page.goto(FIXTURE_URL);
  return { page, pad };
}

const pageState = (page: Page): Promise<{ actions: string[]; frames: number; pressed: boolean }> => page.evaluate(() => {
  const w = window as unknown as { actions: string[]; frames: number; __navPad: { buttons: Array<{ pressed: boolean }> } };
  return { actions: w.actions, frames: w.frames, pressed: w.__navPad.buttons.some((b) => b.pressed) };
});

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
});

jest.setTimeout(TEST_TIMEOUT_MS);

describe('stubGamepad press', () => {
  it('with every frame slower than the pad repeat delay, fires exactly one action', async () => {
    const { page, pad } = await stubbedPage(true, SLOW_FRAME_MS);

    await pad.press(STANDARD_BUTTON.dpadDown);

    expect((await pageState(page)).actions).toEqual(['down']);
  });

  it('with three presses in a row on a slow page, fires each one once and drops none', async () => {
    const { page, pad } = await stubbedPage(true, SLOW_FRAME_MS);
    const presses = [STANDARD_BUTTON.dpadDown, STANDARD_BUTTON.dpadDown, STANDARD_BUTTON.dpadUp];

    for (const b of presses) {await pad.press(b);}

    expect((await pageState(page)).actions).toEqual(['down', 'down', 'up']);
  });

  it('on an idle page with a poller, resolves within a few frames', async () => {
    const { page, pad } = await stubbedPage(true);
    const before = (await pageState(page)).frames;

    await pad.press(STANDARD_BUTTON.south);

    expect((await pageState(page)).frames - before).toBeLessThanOrEqual(IDLE_FRAME_BUDGET);
  });

  it('with no reader polling the pad, resolves and leaves the button released', async () => {
    const { page, pad } = await stubbedPage(false);

    await pad.press(STANDARD_BUTTON.south);

    expect((await pageState(page)).pressed).toBe(false);
  });
});
