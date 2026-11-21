import type { Page } from '@playwright/test';
import { STANDARD_BUTTON } from '@dloizides/game-input';
import type { PadDriver } from './gamepad-stub';
import { WALK_ATTR, activeWalkId, focusWalkId } from './menu-walk-page';
import { WALK_INPUTS, type WalkInput } from './menu-walk-report';

export type Dir = 'up' | 'down' | 'left' | 'right';
/** `move` focuses control `from`, presses `d` and returns the walk id focused after it. */
export interface Driver { dir(d: Dir): Promise<void>; move(from: number, d: Dir): Promise<number | null>; back(): Promise<void>; activate(): Promise<void> }

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
const KEYS: Record<Dir, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const PAD_BUTTONS: Record<Dir, number> = { up: STANDARD_BUTTON.dpadUp, down: STANDARD_BUTTON.dpadDown, left: STANDARD_BUTTON.dpadLeft, right: STANDARD_BUTTON.dpadRight };

export function driverFor(page: Page, via: WalkInput, pad: PadDriver | null): Driver {
  if (via === WALK_INPUTS.pad && pad !== null) {
    return { dir: (d) => pad.press(PAD_BUTTONS[d]), move: (from, d) => pad.move(PAD_BUTTONS[d], { attr: WALK_ATTR, id: from }), back: () => pad.press(STANDARD_BUTTON.east), activate: () => pad.press(STANDARD_BUTTON.south) };
  }
  const move = async (from: number, d: Dir): Promise<number | null> => {
    await page.evaluate(focusWalkId, [WALK_ATTR, from] as const);
    await page.keyboard.press(KEYS[d]);
    return page.evaluate(activeWalkId, WALK_ATTR);
  };
  return { dir: (d) => page.keyboard.press(KEYS[d]), move, back: () => page.keyboard.press('Escape'), activate: () => page.keyboard.press('Enter') };
}
