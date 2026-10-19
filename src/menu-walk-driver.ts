import type { Page } from '@playwright/test';
import { STANDARD_BUTTON } from '@dloizides/game-input';
import type { PadDriver } from './gamepad-stub';
import { WALK_INPUTS, type WalkInput } from './menu-walk-report';

export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Driver { dir(d: Dir): Promise<void>; back(): Promise<void>; activate(): Promise<void> }

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
const KEYS: Record<Dir, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const PAD_BUTTONS: Record<Dir, number> = { up: STANDARD_BUTTON.dpadUp, down: STANDARD_BUTTON.dpadDown, left: STANDARD_BUTTON.dpadLeft, right: STANDARD_BUTTON.dpadRight };

export function driverFor(page: Page, via: WalkInput, pad: PadDriver | null): Driver {
  if (via === WALK_INPUTS.pad && pad !== null) {return { dir: (d) => pad.press(PAD_BUTTONS[d]), back: () => pad.press(STANDARD_BUTTON.east), activate: () => pad.press(STANDARD_BUTTON.south) };}
  return { dir: (d) => page.keyboard.press(KEYS[d]), back: () => page.keyboard.press('Escape'), activate: () => page.keyboard.press('Enter') };
}
