import { actionBindingFindings, summariseActionBinding, type ActionReading } from './action-binding-report';

const bound: ActionReading = {
  name: 'button#thunder', action: 'thunder', hasPointerHandler: true,
  key: 'KeyT', pad: 6, promptText: 'LT', expectedPromptText: 'LT',
};

describe('actionBindingFindings (AC-GIP-7)', () => {
  it('with a clickable action bound on key and pad showing its current label, finds nothing', () => {
    const result = actionBindingFindings(bound);

    expect(result).toEqual([]);
  });

  it('with a pointer handler but no data-gi-action tag, reports the untagged element', () => {
    const r = { ...bound, name: 'button#mute', action: null, key: null, pad: null, promptText: null, expectedPromptText: null };

    const result = actionBindingFindings(r);

    expect(result.map((f) => f.why)).toEqual(['pointer handler but no data-gi-action']);
  });

  it('with a tagged action that has no key, reports the missing key', () => {
    const r = { ...bound, key: null };

    const result = actionBindingFindings(r);

    expect(result.map((f) => f.why)).toEqual(['action thunder has no key binding']);
  });

  it('with a tagged action that has no pad button, reports the missing pad binding', () => {
    const r = { ...bound, pad: null };

    const result = actionBindingFindings(r);

    expect(result.map((f) => f.why)).toEqual(['action thunder has no pad binding']);
  });

  it('with neither key nor pad, reports both', () => {
    const r = { ...bound, key: null, pad: null };

    const result = actionBindingFindings(r);

    expect(result).toHaveLength(2);
  });

  it('with no pointer handler and no tag, finds nothing', () => {
    const r = { ...bound, name: 'div#score', action: null, hasPointerHandler: false, key: null, pad: null, promptText: null, expectedPromptText: null };

    const result = actionBindingFindings(r);

    expect(result).toEqual([]);
  });
});

describe('actionBindingFindings, prompt text (AC-GIP-5)', () => {
  it('with a visible prompt that shows the default key after a remap, reports the stale label', () => {
    const r = { ...bound, key: 'KeyY', promptText: 'T', expectedPromptText: 'Y' };

    const result = actionBindingFindings(r);

    expect(result.map((f) => f.why)).toEqual(['prompt shows "T" but the current binding is "Y"']);
  });

  it('on keyboard or pad, with a missing or hidden prompt on a bound action, reports the missing chip', () => {
    const r = { ...bound, promptText: null };

    const result = actionBindingFindings(r);

    expect(result.map((f) => f.why)).toEqual(['prompt missing: the current binding is "LT" but no visible data-gi-prompt shows it']);
  });

  it('on touch, where the binding carries no prompt label, a hidden prompt passes', () => {
    const r = { ...bound, promptText: null, expectedPromptText: null };

    const result = actionBindingFindings(r);

    expect(result).toEqual([]);
  });
});

describe('summariseActionBinding (AC-GIP-7)', () => {
  it('with every action bound, reports zero problems', () => {
    const result = summariseActionBinding([bound], 'Surge play');

    expect(result.problems).toBe(0);
  });

  it('with one unbound and one untagged element, counts two problems and names both', () => {
    const readings = [{ ...bound, pad: null }, { ...bound, name: 'button#mute', action: null }];

    const result = summariseActionBinding(readings, 'Surge play');

    expect([result.problems, result.message.includes('button#thunder'), result.message.includes('button#mute')]).toEqual([2, true, true]);
  });

  it('with no readings at all, counts the blind probe as a problem', () => {
    const result = summariseActionBinding([], 'Surge play');

    expect(result.problems).toBe(1);
  });
});
