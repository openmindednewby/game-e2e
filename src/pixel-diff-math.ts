export const EXACT = 0;
export const ANTI_ALIAS_TOLERANCE = 48;
const CHANNELS = 4;

export interface DiffResult {
  differing: number;
  total: number;
  ratio: number;
  bbox: string;
}

function at(data: ArrayLike<number>, i: number): number {
  return data[i] ?? 0;
}

function channelDelta(a: ArrayLike<number>, b: ArrayLike<number>, i: number): number {
  return Math.max(Math.abs(at(a, i) - at(b, i)), Math.abs(at(a, i + 1) - at(b, i + 1)), Math.abs(at(a, i + 2) - at(b, i + 2)));
}

/** Counts RGBA pixels whose largest RGB channel delta exceeds `tolerance` (0 = any change), with their bounding box. */
export function countDiff(a: ArrayLike<number>, b: ArrayLike<number>, width: number, tolerance = EXACT): DiffResult {
  if (a.length !== b.length) {
    throw new Error(`pixel buffers differ in length: ${String(a.length)} vs ${String(b.length)}`);
  }
  if (width <= 0 || a.length % (width * CHANNELS) !== 0) {
    throw new Error(`pixel buffer of ${String(a.length)} bytes is not whole RGBA rows of width ${String(width)}`);
  }
  const total = a.length / CHANNELS;
  let differing = 0;
  let x0 = width;
  let y0 = total / width;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0; i < a.length; i += CHANNELS) {
    if (channelDelta(a, b, i) <= tolerance) {
      continue;
    }
    differing += 1;
    const p = i / CHANNELS;
    const px = p % width;
    const py = Math.floor(p / width);
    x0 = Math.min(x0, px);
    y0 = Math.min(y0, py);
    x1 = Math.max(x1, px);
    y1 = Math.max(y1, py);
  }
  const bbox = differing > 0 ? `${String(x0)},${String(y0)}-${String(x1)},${String(y1)}` : 'none';
  return { differing, total, ratio: total === 0 ? 0 : differing / total, bbox };
}
