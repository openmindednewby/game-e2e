import type { CDPSession, Page } from '@playwright/test';
import { DIALOG_SELECTOR, MENU_FOCUSABLE_SELECTOR } from '@dloizides/game-input';
import { controlName } from './boxes';
import { type PadDriver, stubGamepad } from './gamepad-stub';
import { DIRS, type Driver, driverFor } from './menu-walk-driver';
import { openCdp, pointerOnlyControls } from './menu-walk-listeners';
import { activeWalkId, controlValue, focusWalkId, rootOpen, scanScreen, type WalkScan } from './menu-walk-page';
import { WALK_INPUTS, type WalkInput, type WalkResult, renderWalk, walkFailed } from './menu-walk-report';

export interface WalkScreen {
  name: string;
  /** Opens the screen from a fresh page (clicks, a URL, a test hook). */
  open: (page: Page) => Promise<void>;
  /** Controls deliberately not walkable, each with a reason (printed in the report). */
  exempt?: ReadonlyArray<{ selector: string; reason: string }>;
}

export interface WalkOptions { via?: readonly WalkInput[] }

interface WalkEnv { pad: PadDriver | null; cdp: CDPSession | null }

const WALK_ATTR = 'data-walk-id';
const ROOT_ATTR = 'data-walk-root';
const PROBE_ATTR = 'data-walk-probe';
const PRESSES_PER_CONTROL = 4;

const active = (page: Page): Promise<number | null> => page.evaluate(activeWalkId, WALK_ATTR);
const focusId = (page: Page, id: number): Promise<void> => page.evaluate(focusWalkId, [WALK_ATTR, id] as const);

async function bfs(page: Page, driver: Driver, total: number): Promise<Set<number>> {
  const reached = new Set<number>();
  let start = await active(page);
  if (start === null) {
    await driver.dir('down');
    start = await active(page);
  }
  if (start === null) {return reached;}
  reached.add(start);
  const queue = [start];
  let presses = 0;
  while (queue.length > 0 && presses < PRESSES_PER_CONTROL * total) {
    const from = queue.shift() as number;
    for (const d of DIRS) {
      await focusId(page, from);
      await driver.dir(d);
      presses += 1;
      const at = await active(page);
      if (at !== null && !reached.has(at)) {
        reached.add(at);
        queue.push(at);
      }
    }
  }
  return reached;
}

async function sliderProblems(page: Page, driver: Driver, scan: WalkScan, reached: Set<number>, names: string[]): Promise<string[]> {
  const problems: string[] = [];
  for (const i of scan.sliders.filter((s) => reached.has(s))) {
    await focusId(page, i);
    const before = await page.evaluate(controlValue, [WALK_ATTR, i] as const);
    await driver.dir('right');
    const right = await page.evaluate(controlValue, [WALK_ATTR, i] as const);
    await driver.dir('left');
    const left = await page.evaluate(controlValue, [WALK_ATTR, i] as const);
    if (right === before && left === before) {problems.push(`slider ${names[i]} does not move on Left/Right`);}
  }
  return problems;
}

async function walkScreen(page: Page, screen: WalkScreen, via: WalkInput, env: WalkEnv): Promise<WalkResult> {
  const driver = driverFor(page, via, env.pad);
  const exempt = screen.exempt ?? [];
  await screen.open(page);
  const scan = await page.evaluate(scanScreen, { focusSel: MENU_FOCUSABLE_SELECTOR, dialogSel: DIALOG_SELECTOR, exempt: exempt.map((e) => e.selector), attr: WALK_ATTR, rootAttr: ROOT_ATTR });
  const pointerOnly = await pointerOnlyControls(page, env.cdp, { attr: WALK_ATTR, rootAttr: ROOT_ATTR, probeAttr: PROBE_ATTR, exempt: exempt.map((e) => e.selector) }, scan.identities.length);
  const names = [...scan.identities, ...pointerOnly.identities].map(controlName);
  const reached = await bfs(page, driver, names.length);
  const problems = scan.isDialog && !scan.focusedInRoot ? ['focus is not inside the dialog when it opens'] : [];
  problems.push(...await sliderProblems(page, driver, scan, reached, names));
  const closer = [...reached].find((i) => !scan.textFields.includes(i) && !scan.sliders.includes(i));
  if (scan.isDialog && closer !== undefined) {
    await focusId(page, closer);
    await driver.back();
    if (await page.evaluate(rootOpen, ROOT_ATTR)) {problems.push(`${via === WALK_INPUTS.pad ? 'B' : 'Escape'} does not close the dialog`);}
  }
  return { screen: screen.name, via, reached: reached.size, total: names.length, unreached: names.filter((_, i) => !reached.has(i)), problems, exempt: exempt.map((e) => `${e.selector}: ${e.reason}`), notes: pointerOnly.notes };
}

/** Walks every screen by arrow keys and by a stubbed pad (default both) and returns one result per screen and input. */
export async function walkMenus(page: Page, screens: readonly WalkScreen[], options: WalkOptions = {}): Promise<WalkResult[]> {
  const via = options.via ?? [WALK_INPUTS.keys, WALK_INPUTS.pad];
  const env: WalkEnv = { pad: via.includes(WALK_INPUTS.pad) ? await stubGamepad(page) : null, cdp: await openCdp(page) };
  const results: WalkResult[] = [];
  for (const screen of screens) {
    for (const v of via) {results.push(await walkScreen(page, screen, v, env));}
  }
  return results;
}

/** NAV-1 gate: throws, listing every unreached control and problem, unless every screen walks by keys and pad. */
export async function expectMenuWalkable(page: Page, screens: readonly WalkScreen[], options: WalkOptions = {}): Promise<void> {
  const results = await walkMenus(page, screens, options);
  if (results.some(walkFailed)) {throw new Error(`Menus not walkable by arrow keys / pad:\n${renderWalk(results)}`);}
}
