import { ANTI_ALIAS_TOLERANCE, countDiff } from './pixel-diff-math';

const rgba = (...pixels: number[][]): number[] => pixels.flat();

describe('countDiff', () => {
  it('with identical buffers, reports no differing pixels and no bbox', () => {
    const a = rgba([1, 2, 3, 255], [4, 5, 6, 255]);

    const result = countDiff(a, [...a], 2);

    expect(result).toEqual({ differing: 0, total: 2, ratio: 0, bbox: 'none' });
  });

  it('at exact tolerance with one channel off by one, counts the pixel and boxes it', () => {
    const a = rgba([0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255]);
    const b = rgba([0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255], [0, 1, 0, 255]);

    const result = countDiff(a, b, 2);

    expect(result).toEqual({ differing: 1, total: 4, ratio: 0.25, bbox: '1,1-1,1' });
  });

  it('at the anti-alias tolerance, ignores a delta of 48 and counts a delta of 49', () => {
    const a = rgba([0, 0, 0, 255], [0, 0, 0, 255]);
    const b = rgba([48, 0, 0, 255], [0, 0, 49, 255]);

    const result = countDiff(a, b, 2, ANTI_ALIAS_TOLERANCE);

    expect(result.differing).toBe(1);
  });

  it('with only the alpha channel changed, reports no difference', () => {
    const a = rgba([9, 9, 9, 255]);
    const b = rgba([9, 9, 9, 0]);

    const result = countDiff(a, b, 1);

    expect(result.differing).toBe(0);
  });

  it('with empty buffers, returns a zero ratio', () => {
    const result = countDiff([], [], 1);

    expect(result.ratio).toBe(0);
  });

  it('with buffers of different length, throws', () => {
    const act = (): unknown => countDiff([0, 0, 0, 0], [], 1);

    expect(act).toThrow('differ in length');
  });

  it('with a width that does not divide the buffer into rows, throws', () => {
    const a = rgba([0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);

    const act = (): unknown => countDiff(a, [...a], 2);

    expect(act).toThrow('not whole RGBA rows');
  });
});
