export const WALK_INPUTS = { keys: 'keys', pad: 'pad' } as const;
export type WalkInput = (typeof WALK_INPUTS)[keyof typeof WALK_INPUTS];

export interface WalkResult {
  screen: string;
  via: WalkInput;
  reached: number;
  total: number;
  unreached: string[];
  problems: string[];
  exempt: string[];
}

export const walkFailed = (r: WalkResult): boolean => r.unreached.length > 0 || r.problems.length > 0;

/** One block per screen and input: reached/total, then every unreached control, problem and exemption. */
export function renderWalk(results: readonly WalkResult[]): string {
  return results.map((r) => [
    `${r.screen} [${r.via}] reached ${r.reached}/${r.total}`,
    ...r.unreached.map((n) => `  unreached: ${n}`),
    ...r.problems.map((p) => `  problem: ${p}`),
    ...r.exempt.map((e) => `  exempt: ${e}`),
  ].join('\n')).join('\n');
}
