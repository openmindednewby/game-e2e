import { canvasBoxToPage, controlName, findOverlaps, findOverlapsWithin, overlaps } from './boxes';
import type { Box } from './types';

const box = (name: string, left: number, top: number, right: number, bottom: number): Box => ({ name, left, top, right, bottom });

describe('overlaps', () => {
  it('with boxes that only share an edge, returns false', () => {
    const a = box('a', 0, 0, 10, 10);
    const b = box('b', 10, 0, 20, 10);

    const result = overlaps(a, b);

    expect(result).toBe(false);
  });

  it('with boxes that intersect by one pixel, returns true', () => {
    const a = box('a', 0, 0, 10, 10);
    const b = box('b', 9, 9, 20, 20);

    const result = overlaps(a, b);

    expect(result).toBe(true);
  });

  it('with one box above the other, returns false', () => {
    const a = box('a', 0, 0, 10, 10);
    const b = box('b', 0, 20, 10, 30);

    const result = overlaps(a, b);

    expect(result).toBe(false);
  });
});

describe('findOverlaps', () => {
  it('with the same box in both lists, never pairs it with itself', () => {
    const a = box('a', 0, 0, 10, 10);
    const b = box('b', 5, 5, 15, 15);

    const hits = findOverlaps([a, b], [a]);

    expect(hits.map(([x, y]) => `${x.name}-${y.name}`)).toEqual(['b-a']);
  });
});

describe('findOverlapsWithin', () => {
  it('with two of three boxes intersecting, reports that pair once', () => {
    const boxes = [box('a', 0, 0, 10, 10), box('b', 5, 5, 15, 15), box('c', 100, 100, 110, 110)];

    const hits = findOverlapsWithin(boxes);

    expect(hits.map(([x, y]) => `${x.name}-${y.name}`)).toEqual(['a-b']);
  });
});

describe('canvasBoxToPage', () => {
  it('with a canvas drawn at twice its logical width, scales and offsets the rect', () => {
    const frame = { left: 10, top: 20, width: 800, logicalWidth: 400 };

    const result = canvasBoxToPage(frame, { x: 5, y: 5, width: 10, height: 10 }, 'btn');

    expect(result).toEqual({ name: 'btn', left: 20, top: 30, right: 40, bottom: 50 });
  });

  it('with a rect half inside a scroll band, clips it to the band', () => {
    const frame = { left: 0, top: 0, width: 100, logicalWidth: 100 };

    const result = canvasBoxToPage(frame, { x: 0, y: 40, width: 10, height: 20 }, 'row', [0, 50]);

    expect(result).toEqual({ name: 'row', left: 0, top: 40, right: 10, bottom: 50 });
  });

  it('with a rect wholly outside the scroll band, returns null', () => {
    const frame = { left: 0, top: 0, width: 100, logicalWidth: 100 };

    const result = canvasBoxToPage(frame, { x: 0, y: 60, width: 10, height: 20 }, 'row', [0, 50]);

    expect(result).toBeNull();
  });
});

describe('controlName', () => {
  it('with an id, names the control by tag, id and its text', () => {
    const control = { tag: 'BUTTON', id: 'play', className: 'big', text: '  Play now  ' };

    const result = controlName(control);

    expect(result).toBe('button#play:Play now');
  });

  it('without an id, uses the first class and truncates the text to 12 characters', () => {
    const control = { tag: 'A', id: '', className: ' nav-link active', text: 'Leaderboard of the week' };

    const result = controlName(control);

    expect(result).toBe('a.nav-link:Leaderboard ');
  });
});
