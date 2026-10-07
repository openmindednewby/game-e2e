import { countDiff, EXACT, type DiffResult } from './pixel-diff-math';
import type { PageFactory, Region } from './types';

export interface DiffOptions {
  tolerance?: number;
  width?: number;
  height?: number;
  regionA?: Region | null;
  regionB?: Region | null;
}

export interface RegionInput {
  png: Buffer;
  region: Region | null;
}

/** Decodes two PNGs in a scratch page and counts differing pixels; exact and same-size unless options say otherwise. */
export async function diffPngs(factory: PageFactory, a: Buffer, b: Buffer, options: DiffOptions = {}): Promise<DiffResult> {
  const scratch = await factory.newPage();
  try {
    const decoded = await scratch.evaluate(async ({ pa, pb, ra, rb, w, h }) => {
      const load = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = (): void => resolve(img);
        img.onerror = (): void => reject(new Error('image did not decode'));
        img.src = `data:image/png;base64,${src}`;
      });
      const [ia, ib] = await Promise.all([load(pa), load(pb)]);
      const unscaled = w === null && h === null && ra === null && rb === null;
      if (unscaled && (ia.naturalWidth !== ib.naturalWidth || ia.naturalHeight !== ib.naturalHeight)) {
        throw new Error(`image sizes differ: ${String(ia.naturalWidth)}x${String(ia.naturalHeight)} vs ${String(ib.naturalWidth)}x${String(ib.naturalHeight)}`);
      }
      const width = Math.max(1, Math.round(w ?? ra?.w ?? ia.naturalWidth));
      const height = Math.max(1, Math.round(h ?? ra?.h ?? ia.naturalHeight));
      const chunk = 0x8000;
      const toBase64 = (img: HTMLImageElement, r: { x: number; y: number; w: number; h: number } | null): string => {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const g = c.getContext('2d');
        if (!g) {
          throw new Error('no 2d context');
        }
        if (r) {
          g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, width, height);
        } else {
          g.drawImage(img, 0, 0, width, height);
        }
        const data = g.getImageData(0, 0, width, height).data;
        let s = '';
        for (let i = 0; i < data.length; i += chunk) {
          s += String.fromCharCode(...data.subarray(i, i + chunk));
        }
        return btoa(s);
      };
      return { width, a: toBase64(ia, ra), b: toBase64(ib, rb) };
    }, {
      pa: a.toString('base64'),
      pb: b.toString('base64'),
      ra: options.regionA ?? null,
      rb: options.regionB ?? null,
      w: options.width ?? null,
      h: options.height ?? null,
    });
    return countDiff(Buffer.from(decoded.a, 'base64'), Buffer.from(decoded.b, 'base64'), decoded.width, options.tolerance ?? EXACT);
  } finally {
    await scratch.close();
  }
}

/** Diffs a region of PNG a against a region of PNG b (null = whole image), both drawn at the same size. */
export async function regionDiff(factory: PageFactory, a: RegionInput, b: RegionInput, options: Omit<DiffOptions, 'regionA' | 'regionB'> = {}): Promise<DiffResult> {
  return diffPngs(factory, a.png, b.png, { ...options, regionA: a.region, regionB: b.region });
}
