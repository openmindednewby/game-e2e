import { buildSync } from 'esbuild';
import { type Browser, type BrowserContextOptions, chromium, type Page } from '@playwright/test';
import { desktop, phone } from './devices';
import { expectMenuWalkable, walkMenus, type WalkScreen } from './menu-walk';

const FIXTURE_URL = 'http://nav-walk.test/';
const WALK_TIMEOUT_MS = 120000;
const PRESSES_PER_CONTROL = 4;
const EXEMPT_FIXTURE_CONTROLS = 4;

const engine = buildSync({
  stdin: { contents: "import { createMenuNav, createGamepadPoller } from '@dloizides/game-input'; Object.assign(window, { GI: { createMenuNav, createGamepadPoller } });", resolveDir: __dirname, loader: 'ts' },
  bundle: true,
  format: 'iife',
  write: false,
}).outputFiles?.[0]?.text ?? '';

const FIXTURE = `<!doctype html><html><head><style>
  button, input, textarea, .item { display: block; width: 200px; height: 44px; margin: 8px; }
</style></head><body>
<div id="menu"><button id="open">Open settings</button><button id="other">Other</button></div>
<div id="dlg" role="dialog" aria-modal="true" hidden>
  <button id="close">Close</button>
  <input id="vol" type="range" min="0" max="10" value="5">
  <textarea id="paste"></textarea>
  <div class="item" id="divItem" onclick="void 0">Div item</div>
  <button id="ghost" style="display:none">Ghost</button>
  <button id="last">Last</button>
</div>
<script>${engine}</script>
<script>
  const dlg = document.getElementById('dlg');
  dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') dlg.hidden = true; e.stopPropagation(); });
  const nav = GI.createMenuNav({ baseRoot: () => document.getElementById('menu') });
  GI.createGamepadPoller({ getPads: () => navigator.getGamepads(), requestFrame: (cb) => requestAnimationFrame(cb), cancelFrame: (id) => cancelAnimationFrame(id), onAction: (a) => nav.pad(a) }).start();
  window.openSettings = () => { dlg.hidden = false; };
</script></body></html>`;

const settings: WalkScreen = {
  name: 'settings dialog',
  open: async (page) => {
    await page.goto(FIXTURE_URL);
    await page.evaluate(() => (window as unknown as { openSettings: () => void }).openSettings());
  },
};
const settingsExempt: WalkScreen = { ...settings, exempt: [{ selector: '#divItem', reason: 'fixture: deliberate non-focusable item' }] };
const SIZES: ReadonlyArray<readonly [string, BrowserContextOptions]> = [['phone', phone()], ['desktop', desktop()]];

let browser: Browser;
const pages: Page[] = [];

async function fixturePage(use: BrowserContextOptions): Promise<Page> {
  const context = await browser.newContext(use);
  const page = await context.newPage();
  await page.route(FIXTURE_URL, (route) => route.fulfill({ contentType: 'text/html', body: FIXTURE }));
  pages.push(page);
  return page;
}

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
});

jest.setTimeout(WALK_TIMEOUT_MS);

describe('walkMenus', () => {
  it('AC-NAV1-01 with the fixture dialog walked by arrow keys, reports exactly the div[onclick] item and no problem', async () => {
    const page = await fixturePage(desktop());

    const [result] = await walkMenus(page, [settings], { via: ['keys'] });

    expect({ unreached: result?.unreached, problems: result?.problems }).toEqual({ unreached: [expect.stringContaining('divItem')], problems: [] });
  });

  it('AC-NAV1-02 with the fixture dialog walked by a stubbed pad, reports exactly the div[onclick] item and no problem', async () => {
    const page = await fixturePage(desktop());

    const [result] = await walkMenus(page, [settings], { via: ['pad'] });

    expect({ unreached: result?.unreached, problems: result?.problems }).toEqual({ unreached: [expect.stringContaining('divItem')], problems: [] });
  });
});

describe('expectMenuWalkable', () => {
  it.each(SIZES)('AC-NAV1-10 at %s, with the div exempt, keys and pad both pass', async (_name, use) => {
    const page = await fixturePage(use);

    const walk = expectMenuWalkable(page, [settingsExempt]);

    await expect(walk).resolves.toBeUndefined();
  });

  it.each(SIZES)('AC-NAV1-10 at %s, without the exemption, fails naming the div', async (_name, use) => {
    const page = await fixturePage(use);

    const walk = expectMenuWalkable(page, [settings]);

    await expect(walk).rejects.toThrow(/unreached: .*divItem/);
  });
});

function countCalls(page: Page): Map<string, number> {
  const calls = new Map<string, number>();
  const count = (name: string): void => { calls.set(name, (calls.get(name) ?? 0) + 1); };
  const evaluate = page.evaluate.bind(page) as (...a: unknown[]) => Promise<unknown>;
  const press = page.keyboard.press.bind(page.keyboard);
  Object.assign(page, { evaluate: (...a: unknown[]) => { count(typeof a[0] === 'function' ? a[0].name : 'anon'); return evaluate(...a); } });
  Object.assign(page.keyboard, { press: (key: string, o?: object) => { count('key'); return press(key, o); } });
  return calls;
}

describe('walkMenus speed', () => {
  it('with every control reached by arrow keys, stops pressing before 4 presses per control', async () => {
    const page = await fixturePage(desktop());
    const calls = countCalls(page);

    await walkMenus(page, [settingsExempt], { via: ['keys'] });

    expect(calls.get('key') ?? 0).toBeLessThan(PRESSES_PER_CONTROL * EXEMPT_FIXTURE_CONTROLS);
  });

  it('with the pad walk, focuses, presses and reads each step in one page round trip', async () => {
    const page = await fixturePage(desktop());
    const calls = countCalls(page);

    const [result] = await walkMenus(page, [settingsExempt], { via: ['pad'] });

    expect({ reached: result?.reached, activeReads: calls.get('activeWalkId') ?? 0, pressBelowCap: (calls.get('pressInPage') ?? 0) < PRESSES_PER_CONTROL * EXEMPT_FIXTURE_CONTROLS })
      .toEqual({ reached: EXEMPT_FIXTURE_CONTROLS, activeReads: 1, pressBelowCap: true });
  });
});
