import type { ControlIdentity } from './boxes';

export interface ScanArgs { focusSel: string; dialogSel: string; exempt: string[]; attr: string; rootAttr: string }

export interface WalkScan {
  identities: ControlIdentity[];
  isDialog: boolean;
  focusedInRoot: boolean;
  sliders: number[];
  textFields: number[];
}

/** Browser-side: marks the menu root and every candidate control (focusable selector plus [onclick]). */
export function scanScreen(a: ScanArgs): WalkScan {
  const shown = (el: Element): boolean => el.getClientRects().length > 0 && el.closest('[hidden], [inert], [aria-hidden="true"]') === null && getComputedStyle(el).visibility !== 'hidden';
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>(a.dialogSel)).filter(shown);
  const modal = dialogs.filter((d) => d.getAttribute('aria-modal') === 'true');
  const root = (modal.length > 0 ? modal : dialogs).pop() ?? document.body;
  document.querySelectorAll(`[${a.attr}], [${a.rootAttr}]`).forEach((el) => { el.removeAttribute(a.attr); el.removeAttribute(a.rootAttr); });
  root.setAttribute(a.rootAttr, '');
  const list = Array.from(root.querySelectorAll<HTMLElement>(`${a.focusSel}, [onclick]`))
    .filter((el) => shown(el) && (el as HTMLButtonElement).disabled !== true && !a.exempt.some((s) => el.matches(s)));
  list.forEach((el, i) => el.setAttribute(a.attr, String(i)));
  const nonText = ['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file', 'image'];
  const isText = (el: Element): boolean => el.tagName === 'TEXTAREA' || (el instanceof HTMLInputElement && !nonText.includes(el.type));
  const isSlider = (el: Element): boolean => (el instanceof HTMLInputElement && el.type === 'range') || el.getAttribute('role') === 'slider';
  const active = document.activeElement;
  return {
    identities: list.map((el) => ({ tag: el.tagName, id: el.id, className: el.getAttribute('class') ?? '', text: el.textContent ?? '' })),
    isDialog: root !== document.body,
    focusedInRoot: active instanceof HTMLElement && active !== root && root.contains(active),
    sliders: list.flatMap((el, i) => (isSlider(el) ? [i] : [])),
    textFields: list.flatMap((el, i) => (isText(el) ? [i] : [])),
  };
}

export function activeWalkId(attr: string): number | null {
  const v = document.activeElement?.getAttribute(attr) ?? null;
  return v === null ? null : Number(v);
}

export function focusWalkId([attr, id]: readonly [string, number]): void {
  document.querySelector<HTMLElement>(`[${attr}="${id}"]`)?.focus();
}

export function controlValue([attr, id]: readonly [string, number]): string {
  const el = document.querySelector(`[${attr}="${id}"]`);
  return el instanceof HTMLInputElement ? el.value : el?.getAttribute('aria-valuenow') ?? '';
}

export function rootOpen(rootAttr: string): boolean {
  const r = document.querySelector(`[${rootAttr}]`);
  return r !== null && r.getClientRects().length > 0 && r.closest('[hidden]') === null;
}
