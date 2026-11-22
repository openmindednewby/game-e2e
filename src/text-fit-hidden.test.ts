import { type Browser, chromium, type Page } from '@playwright/test';
import { readTextBoxes } from './text-fit';

const BROWSER_TIMEOUT_MS = 60000;

const SR_ONLY = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0';
const FIXTURE = `<!doctype html><html><body>
<div style="width:300px"><table><caption id="srcap" style="${SR_ONLY}">Plan comparison across every tier and feature row</caption><tr><td>A</td></tr></table></div>
<div style="width:300px"><span id="srspan" style="${SR_ONLY}">Included in this plan</span>Yes</div>
<div style="width:300px"><span id="clippath" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap">Hidden by clip path text</span></div>
<div style="width:40px"><div id="spill" style="width:40px;white-space:nowrap;overflow:hidden">Visible text that overflows its box</div></div>
</body></html>`;

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

describe('readTextBoxes', () => {
  it('with text clipped to a 1px box, skips it', async () => {
    const selector = 'body *';

    const readings = await readTextBoxes(page, selector);

    expect(readings.map((r) => r.name).filter((n) => /srcap|srspan|clippath/.test(n))).toEqual([]);
  });

  it('with visible text that overflows its box, still reads it', async () => {
    const selector = 'body *';

    const readings = await readTextBoxes(page, selector);

    expect(readings.map((r) => r.name)).toContain('div#spill');
  });
});
