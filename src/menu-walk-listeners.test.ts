import { buildSync } from 'esbuild';
import { type Browser, chromium, type Page } from '@playwright/test';
import { desktop } from './devices';
import { walkMenus, type WalkScreen } from './menu-walk';

const FIXTURE_URL = 'http://nav-listen.test/';
const WALK_TIMEOUT_MS = 120000;

const engine = buildSync({
  stdin: { contents: "import { createMenuNav } from '@dloizides/game-input'; Object.assign(window, { GI: { createMenuNav } });", resolveDir: __dirname, loader: 'ts' },
  bundle: true,
  format: 'iife',
  write: false,
}).outputFiles?.[0]?.text ?? '';

const fixture = (setup: string): string => `<!doctype html><html><head><style>
  button, .item { display: block; width: 200px; height: 44px; margin: 8px; }
</style></head><body>
<div id="menu"><button id="a">A</button><button id="b">B</button><div class="item" id="plant">Plant</div><div class="item" id="hiddenPlant" hidden>Hidden</div></div>
<script>${engine}</script>
<script>
  GI.createMenuNav({ baseRoot: () => document.getElementById('menu') });
  const plant = document.getElementById('plant');
  const hiddenPlant = document.getElementById('hiddenPlant');
  const menu = document.getElementById('menu');
  ${setup}
  document.getElementById('a').focus();
</script></body></html>`;

const HANDLER_KINDS: ReadonlyArray<readonly [string, string]> = [
  ['an onclick property', 'plant.onclick = () => {};'],
  ['an onpointerdown property', 'plant.onpointerdown = () => {};'],
  ['a click listener', "plant.addEventListener('click', () => {});"],
  ['a pointerdown listener', "plant.addEventListener('pointerdown', () => {});"],
  ['a pointerup listener', "plant.addEventListener('pointerup', () => {});"],
];

let browser: Browser;

async function fixturePage(setup: string): Promise<Page> {
  const context = await browser.newContext(desktop());
  const page = await context.newPage();
  await page.route(FIXTURE_URL, (route) => route.fulfill({ contentType: 'text/html', body: fixture(setup) }));
  return page;
}

const menuScreen: WalkScreen = { name: 'menu', open: async (page) => { await page.goto(FIXTURE_URL); } };

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser.close();
});

jest.setTimeout(WALK_TIMEOUT_MS);

describe('walkMenus pointer-only detection', () => {
  it.each(HANDLER_KINDS)('with %s on a plain div, reports the div unreached', async (_kind, setup) => {
    const page = await fixturePage(setup);

    const [result] = await walkMenus(page, [menuScreen], { via: ['keys'] });

    expect(result?.unreached).toEqual([expect.stringContaining('plant')]);
  });

  it('with a click listener delegated on the menu container, flags neither the container nor its children', async () => {
    const page = await fixturePage("menu.addEventListener('click', () => {});");

    const [result] = await walkMenus(page, [menuScreen], { via: ['keys'] });

    expect({ unreached: result?.unreached, total: result?.total }).toEqual({ unreached: [], total: 2 });
  });

  it('with a click listener on a hidden div, does not flag it', async () => {
    const page = await fixturePage("hiddenPlant.addEventListener('click', () => {});");

    const [result] = await walkMenus(page, [menuScreen], { via: ['keys'] });

    expect(result?.unreached).toEqual([]);
  });

  it('with CDP unavailable, still flags a property handler and notes that listeners were not checked', async () => {
    const page = await fixturePage("plant.onclick = () => {}; document.getElementById('b').addEventListener('click', () => {});");
    jest.spyOn(page.context(), 'newCDPSession').mockRejectedValue(new Error('no CDP'));

    const [result] = await walkMenus(page, [menuScreen], { via: ['keys'] });

    expect({ unreached: result?.unreached, notes: result?.notes }).toEqual({ unreached: [expect.stringContaining('plant')], notes: [expect.stringContaining('addEventListener')] });
  });
});
