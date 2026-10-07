import { expect, type Page } from '@playwright/test';
import { MIN_TARGET_PX, summariseTouchTargets, type RouteAudit, type TargetAudit, type TargetFinding } from './touch-report';

/** Measures every reachable pressable on the page (role OR handler OR own-origin pointer cursor, outermost wins) against `minPx`. */
export async function auditTouchTargets(page: Page, minPx = MIN_TARGET_PX): Promise<TargetAudit> {
  return page.evaluate((min) => {
    const ROLE_SEL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary,'
      + ' [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"],'
      + ' [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="option"], [role="slider"]';
    const unreachable = (el: Element, cs: CSSStyleDeclaration): boolean => {
      if (el.closest('[aria-hidden="true"]')) {
        return true;
      }
      if (el.closest('[inert]')) {
        return true;
      }
      if (cs.pointerEvents === 'none') {
        return true;
      }
      if (el.getAttribute('aria-disabled') === 'true') {
        return true;
      }
      return (el as HTMLButtonElement).disabled === true;
    };
    const why = (el: Element, cs: CSSStyleDeclaration): string | null => {
      if (el instanceof SVGElement && !el.hasAttribute('role')) {
        return null;
      }
      if (el.matches(ROLE_SEL)) {
        return 'role';
      }
      if (typeof (el as HTMLElement).onclick === 'function') {
        return 'handler';
      }
      if (el.getAttribute('data-focusable') === 'true') {
        return 'rnw-focusable';
      }
      const ti = el.getAttribute('tabindex');
      if (ti !== null && Number(ti) >= 0) {
        return 'tabindex';
      }
      if (cs.cursor === 'pointer') {
        const parent = el.parentElement;
        if (!parent || getComputedStyle(parent).cursor !== 'pointer') {
          return 'cursor-origin';
        }
      }
      return null;
    };
    const raw: { el: Element; reason: string }[] = [];
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const cs = getComputedStyle(el);
      if (unreachable(el, cs)) {
        continue;
      }
      const reason = why(el, cs);
      if (reason !== null) {
        raw.push({ el, reason });
      }
    }
    const members = new Set(raw.map((c) => c.el));
    const afterWrapper = raw.filter(({ el, reason }) => reason === 'role'
      || !Array.from(el.querySelectorAll(ROLE_SEL)).some((d) => members.has(d)));
    const survivors = new Set(afterWrapper.map((c) => c.el));
    const kept = afterWrapper.filter(({ el }) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (survivors.has(p)) {
          return false;
        }
      }
      return true;
    });
    const describe = (el: Element): string => {
      const id = el.getAttribute('data-testid') ?? el.getAttribute('id') ?? '';
      return `${el.tagName.toLowerCase()}${id ? `[${id}]` : ''}`.slice(0, 60);
    };
    const accName = (el: Element): string => {
      const aria = el.getAttribute('aria-label');
      if (aria && aria.trim()) {
        return aria.trim();
      }
      const by = el.getAttribute('aria-labelledby');
      if (by) {
        const t = by.split(/\s+/).map((i) => document.getElementById(i)?.textContent ?? '').join(' ').trim();
        if (t) {
          return t;
        }
      }
      const attr = el.getAttribute('title') ?? el.getAttribute('alt') ?? (el as HTMLInputElement).value ?? '';
      if (attr && attr.trim()) {
        return attr.trim();
      }
      return (el.textContent ?? '').trim();
    };
    const undersized: TargetFinding[] = [];
    const unlabelled: TargetFinding[] = [];
    let total = 0;
    for (const { el, reason } of kept) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || getComputedStyle(el).visibility === 'hidden') {
        continue;
      }
      const f: TargetFinding = { idx: total, selector: describe(el), width: Math.round(r.width), height: Math.round(r.height), reason, name: accName(el).slice(0, 40) };
      total += 1;
      if (r.width < min || r.height < min) {
        undersized.push(f);
      }
      const hasRole = el.matches(ROLE_SEL) || (el.getAttribute('role') ?? '') !== '';
      if (!hasRole && !f.name) {
        unlabelled.push(f);
      }
    }
    return { total, undersized, unlabelled, probe: { raw: raw.length, afterWrapper: afterWrapper.length, kept: kept.length } };
  }, minPx);
}

/** Measures one route and asserts nothing, so a route with findings cannot hide the routes after it. */
export async function auditRoute(page: Page, route: string, minPx = MIN_TARGET_PX): Promise<RouteAudit> {
  return { route, audit: await auditTouchTargets(page, minPx) };
}

/** ONE assertion per portal over every route and both claims (undersized, unlabelled); a zero-target route fails. */
export function expectTouchTargetsAcrossRoutes(readings: readonly RouteAudit[], portal: string, minPx = MIN_TARGET_PX): void {
  const summary = summariseTouchTargets(readings, portal, minPx);
  expect(summary.problems, summary.message).toBe(0);
}

/** Single-route convenience over `expectTouchTargetsAcrossRoutes`. */
export async function expectTouchTargets(page: Page, where: string, minPx = MIN_TARGET_PX): Promise<TargetAudit> {
  const reading = await auditRoute(page, where, minPx);
  expectTouchTargetsAcrossRoutes([reading], where, minPx);
  return reading.audit;
}
