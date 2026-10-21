import { expect, type Page } from '@playwright/test';
import { summariseTextFit, TEXT_FIT_TOLERANCE_PX, type StateTextFit, type TextBoxReading } from './text-fit-report';

export const TEXT_FIT_SELECTOR = 'body *';

/** A UI state to measure: `enter` puts the page into it (seed a save, open a screen, swap a label). */
export interface TextFitState {
  name: string;
  enter: (page: Page) => Promise<void>;
}

export interface TextFitOptions {
  states?: readonly TextFitState[];
  where?: string;
  tolerancePx?: number;
}

/** Reads every visible element under `selector` that holds its own text, with the box of the block it sits in. */
export async function readTextBoxes(page: Page, selector = TEXT_FIT_SELECTOR): Promise<TextBoxReading[]> {
  return page.evaluate((sel) => {
    const display = (el: Element): string => getComputedStyle(el).display;
    const ownText = (el: Element): string => [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent ?? '').join('').trim();
    const shown = (el: Element): boolean => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && el.closest('[aria-hidden="true"]') === null;
    };
    const scrolls = (el: Element): boolean => /auto|scroll/.test(getComputedStyle(el).overflowX + getComputedStyle(el).overflowY);
    const container = (el: Element): Element | null => {
      let p = el.parentElement;
      while (p && (display(p) === 'inline' || display(p) === 'contents')) {p = p.parentElement;}
      return p;
    };
    const label = (el: Element): string => {
      const id = el.id !== '' ? `#${el.id}` : '';
      const cls = typeof el.className === 'string' && el.className.trim() !== '' ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
      return `${el.tagName.toLowerCase()}${id}${cls}`;
    };
    const els = [...document.querySelectorAll(sel)].filter((el) => !(el instanceof SVGElement) && ownText(el) !== '' && shown(el));
    return els.flatMap((el) => {
      const parent = container(el);
      if (!parent || parent === document.body || parent === document.documentElement || scrolls(parent)) {return [];}
      const r = el.getBoundingClientRect();
      const p = parent.getBoundingClientRect();
      return [{
        name: label(el), text: ownText(el).slice(0, 40), inline: display(el) === 'inline',
        clientWidth: el.clientWidth, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight,
        left: r.left, top: r.top, right: r.right, bottom: r.bottom,
        parentLeft: p.left, parentTop: p.top, parentRight: p.right, parentBottom: p.bottom,
      }];
    });
  }, selector);
}

/** Measures every given state (or the current page) and returns the per-state readings; asserts nothing. */
export async function measureTextFit(page: Page, selector = TEXT_FIT_SELECTOR, states?: readonly TextFitState[]): Promise<StateTextFit[]> {
  if (!states || states.length === 0) {return [{ state: 'current', readings: await readTextBoxes(page, selector) }];}
  const out: StateTextFit[] = [];
  for (const s of states) {
    await s.enter(page);
    out.push({ state: s.name, readings: await readTextBoxes(page, selector) });
  }
  return out;
}

/** Fails when any visible text under `selector` is larger than its box or spills its parent, in any given UI state. */
export async function expectTextFits(page: Page, selector = TEXT_FIT_SELECTOR, options: TextFitOptions = {}): Promise<StateTextFit[]> {
  const measured = await measureTextFit(page, selector, options.states);
  const summary = summariseTextFit(measured, options.where ?? selector, options.tolerancePx ?? TEXT_FIT_TOLERANCE_PX);
  expect(summary.problems, summary.message).toBe(0);
  return measured;
}
