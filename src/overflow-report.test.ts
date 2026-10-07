import { summariseOverflow, toOverflowReading, type RouteOverflow } from './overflow-report';

const metrics = { scrollWidth: 360, visualViewportWidth: 360, innerWidth: 360, clientWidth: 360 };

describe('toOverflowReading', () => {
  it('with a transition layer widening the layout viewport, reports the overflow and the drift', () => {
    const m = { ...metrics, scrollWidth: 385, innerWidth: 385, clientWidth: 385 };

    const result = toOverflowReading(m);

    expect([result.overflowPx, result.layoutViewportDrift]).toEqual([25, 25]);
  });

  it('with clientWidth narrower than the visual viewport, measures against clientWidth', () => {
    const m = { ...metrics, scrollWidth: 360, clientWidth: 345 };

    const result = toOverflowReading(m);

    expect(result.overflowPx).toBe(15);
  });

  it('with a fractional visual viewport width, rounds it up before comparing', () => {
    const m = { ...metrics, visualViewportWidth: 359.4 };

    const result = toOverflowReading(m);

    expect(result.overflowPx).toBe(0);
  });
});

describe('summariseOverflow', () => {
  it('with no routes measured, reports one problem', () => {
    const result = summariseOverflow([], 'surge');

    expect(result.problems).toBe(1);
  });

  it('with one of two routes scrolling sideways, counts it and names the worst overflow', () => {
    const readings: RouteOverflow[] = [
      { route: '/', reading: toOverflowReading(metrics) },
      { route: '/shop', reading: toOverflowReading({ ...metrics, scrollWidth: 385 }) },
    ];

    const result = summariseOverflow(readings, 'aurora');

    expect([result.problems, result.message.includes('worst overflow 25px'), result.message.includes('/shop: OVERFLOWS by 25px')]).toEqual([1, true, true]);
  });
});
