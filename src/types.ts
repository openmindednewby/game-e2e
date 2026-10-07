import type { Page } from '@playwright/test';

export interface Box {
  name: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Region {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Anything that opens a scratch page: a `Browser` or a `BrowserContext` (e.g. `page.context()`). */
export interface PageFactory {
  newPage(): Promise<Page>;
}

/** The outcome of a whole-portal gate: zero problems passes, the message carries the per-route breakdown. */
export interface GateSummary {
  problems: number;
  message: string;
}
