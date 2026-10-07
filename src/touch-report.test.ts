import { renderFindings, summariseTouchTargets, type RouteAudit, type TargetFinding } from './touch-report';

const finding = (idx: number, width = 30, height = 30): TargetFinding => ({ idx, selector: `div[t${String(idx)}]`, width, height, reason: 'handler', name: '' });
const route = (name: string, total: number, undersized: TargetFinding[] = [], unlabelled: TargetFinding[] = []): RouteAudit => ({
  route: name,
  audit: { total, undersized, unlabelled, probe: { raw: total, afterWrapper: total, kept: total } },
});

describe('summariseTouchTargets', () => {
  it('with no routes measured, reports one problem', () => {
    const result = summariseTouchTargets([], 'surge');

    expect(result).toEqual({ problems: 1, message: 'surge: no routes were measured at all' });
  });

  it('with a route that read zero targets, counts it as a broken probe, not a clean route', () => {
    const readings = [route('/', 3), route('/blank', 0)];

    const result = summariseTouchTargets(readings, 'aurora');

    expect([result.problems, result.message.includes('/blank: PROBE FOUND NO INTERACTIVE TARGETS')]).toEqual([1, true]);
  });

  it('with one control both undersized and unlabelled, counts both claims and marks the overlap', () => {
    const f = finding(0);

    const result = summariseTouchTargets([route('/', 2, [f], [f])], 'morphe');

    expect([result.problems, result.message.includes('1 BOTH'), result.message.includes('[ALSO unlabelled]')]).toEqual([2, true, true]);
  });

  it('with every target clean, reports zero problems', () => {
    const result = summariseTouchTargets([route('/', 5)], 'surge', 48);

    expect([result.problems, result.message.includes('under 48px')]).toEqual([0, true]);
  });
});

describe('renderFindings', () => {
  it('with more findings than the report cap, lists twelve and counts the rest', () => {
    const findings = Array.from({ length: 15 }, (_, i) => finding(i));

    const result = renderFindings(findings, new Set(), 'x');

    expect(result.endsWith('(+3 more)')).toBe(true);
  });
});
