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

function bindingFindings(r: ActionReading, action: string): ActionBindingFinding[] {
  const found: ActionBindingFinding[] = [];
  if (r.key === null) {found.push({ name: r.name, why: `action ${action} has no key binding` });}
  if (r.pad === null) {found.push({ name: r.name, why: `action ${action} has no pad binding` });}
  return found;
}

function promptFinding(r: ActionReading): ActionBindingFinding | null {
  const comparable = r.promptText !== null && r.expectedPromptText !== null;
  if (!comparable || r.promptText === r.expectedPromptText) {return null;}
  return { name: r.name, why: `prompt shows "${String(r.promptText)}" but the current binding is "${String(r.expectedPromptText)}"` };
}

/** Every way one element breaks "every action bound": untagged, no key, no pad button, stale prompt. */
export function actionBindingFindings(r: ActionReading): ActionBindingFinding[] {
  if (r.action === null) {return r.hasPointerHandler ? [{ name: r.name, why: 'pointer handler but no data-gi-action' }] : [];}
  const prompt = promptFinding(r);
  const bindings = bindingFindings(r, r.action);
  return prompt === null ? bindings : [...bindings, prompt];
}

const renderFinding = (f: ActionBindingFinding): string => `\n    ${f.name}: ${f.why}`;

/** Folds every reading into one tally; zero readings is a blind probe and counts as a problem. */
export function summariseActionBinding(readings: readonly ActionReading[], where: string): GateSummary {
  if (readings.length === 0) {return { problems: 1, message: `${where}: BLIND - no clickable or data-gi-action element was read` };}
  const found = readings.flatMap(actionBindingFindings);
  const head = `${where}: ${String(readings.length)} element(s), ${String(found.length)} problem(s)`;
  return { problems: found.length, message: `${head}${found.map(renderFinding).join('')}` };
}
