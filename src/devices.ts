import { type BrowserContextOptions, devices } from '@playwright/test';

export interface Size {
  width: number;
  height: number;
}

export interface GameProject {
  name: string;
  use: BrowserContextOptions;
}

export interface GameProjectsOptions {
  phone?: Size;
  desktop?: Size;
  phoneName?: string;
  desktopName?: string;
}

export const PHONE_DEVICE = 'Galaxy S5';
export const DESKTOP_DEVICE = 'Desktop Chrome';
export const PHONE_SIZE: Size = { width: 360, height: 640 };
export const DESKTOP_SIZE: Size = { width: 1280, height: 720 };

/** A Playwright device descriptor without `defaultBrowserType`, so it can sit inside any project's `use`. */
export function deviceDescriptor(name: string): BrowserContextOptions {
  const found = devices[name];
  if (found === undefined) {
    throw new Error(`Playwright has no device descriptor named "${name}"`);
  }
  const { defaultBrowserType: _browser, ...rest } = found;
  return rest;
}

/** A touch phone (Galaxy S5 descriptor: mobile UA, touch, isMobile) resized to width x height. */
export function phone(width = PHONE_SIZE.width, height = PHONE_SIZE.height, deviceScaleFactor?: number): BrowserContextOptions {
  const base = deviceDescriptor(PHONE_DEVICE);
  return { ...base, viewport: { width, height }, screen: { width, height }, deviceScaleFactor: deviceScaleFactor ?? base.deviceScaleFactor };
}

/** A Desktop Chrome descriptor resized to width x height, scale factor 1 unless given. */
export function desktop(width = DESKTOP_SIZE.width, height = DESKTOP_SIZE.height, deviceScaleFactor = 1): BrowserContextOptions {
  const base = deviceDescriptor(DESKTOP_DEVICE);
  return { ...base, viewport: { width, height }, screen: { width, height }, deviceScaleFactor };
}

/** The phone + desktop Playwright projects every game runs its specs under. */
export function gameProjects(options: GameProjectsOptions = {}): GameProject[] {
  const p = options.phone ?? PHONE_SIZE;
  const d = options.desktop ?? DESKTOP_SIZE;
  return [
    { name: options.phoneName ?? 'phone', use: phone(p.width, p.height) },
    { name: options.desktopName ?? 'desktop', use: desktop(d.width, d.height) },
  ];
}
