import type { GateSummary } from './types';

export const MIN_TARGET_PX = 44;
export const MAX_REPORTED = 12;

export interface TargetFinding {
  idx: number;
  selector: string;
  width: number;
  height: number;
  reason: string;
  name: string;
}

export interface TargetProbeFunnel {
  raw: number;
  afterWrapper: number;
  kept: number;
}

/** One route's touch-target reading; `probe` makes a zero attributable (raw -> afterWrapper -> kept -> total). */
export interface TargetAudit {
  total: number;
  undersized: TargetFinding[];
  unlabelled: TargetFinding[];
  probe: TargetProbeFunnel;
}

/** One route's reading. `total === 0` is a broken probe for that route, never a clean route. */
export interface RouteAudit {
  route: string;
  audit: TargetAudit;
}

export function renderFindings(findings: readonly TargetFinding[], alsoIn: ReadonlySet<number>, alsoLabel: string): string {
  if (findings.length === 0) {
    return 'none';
  }
  const shown = findings.slice(0, MAX_REPORTED)
    .map((f) => `${f.selector} ${String(f.width)}x${String(f.height)} via=${f.reason} name="${f.name}"`
      + (alsoIn.has(f.idx) ? ` [ALSO ${alsoLabel}]` : ''));
  const rest = findings.length - shown.length;
  return shown.join('; ') + (rest > 0 ? ` (+${String(rest)} more)` : '');
}

export function renderRouteAudit({ route, audit }: RouteAudit, minPx: number): string {
  if (audit.total === 0) {
    return `\n  ${route}: PROBE FOUND NO INTERACTIVE TARGETS - the probe is broken, or the route loaded blank.`
      + ' NOT a clean route.'
      + ` [funnel: raw=${String(audit.probe.raw)} -> afterWrapper=${String(audit.probe.afterWrapper)}`
      + ` -> outermost=${String(audit.probe.kept)}]`;
  }
  const undersizedIdx = new Set(audit.undersized.map((f) => f.idx));
  const unlabelledIdx = new Set(audit.unlabelled.map((f) => f.idx));
  const both = audit.unlabelled.filter((f) => undersizedIdx.has(f.idx)).length;
  return `\n  ${route}: ${String(audit.undersized.length)} of ${String(audit.total)} under ${String(minPx)}px`
    + `; ${String(audit.unlabelled.length)} of ${String(audit.total)} with NO role and NO accessible name`
    + `; ${String(both)} BOTH`
    + `\n    UNDERSIZED (<${String(minPx)}px): ${renderFindings(audit.undersized, unlabelledIdx, 'unlabelled')}`
    + `\n    UNLABELLED (no role, no name): ${renderFindings(audit.unlabelled, undersizedIdx, 'undersized')}`;
}

export function routeProblems({ audit }: RouteAudit): number {
  if (audit.total === 0) {
    return 1;
  }
  return audit.undersized.length + audit.unlabelled.length;
}

/** Folds every route and both claims (size, label) into one tally; no routes at all is itself a problem. */
export function summariseTouchTargets(readings: readonly RouteAudit[], portal: string, minPx = MIN_TARGET_PX): GateSummary {
  if (readings.length === 0) {
    return { problems: 1, message: `${portal}: no routes were measured at all` };
  }
  const sum = (pick: (r: RouteAudit) => number): number => readings.reduce((n, r) => n + pick(r), 0);
  const blank = readings.filter((r) => r.audit.total === 0).length;
  const message = `${portal}: ${String(readings.length)} route(s), ${String(sum((r) => r.audit.total))} targets`
    + `; ${String(sum((r) => r.audit.undersized.length))} under ${String(minPx)}px`
    + `; ${String(sum((r) => r.audit.unlabelled.length))} with NO role and NO accessible name`
    + `; ${String(blank)} route(s) read ZERO targets`
    + readings.map((r) => renderRouteAudit(r, minPx)).join('');
  return { problems: sum(routeProblems), message };
}
