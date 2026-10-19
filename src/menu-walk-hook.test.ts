import { buildSync } from 'esbuild';
import { type Browser, chromium, type Page } from '@playwright/test';
import { expectHookMenuWalkable, type HookScreen, type HookWalkOptions } from './menu-walk-hook';

const FIXTURE_ORIGIN = 'http://nav-hook.test/';
const WALK_TIMEOUT_MS = 180000;

const engine = buildSync({
  stdin: { contents: "import { createGamepadPoller, installMenuWalkHook } from '@dloizides/game-input'; Object.assign(window, { GI: { createGamepadPoller, installMenuWalkHook } });", resolveDir: __dirname, loader: 'ts' },
  bundle: true,
  format: 'iife',
  write: false,
}).outputFiles?.[0]?.text ?? '';

const FIXTURE = `<!doctype html><html><body style="margin:0"><canvas id="c" width="320" height="240"></canvas>
<script>${engine}</script>
<script>
  const SCREENS = {
    title: { cols: 3, nav: ['play', 'options', 'credits', 'extras', 'gallery', 'quit'], hidden: ['secret'], open: { options: 'options' }, back: 'exit' },
    options: { cols: 1, nav: ['volume', 'back'], hidden: [], open: {}, back: 'title' },
    exit: { cols: 1, nav: [], hidden: [], open: {}, back: 'exit' },
  };
  let screen = new URLSearchParams(location.search).get('s') || 'title';
  let at = 0;
  const ctx = document.getElementById('c').getContext('2d');
  const draw = () => { ctx.clearRect(0, 0, 320, 240); SCREENS[screen].nav.forEach((id, i) => ctx.fillText((i === at ? '> ' : '  ') + id, 10, 20 + 16 * i)); };
  const go = (s) => { screen = s; at = 0; draw(); };
  const move = (dx, dy) => {
    const { cols, nav } = SCREENS[screen];
    const col = at % cols, row = Math.floor(at / cols), c = col + dx, r = row + dy, i = r * cols + c;
    if (c >= 0 && c < cols && r >= 0 && i < nav.length) at = i;
    draw();
  };
  const act = (a) => {
    const s = SCREENS[screen];
    if (a === 'up') move(0, -1); else if (a === 'down') move(0, 1); else if (a === 'left') move(-1, 0); else if (a === 'right') move(1, 0);
    else if (a === 'confirm' && s.open[s.nav[at]]) go(s.open[s.nav[at]]);
    else if (a === 'back') go(s.back);
  };
  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'confirm', Escape: 'back' };
  window.addEventListener('keydown', (e) => { if (KEYS[e.key]) act(KEYS[e.key]); });
  GI.createGamepadPoller({ getPads: () => navigator.getGamepads(), requestFrame: (cb) => requestAnimationFrame(cb), cancelFrame: (id) => cancelAnimationFrame(id), onAction: act }).start();
  GI.installMenuWalkHook({ screen: () => screen, items: () => [...SCREENS[screen].nav, ...SCREENS[screen].hidden], focused: () => SCREENS[screen].nav[at] ?? null });
  draw();
</script></body></html>`;

const title: HookScreen = { name: 'title', activates: { item: 'options', to: 'options' } };
const exempt: HookScreen = { ...title, exempt: [{ item: 'secret', reason: 'fixture: deliberately unreachable' }] };
const open: HookWalkOptions['open'] = async (page, screen) => {
  await page.goto(`${FIXTURE_ORIGIN}?s=${screen}`);
};

let browser: Browser;

async function fixturePage(): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.route(`${FIXTURE_ORIGIN}**`, (route) => route.fulfill({ contentType: 'text/html', body: FIXTURE }));
  return page;
}

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
});

jest.setTimeout(WALK_TIMEOUT_MS);

describe('expectHookMenuWalkable', () => {
  it('AC-NAV1-20 with the 3x2 canvas grid and the planted item exempt, keys and pad pass at phone and desktop', async () => {
    const page = await fixturePage();

    const walk = expectHookMenuWalkable(page, { screens: [exempt, 'options'], open });

    await expect(walk).resolves.toBeUndefined();
  });

  it('AC-NAV1-21 with the planted unreachable item not exempt, fails naming it', async () => {
    const page = await fixturePage();

    const walk = expectHookMenuWalkable(page, { screens: [title], open, sizes: [['phone', { width: 360, height: 640 }]] });

    await expect(walk).rejects.toThrow(/title @phone \[keys\] reached 6\/7\n {2}unreached: secret/);
  });

  it('AC-NAV1-22 when Enter on an item does not open the expected screen, fails naming it', async () => {
    const page = await fixturePage();
    const wrong: HookScreen = { ...exempt, activates: { item: 'credits', to: 'options' } };

    const walk = expectHookMenuWalkable(page, { screens: [wrong], open, via: ['keys'], sizes: [['desktop', { width: 1280, height: 720 }]] });

    await expect(walk).rejects.toThrow(/Enter on credits opens "title", expected "options"/);
  });
});
