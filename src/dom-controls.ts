import type { Page } from '@playwright/test';
import { controlName } from './boxes';
import type { Box } from './types';

export const CONTROL_SELECTOR = 'button, a[href], [role="button"]';

/** Visible, interactive DOM controls as CSS-px boxes, named tag#id or tag.class plus their text. */
export async function domControls(page: Page, selector = CONTROL_SELECTOR): Promise<Box[]> {
  const records = await page.evaluate((sel) => Array.from(document.querySelectorAll(sel))
    .filter((el) => {
      const s = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0;
    })
    .map((el) => {
      const b = el.getBoundingClientRect();
      return { tag: el.tagName, id: el.id, className: el.getAttribute('class') ?? '', text: el.textContent ?? '', left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    }), selector);
  return records.map((r) => ({ name: controlName(r), left: r.left, top: r.top, right: r.right, bottom: r.bottom }));
}
