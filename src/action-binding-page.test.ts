import { type Browser, chromium, type Page } from '@playwright/test';
import { measureActionBinding } from './action-binding';
import { summariseActionBinding } from './action-binding-report';

const BROWSER_TIMEOUT_MS = 60000;

const FIXTURE = `<!doctype html><html><body>
<div id="hud">
  <button id="thunder" data-gi-action="thunder">Thunder <span data-gi-prompt>T</span></button>
  <button id="dash" data-gi-action="dash">Dash <span data-gi-prompt style="display:none">LB</span></button>
  <button id="mute">Mute</button>
  <div id="score">120</div>
</div>
<div id="tiny"><button id="nitro" data-gi-action="nitro">Nitro <span data-gi-prompt style="display:inline-block;width:0;height:0;overflow:hidden">N</span></button></div>
<div id="empty"></div>
</body></html>`;

const bindings = { thunder: { key: 'KeyY', pad: 6, prompt: 'Y' }, dash: { key: 'Space', pad: null, prompt: 'RB' } };

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.setContent(FIXTURE);
}, BROWSER_TIMEOUT_MS);

afterAll(async () => {
  await browser.close();
});

describe('measureActionBinding', () => {
  it('on a real page, reads clickables only and finds the stale prompt, the missing pad and the untagged button', async () => {
    const readings = await measureActionBinding(page, bindings, { root: '#hud' });

    expect(summariseActionBinding(readings, 'hud').message.split('\n').slice(1).map((l) => l.trim())).toEqual([
      'button#thunder: prompt shows "T" but the current binding is "Y"',
      'button#dash: action dash has no pad binding',
      'button#dash: prompt missing: the current binding is "RB" but no visible data-gi-prompt shows it',
      'button#mute: pointer handler but no data-gi-action',
    ]);
  });

  it('with a zero-size prompt chip on keyboard, reads it as missing and reports it', async () => {
    const readings = await measureActionBinding(page, { nitro: { key: 'KeyN', pad: 1, prompt: 'N' } }, { root: '#tiny' });

    expect(summariseActionBinding(readings, 'tiny').message).toContain('button#nitro: prompt missing');
  });

  it('on touch, where bindings carry no prompt label, a hidden chip passes', async () => {
    const readings = await measureActionBinding(page, { nitro: { key: 'KeyN', pad: 1, prompt: null } }, { root: '#tiny' });

    expect(summariseActionBinding(readings, 'tiny').problems).toBe(0);
  });

  it('with a root that holds no clickable element, reads nothing and the summary counts it as blind', async () => {
    const readings = await measureActionBinding(page, bindings, { root: '#empty' });

    expect(summariseActionBinding(readings, 'empty').problems).toBe(1);
  });
});
