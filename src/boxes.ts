import type { Box, Rect } from './types';

export interface CanvasFrame {
  left: number;
  top: number;
  width: number;
  logicalWidth: number;
}

export interface ControlIdentity {
  tag: string;
  id: string;
  className: string;
  text: string;
}

export type Band = readonly [number, number];

const CONTROL_TEXT_CHARS = 12;
const OPEN_BAND: Band = [-Infinity, Infinity];

export function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Every overlapping (a, b) pair across two lists; an element never overlaps itself. */
export function findOverlaps(a: readonly Box[], b: readonly Box[]): Array<[Box, Box]> {
  const hits: Array<[Box, Box]> = [];
  for (const x of a) {
    for (const y of b) {
      if (x !== y && overlaps(x, y)) {
        hits.push([x, y]);
      }
    }
  }
  return hits;
}

/** Every overlapping pair inside one list, each pair reported once. */
export function findOverlapsWithin(boxes: readonly Box[]): Array<[Box, Box]> {
  const hits: Array<[Box, Box]> = [];
  boxes.forEach((x, i) => {
    for (const y of boxes.slice(i + 1)) {
      if (overlaps(x, y)) {
        hits.push([x, y]);
      }
    }
  });
  return hits;
}

/** Maps a game-space rect onto the page in CSS px, clipped to a scroll band; null when nothing is left. */
export function canvasBoxToPage(frame: CanvasFrame, bounds: Rect, name: string, band: Band = OPEN_BAND): Box | null {
  const scale = frame.width / frame.logicalWidth;
  const top = Math.max(bounds.y, band[0]);
  const bottom = Math.min(bounds.y + bounds.height, band[1]);
  if (bottom <= top) {
    return null;
  }
  return {
    name,
    left: frame.left + bounds.x * scale,
    top: frame.top + top * scale,
    right: frame.left + (bounds.x + bounds.width) * scale,
    bottom: frame.top + bottom * scale,
  };
}

export function controlName(c: ControlIdentity): string {
  const firstClass = c.className.trim().split(/\s+/)[0] ?? '';
  const id = c.id !== '' ? `#${c.id}` : `.${firstClass}`;
  return `${c.tag.toLowerCase()}${id}:${c.text.trim().slice(0, CONTROL_TEXT_CHARS)}`;
}
