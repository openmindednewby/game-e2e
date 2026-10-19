import { type Dir, DIRS } from './menu-walk-driver';

/** One menu as a black box: press a direction or reopen the screen, get back the focused item id. */
export interface FocusMachine {
  press(d: Dir): Promise<string | null>;
  reset(): Promise<string | null>;
}

export interface FocusGraph {
  reached: Set<string>;
  path(from: string | null, to: string): Dir[] | null;
}

type Edges = Map<string, Map<Dir, string | null>>;

const PRESSES_PER_ITEM = 16;

function shortestPath(edges: Edges, from: string | null, to: string): Dir[] | null {
  if (from === null) {return null;}
  const prev = new Map<string, Dir[]>([[from, []]]);
  const queue = [from];
  while (queue.length > 0) {
    const at = queue.shift() as string;
    const steps = prev.get(at) as Dir[];
    if (at === to) {return steps;}
    for (const [d, next] of edges.get(at) ?? []) {
      if (next !== null && !prev.has(next)) {
        prev.set(next, [...steps, d]);
        queue.push(next);
      }
    }
  }
  return null;
}

function pendingDir(edges: Edges, node: string): Dir | undefined {
  const out = edges.get(node);
  return out === undefined ? undefined : DIRS.find((x) => !out.has(x));
}

function nextUnexplored(edges: Edges, cur: string | null): readonly [string, Dir] | null {
  const seen = new Set<string>(cur === null ? [] : [cur]);
  const queue = cur === null ? [] : [cur];
  while (queue.length > 0) {
    const at = queue.shift() as string;
    const d = pendingDir(edges, at);
    if (d !== undefined) {return [at, d];}
    for (const next of edges.get(at)?.values() ?? []) {
      if (next !== null && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  for (const node of edges.keys()) {
    const d = pendingDir(edges, node);
    if (d !== undefined) {return [node, d];}
  }
  return null;
}

async function travel(m: FocusMachine, edges: Edges, cur: string | null, node: string): Promise<string | null> {
  let at = cur;
  let steps = shortestPath(edges, at, node);
  if (steps === null) {
    at = await m.reset();
    steps = shortestPath(edges, at, node) ?? [];
  }
  for (const d of steps) {at = await m.press(d);}
  return at;
}

/** Learns every focus transition reachable from the screen's start item, until no direction is left untried. */
export async function exploreFocus(m: FocusMachine, itemCount: number): Promise<FocusGraph> {
  const edges: Edges = new Map();
  let cur = await m.reset();
  if (cur === null) {cur = await m.press('down');}
  if (cur !== null) {edges.set(cur, new Map());}
  let budget = PRESSES_PER_ITEM * Math.max(itemCount, 1);
  for (let next = nextUnexplored(edges, cur); next !== null && budget > 0; next = nextUnexplored(edges, cur)) {
    const [node, d] = next;
    const out = edges.get(node) as Map<Dir, string | null>;
    cur = await travel(m, edges, cur, node);
    budget -= 1;
    if (cur !== node) {
      out.set(d, null);
      continue;
    }
    cur = await m.press(d);
    out.set(d, cur);
    if (cur !== null && !edges.has(cur)) {edges.set(cur, new Map());}
  }
  return { reached: new Set(edges.keys()), path: (from, to) => shortestPath(edges, from, to) };
}
