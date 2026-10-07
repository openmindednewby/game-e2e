import { expect, type Page } from '@playwright/test';
import { summariseOverflow, toOverflowReading, type OverflowReading, type RouteOverflow } from './overflow-report';

export async function readHorizontalOverflow(page: Page): Promise<OverflowReading> {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    visualViewportWidth: window.visualViewport ? window.visualViewport.width : window.innerWidth,
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  return toOverflowReading(metrics);
}

/** Measures one route and asserts nothing. */
export async function measureHorizontalOverflow(page: Page, route: string): Promise<RouteOverflow> {
  return { route, reading: await readHorizontalOverflow(page) };
}

/** Pixels the document scrolls sideways past the visible width (<= 0 means no horizontal scroll). */
export async function horizontalOverflowPx(page: Page): Promise<number> {
  return (await readHorizontalOverflow(page)).overflowPx;
}

/** ONE assertion per portal over every route, so the first overflowing route cannot hide the rest. */
export function expectNoHorizontalOverflowAcrossRoutes(readings: readonly RouteOverflow[], portal: string): void {
  const summary = summariseOverflow(readings, portal);
  expect(summary.problems, summary.message).toBe(0);
}

/** Single-route convenience over `expectNoHorizontalOverflowAcrossRoutes`. */
export async function expectNoHorizontalOverflow(page: Page, where: string): Promise<OverflowReading> {
  const r = await measureHorizontalOverflow(page, where);
  expectNoHorizontalOverflowAcrossRoutes([r], where);
  return r.reading;
}
