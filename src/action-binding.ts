import { expect, type Page } from '@playwright/test';
import { summariseActionBinding, type ActionReading } from './action-binding-report';

export const ACTION_ATTR = 'data-gi-action';
export const PROMPT_ATTR = 'data-gi-prompt';
export const POINTER_SELECTOR = 'button, a[href], [role="button"], [onclick]';
export const ACTION_ROOT_SELECTOR = 'body';

/** One action's current key, pad button and the prompt label the active device should show. */
export interface ActionBinding {
  key: string | null;
  pad: number | null;
  prompt?: string | null;
}

export type ActionBindings = Readonly<Record<string, ActionBinding | undefined>>;

/** What the page shows for one element, before it is joined with the bindings. */
export interface ActionElement {
  name: string;
  action: string | null;
  hasPointerHandler: boolean;
  promptText: string | null;
}

export interface ActionBindingOptions {
  root?: string;
  pointerSelector?: string;
  where?: string;
}

/** Joins one element with its action's binding; an action missing from `bindings` reads as unbound. */
export function toActionReading(el: ActionElement, bindings: ActionBindings): ActionReading {
  const b = el.action === null ? undefined : bindings[el.action];
  return { ...el, key: b?.key ?? null, pad: b?.pad ?? null, expectedPromptText: b?.prompt ?? null };
}

/** Reads every visible clickable or `data-gi-action` element under `root`, with its visible prompt text. */
export async function readActionElements(page: Page, root = ACTION_ROOT_SELECTOR, pointerSelector = POINTER_SELECTOR): Promise<ActionElement[]> {
  return page.evaluate(({ rootSel, pointerSel, actionAttr, promptAttr }) => {
    const shown = (el: Element): boolean => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && el.closest('[aria-hidden="true"]') === null;
    };
    const label = (el: Element): string => {
      const id = el.id !== '' ? `#${el.id}` : '';
      const tag = el.getAttribute(actionAttr);
      const suffix = tag !== null && id === '' ? `[${actionAttr}=${tag}]` : '';
      return `${el.tagName.toLowerCase()}${id}${suffix}`;
    };
    const prompt = (el: Element): string | null => {
      const p = el.hasAttribute(promptAttr) ? el : el.querySelector(`[${promptAttr}]`);
      return p !== null && shown(p) ? (p.textContent ?? '').trim() : null;
    };
    const roots = [...document.querySelectorAll(rootSel)];
    const els = new Set(roots.flatMap((r) => [...r.querySelectorAll(`${pointerSel}, [${actionAttr}]`)]));
    return [...els].filter(shown).map((el) => ({
      name: label(el), action: el.getAttribute(actionAttr), hasPointerHandler: el.matches(pointerSel), promptText: prompt(el),
    }));
  }, { rootSel: root, pointerSel: pointerSelector, actionAttr: ACTION_ATTR, promptAttr: PROMPT_ATTR });
}

/** Reads the page and joins each element with `bindings`; asserts nothing. */
export async function measureActionBinding(page: Page, bindings: ActionBindings, options: ActionBindingOptions = {}): Promise<ActionReading[]> {
  const els = await readActionElements(page, options.root, options.pointerSelector);
  return els.map((el) => toActionReading(el, bindings));
}

/** Fails on an untagged clickable, an action without key or pad, a stale prompt, or zero elements read. */
export async function expectActionsBound(page: Page, bindings: ActionBindings, options: ActionBindingOptions = {}): Promise<ActionReading[]> {
  const readings = await measureActionBinding(page, bindings, options);
  const summary = summariseActionBinding(readings, options.where ?? options.root ?? ACTION_ROOT_SELECTOR);
  expect(summary.problems, summary.message).toBe(0);
  return readings;
}
