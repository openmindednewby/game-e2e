import { toActionReading, type ActionElement } from './action-binding';

const thunder: ActionElement = { name: 'button#thunder', action: 'thunder', hasPointerHandler: true, promptText: 'LT' };

describe('toActionReading', () => {
  it('with a bound action, carries its key, pad and expected prompt', () => {
    const result = toActionReading(thunder, { thunder: { key: 'KeyT', pad: 6, prompt: 'LT' } });

    expect([result.key, result.pad, result.expectedPromptText]).toEqual(['KeyT', 6, 'LT']);
  });

  it('with an action missing from the bindings, reads as unbound on key and pad', () => {
    const result = toActionReading(thunder, {});

    expect([result.key, result.pad, result.expectedPromptText]).toEqual([null, null, null]);
  });

  it('with an untagged element, ignores the bindings', () => {
    const result = toActionReading({ ...thunder, action: null }, { thunder: { key: 'KeyT', pad: 6 } });

    expect([result.key, result.pad]).toEqual([null, null]);
  });
});
