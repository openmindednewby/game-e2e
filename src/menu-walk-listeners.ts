import type { CDPSession, Page } from '@playwright/test';
import type { ControlIdentity } from './boxes';

export interface ProbeArgs { attr: string; rootAttr: string; probeAttr: string; exempt: string[] }
interface ProbeMarks { probes: number; withProperty: number[] }
interface PointerOnly { identities: ControlIdentity[]; notes: string[] }

const POINTER_EVENTS: readonly string[] = ['click', 'pointerdown', 'pointerup'];
export const NO_CDP_NOTE = 'CDP unavailable (not Chromium): click/pointer listeners added with addEventListener were not checked; only [onclick] and handler properties were';

/** Browser-side: marks visible root elements that are no walk control, hold none and sit inside none. */
export function markProbes(a: ProbeArgs): ProbeMarks {
  const shown = (el: Element): boolean => el.getClientRects().length > 0 && el.closest('[hidden], [inert], [aria-hidden="true"]') === null && getComputedStyle(el).visibility !== 'hidden';
  const root = document.querySelector(`[${a.rootAttr}]`) ?? document.body;
  const probes = Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) => !el.hasAttribute(a.attr)
    && el.closest(`[${a.attr}]`) === null && el.querySelector(`[${a.attr}]`) === null
    && shown(el) && !a.exempt.some((s) => el.matches(s)));
  probes.forEach((el, i) => el.setAttribute(a.probeAttr, String(i)));
  const props = ['onclick', 'onpointerdown', 'onpointerup'] as const;
  return { probes: probes.length, withProperty: probes.flatMap((el, i) => (props.some((p) => typeof el[p] === 'function') ? [i] : [])) };
}

/** Browser-side: numbers the innermost flagged probes as walk controls from `start` and clears every probe mark. */
export function flagProbes([attr, probeAttr, ids, start]: readonly [string, string, number[], number]): ControlIdentity[] {
  const els = ids.flatMap((i) => Array.from(document.querySelectorAll<HTMLElement>(`[${probeAttr}="${i}"]`)));
  const innermost = els.filter((el) => !els.some((o) => o !== el && el.contains(o)));
  document.querySelectorAll(`[${probeAttr}]`).forEach((el) => el.removeAttribute(probeAttr));
  innermost.forEach((el, k) => el.setAttribute(attr, String(start + k)));
  return innermost.map((el) => ({ tag: el.tagName, id: el.id, className: el.getAttribute('class') ?? '', text: el.textContent ?? '' }));
}

/** Opens a CDP session for listener inspection, or null when the browser has none (Firefox, WebKit). */
export async function openCdp(page: Page): Promise<CDPSession | null> {
  try {
    return await page.context().newCDPSession(page);
  } catch {
    return null;
  }
}

async function listenerProbes(cdp: CDPSession, probeAttr: string, count: number): Promise<number[]> {
  const hits: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('[${probeAttr}="${i}"]')` });
    if (result.objectId === undefined) {continue;}
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    if (listeners.some((l) => POINTER_EVENTS.includes(l.type))) {hits.push(i);}
    await cdp.send('Runtime.releaseObject', { objectId: result.objectId });
  }
  return hits;
}

/** Adds pointer-only items (handler property or listener, not focusable) as walk controls numbered from `start`. */
export async function pointerOnlyControls(page: Page, cdp: CDPSession | null, args: ProbeArgs, start: number): Promise<PointerOnly> {
  const marks = await page.evaluate(markProbes, args);
  const viaListener = cdp === null ? [] : await listenerProbes(cdp, args.probeAttr, marks.probes);
  const ids = [...new Set([...marks.withProperty, ...viaListener])];
  const identities = await page.evaluate(flagProbes, [args.attr, args.probeAttr, ids, start] as const);
  return { identities, notes: cdp === null ? [NO_CDP_NOTE] : [] };
}
