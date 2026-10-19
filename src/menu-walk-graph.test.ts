import type { Dir } from './menu-walk-driver';
import { exploreFocus, type FocusMachine } from './menu-walk-graph';

const GRID = [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']];
const STEP: Record<Dir, readonly [number, number]> = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

function gridMachine(blocked: string[]): FocusMachine & { resets: number } {
  let r = 0;
  let c = 0;
  const state = {
    resets: 0,
    press: (d: Dir): Promise<string | null> => {
      const [dr, dc] = STEP[d];
      const target = GRID[r + dr]?.[c + dc];
      if (target !== undefined && !blocked.includes(target)) {
        r += dr;
        c += dc;
      }
      return Promise.resolve(GRID[r]?.[c] ?? null);
    },
    reset: (): Promise<string | null> => {
      state.resets += 1;
      r = 0;
      c = 0;
      return Promise.resolve('a');
    },
  };
  return state;
}

describe('exploreFocus', () => {
  it('with a 3x3 grid whose centre only a 2D path reaches, reaches all nine without reopening', async () => {
    const m = gridMachine([]);

    const graph = await exploreFocus(m, 9);

    expect({ reached: [...graph.reached].sort(), resets: m.resets }).toEqual({ reached: GRID.flat(), resets: 1 });
  });

  it('with the centre blocked, reports it unreached', async () => {
    const m = gridMachine(['e']);

    const graph = await exploreFocus(m, 9);

    expect(graph.reached.has('e')).toBe(false);
  });

  it('with a learned graph, returns the shortest arrow path between two items', async () => {
    const graph = await exploreFocus(gridMachine([]), 9);

    const path = graph.path('a', 'i');

    expect(path).toHaveLength(4);
  });
});
