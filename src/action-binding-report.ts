import type { GateSummary } from './types';

/** One clickable in-play element: its tagged action, its bindings, and the prompt it shows. */
export interface ActionReading {
  name: string;
  action: string | null;
  hasPointerHandler: boolean;
  key: string | null;
  pad: number | null;
  promptText: string | null;
  expectedPromptText: string | null;
}

export interface ActionBindingFinding {
  name: string;
  why: string;
}

/** Every way one element breaks "every action bound": untagged, no key, no pad button, stale prompt. */
export function actionBindingFindings(_r: ActionReading): ActionBindingFinding[] {
  throw new Error('not implemented: GAME-INPUT-PROMPTS-1 actionBindingFindings');
}

/** Folds every reading into one tally; zero readings is a blind probe and counts as a problem. */
export function summariseActionBinding(_readings: readonly ActionReading[], _where: string): GateSummary {
  throw new Error('not implemented: GAME-INPUT-PROMPTS-1 summariseActionBinding');
}
