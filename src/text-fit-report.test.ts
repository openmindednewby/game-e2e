import { summariseTextFit, textFitFindings, type TextBoxReading } from './text-fit-report';

const fits: TextBoxReading = {
  name: 'button#ov-daily', text: 'Daily run', inline: false,
  clientWidth: 200, clientHeight: 52, scrollWidth: 200, scrollHeight: 52,
  left: 10, top: 10, right: 210, bottom: 62,
  parentLeft: 0, parentTop: 0, parentRight: 300, parentBottom: 100,
};

describe('textFitFindings', () => {
  it('with content the size of its box inside its parent, finds nothing', () => {
    const result = textFitFindings(fits);

    expect(result).toEqual([]);
  });

  it('with content 30px wider than its box, reports the width overflow', () => {
    const r = { ...fits, scrollWidth: 230 };

    const result = textFitFindings(r);

    expect(result.map((f) => [f.why, f.px])).toEqual([['text wider than its box', 30]]);
  });

  it('with content taller than its box, reports the height overflow', () => {
    const r = { ...fits, scrollHeight: 70 };

    const result = textFitFindings(r);

    expect(result.map((f) => f.why)).toEqual(['text taller than its box']);
  });

  it('with an inline badge running 40px past the right edge of its button, reports the spill', () => {
    const r = { ...fits, inline: true, clientWidth: 0, scrollWidth: 0, right: 340 };

    const result = textFitFindings(r);

    expect(result.map((f) => [f.why, f.px])).toEqual([['spills out of its parent', 40]]);
  });

  it('with an inline element, ignores its zero client box', () => {
    const r = { ...fits, inline: true, clientWidth: 0, clientHeight: 0 };

    const result = textFitFindings(r);

    expect(result).toEqual([]);
  });

  it('with a subpixel overhang inside the tolerance, finds nothing', () => {
    const r = { ...fits, scrollWidth: 201, right: 300.6 };

    const result = textFitFindings(r);

    expect(result).toEqual([]);
  });
});

describe('summariseTextFit', () => {
  it('with no states measured, reports one problem', () => {
    const result = summariseTextFit([], 'surge title');

    expect(result.problems).toBe(1);
  });

  it('with a state that matched no text, reports it as blind', () => {
    const result = summariseTextFit([{ state: 'daily done', readings: [] }], 'surge title');

    expect([result.problems, result.message.includes('daily done: BLIND')]).toEqual([1, true]);
  });

  it('with one clean state and one overflowing state, counts only the overflow and names its state', () => {
    const states = [
      { state: 'daily', readings: [fits] },
      { state: 'daily done', readings: [{ ...fits, text: 'Completed today', scrollWidth: 260 }] },
    ];

    const result = summariseTextFit(states, 'surge title');

    expect([result.problems, result.message.includes('daily done: 1 overflow(s)'), result.message.includes('"Completed today": text wider than its box by 60px')]).toEqual([1, true, true]);
  });
});
