import type { GateSummary } from './types';

export interface OverflowMetrics {
  scrollWidth: number;
  visualViewportWidth: number;
  innerWidth: number;
  clientWidth: number;
}

/** `layoutViewportDrift` (innerWidth above visualViewport) is the signature of a widened layout viewport. */
export interface OverflowReading extends OverflowMetrics {
  overflowPx: number;
  layoutViewportDrift: number;
}

export interface RouteOverflow {
  route: string;
  reading: OverflowReading;
}

/** Overflow against the NARROWER of visualViewport width and clientWidth, never innerWidth (which widens with the defect). */
export function toOverflowReading(m: OverflowMetrics): OverflowReading {
  const visual = Math.ceil(m.visualViewportWidth);
  return { ...m, overflowPx: m.scrollWidth - Math.min(visual, m.clientWidth), layoutViewportDrift: m.innerWidth - visual };
}

export function renderOverflow({ route, reading: r }: RouteOverflow): string {
  const head = r.overflowPx > 0 ? `OVERFLOWS by ${String(r.overflowPx)}px` : 'ok';
  return `\n  ${route}: ${head} - scrollWidth=${String(r.scrollWidth)}`
    + ` vs visualViewport=${String(Math.ceil(r.visualViewportWidth))}`
    + ` (innerWidth=${String(r.innerWidth)}, clientWidth=${String(r.clientWidth)}`
    + `, layout-viewport drift=${String(r.layoutViewportDrift)}px)`;
}

/** Folds every route into one tally of routes that scroll sideways; no routes at all is itself a problem. */
export function summariseOverflow(readings: readonly RouteOverflow[], portal: string): GateSummary {
  if (readings.length === 0) {
    return { problems: 1, message: `${portal}: no routes were measured at all` };
  }
  const bad = readings.filter((r) => r.reading.overflowPx > 0);
  const worst = readings.reduce((n, r) => Math.max(n, r.reading.overflowPx), 0);
  const message = `${portal}: ${String(readings.length)} reading(s), ${String(bad.length)} scroll horizontally`
    + `; worst overflow ${String(worst)}px`
    + readings.map(renderOverflow).join('');
  return { problems: bad.length, message };
}
