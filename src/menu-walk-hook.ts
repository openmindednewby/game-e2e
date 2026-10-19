import type { Page } from '@playwright/test';
import { MENU_WALK_HOOK, type MenuWalkHook } from '@dloizides/game-input';
import { DESKTOP_SIZE, PHONE_SIZE, type Size } from './devices';
import { type PadDriver, stubGamepad } from './gamepad-stub';
import { type Driver, driverFor } from './menu-walk-driver';
import { exploreFocus, type FocusGraph, type FocusMachine } from './menu-walk-graph';
import { WALK_INPUTS, type WalkInput, type WalkResult, renderWalk, walkFailed } from './menu-walk-report';

export interface HookScreen {
  name: string;
  /** Items deliberately not walkable, each with a reason (printed in the report). */
  exempt?: ReadonlyArray<{ item: string; reason: string }>;
  /** Escape / B must leave the screen. Default true; false for a root screen with nowhere to go. */
  leaves?: boolean;
  /** Enter / A on `item` must open screen `to`. */
  activates?: { item: string; to: string };
}

export interface HookWalkOptions {
  screens: ReadonlyArray<string | HookScreen>;
  /** Loads the page fresh (page.goto, so the pad stub applies) and opens the named screen. */
  open: (page: Page, screen: string) => Promise<void>;
  via?: readonly WalkInput[];
  sizes?: ReadonlyArray<readonly [string, Size]>;
}

interface HookState { screen: string; items: string[]; focused: string | null }
interface Walk { page: Page; opts: HookWalkOptions; screen: HookScreen; driver: Driver; via: WalkInput }

export const HOOK_WALK_SIZES: ReadonlyArray<readonly [string, Size]> = [['phone', PHONE_SIZE], ['desktop', DESKTOP_SIZE]];

function readHook(name: string): HookState | null {
  const hook = (window as unknown as Record<string, MenuWalkHook | undefined>)[name];
  return hook === undefined ? null : { screen: hook.screen(), items: hook.items(), focused: hook.focused() };
}

const read = (page: Page): Promise<HookState | null> => page.evaluate(readHook, MENU_WALK_HOOK);

async function reopen(w: Walk): Promise<HookState | null> {
  await w.opts.open(w.page, w.screen.name);
  return read(w.page);
}

function machine(w: Walk): FocusMachine {
  return {
    press: async (d): Promise<string | null> => {
      await w.driver.dir(d);
      return (await read(w.page))?.focused ?? null;
    },
    reset: async (): Promise<string | null> => (await reopen(w))?.focused ?? null,
  };
}

async function activationProblem(w: Walk, graph: FocusGraph, target: { item: string; to: string }): Promise<string | null> {
  const steps = graph.path((await reopen(w))?.focused ?? null, target.item);
  if (steps === null) {return `cannot reach ${target.item} to activate it`;}
  for (const d of steps) {await w.driver.dir(d);}
  await w.driver.activate();
  const landed = (await read(w.page))?.screen;
  const key = w.via === WALK_INPUTS.pad ? 'A' : 'Enter';
  return landed === target.to ? null : `${key} on ${target.item} opens "${String(landed)}", expected "${target.to}"`;
}

async function actionProblems(w: Walk, graph: FocusGraph): Promise<string[]> {
  const problems: string[] = [];
  const target = w.screen.activates;
  const activation = target === undefined ? null : await activationProblem(w, graph, target);
  if (activation !== null) {problems.push(activation);}
  if (w.screen.leaves !== false) {
    await reopen(w);
    await w.driver.back();
    const key = w.via === WALK_INPUTS.pad ? 'B' : 'Escape';
    if ((await read(w.page))?.screen === w.screen.name) {problems.push(`${key} does not leave ${w.screen.name}`);}
  }
  return problems;
}

async function walkHookScreen(w: Walk, size: string): Promise<WalkResult> {
  const exempt = w.screen.exempt ?? [];
  const base = { screen: `${w.screen.name} @${size}`, via: w.via, exempt: exempt.map((e) => `${e.item}: ${e.reason}`), notes: [] };
  const first = await reopen(w);
  if (first === null) {return { ...base, reached: 0, total: 0, unreached: [], problems: [`window.${MENU_WALK_HOOK} is not installed`] };}
  const problems = first.screen === w.screen.name ? [] : [`open landed on screen "${first.screen}"`];
  const items = first.items.filter((i) => !exempt.some((e) => e.item === i));
  const graph = await exploreFocus(machine(w), first.items.length);
  const unreached = items.filter((i) => !graph.reached.has(i));
  problems.push(...await actionProblems(w, graph));
  return { ...base, reached: items.length - unreached.length, total: items.length, unreached, problems };
}

/** Walks each hook screen at each size by keys and stubbed pad; one result per screen, size and input. */
export async function walkHookMenus(page: Page, opts: HookWalkOptions): Promise<WalkResult[]> {
  const via = opts.via ?? [WALK_INPUTS.keys, WALK_INPUTS.pad];
  const pad: PadDriver | null = via.includes(WALK_INPUTS.pad) ? await stubGamepad(page) : null;
  const results: WalkResult[] = [];
  for (const [label, size] of opts.sizes ?? HOOK_WALK_SIZES) {
    await page.setViewportSize(size);
    for (const s of opts.screens) {
      const screen = typeof s === 'string' ? { name: s } : s;
      for (const v of via) {results.push(await walkHookScreen({ page, opts, screen, driver: driverFor(page, v, pad), via: v }, label));}
    }
  }
  return results;
}

/** NAV-1 gate for canvas menus: throws, naming every unreached item and problem, unless all screens walk. */
export async function expectHookMenuWalkable(page: Page, opts: HookWalkOptions): Promise<void> {
  const results = await walkHookMenus(page, opts);
  if (results.some(walkFailed)) {throw new Error(`Canvas menus not walkable by arrow keys / pad:\n${renderWalk(results)}`);}
}
