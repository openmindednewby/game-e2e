import type { GateSummary } from './types';

export const TEXT_FIT_TOLERANCE_PX = 1;

/** One visible text element: its own box and content size, and the box of the block it sits in. */
export interface TextBoxReading {
  name: string;
  text: string;
  inline: boolean;
  clientWidth: number;
  clientHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  parentLeft: number;
  parentTop: number;
  parentRight: number;
  parentBottom: number;
}

export interface TextFitFinding {
  name: string;
  text: string;
  why: string;
  px: number;
}

export interface StateTextFit {
  state: string;
  readings: readonly TextBoxReading[];
}

function ownOverflow(r: TextBoxReading, tol: number): TextFitFinding | null {
  if (r.inline) {return null;}
  const wide = r.scrollWidth - r.clientWidth;
  const tall = r.scrollHeight - r.clientHeight;
  if (wide > tol) {return { name: r.name, text: r.text, why: 'text wider than its box', px: wide };}
  if (tall > tol) {return { name: r.name, text: r.text, why: 'text taller than its box', px: tall };}
  return null;
}

function spill(r: TextBoxReading, tol: number): TextFitFinding | null {
  const px = Math.max(r.parentLeft - r.left, r.parentTop - r.top, r.right - r.parentRight, r.bottom - r.parentBottom);
  return px > tol ? { name: r.name, text: r.text, why: 'spills out of its parent', px: Math.round(px) } : null;
}

/** Every way one reading breaks the rule: content larger than its own box, or the box outside its parent's. */
export function textFitFindings(r: TextBoxReading, tol = TEXT_FIT_TOLERANCE_PX): TextFitFinding[] {
  return [ownOverflow(r, tol), spill(r, tol)].filter((f): f is TextFitFinding => f !== null);
}

const renderFinding = (f: TextFitFinding): string => `\n    ${f.name} "${f.text}": ${f.why} by ${String(f.px)}px`;

/** Folds every UI state into one tally; a state that measured no text at all is a blind probe and counts as a problem. */
export function summariseTextFit(states: readonly StateTextFit[], where: string, tol = TEXT_FIT_TOLERANCE_PX): GateSummary {
  if (states.length === 0) {return { problems: 1, message: `${where}: no UI state was measured at all` };}
  let problems = 0;
  const lines = states.map((s) => {
    if (s.readings.length === 0) {
      problems += 1;
      return `\n  ${s.state}: BLIND - no visible text element matched`;
    }
    const found = s.readings.flatMap((r) => textFitFindings(r, tol));
    problems += found.length;
    const head = found.length > 0 ? `${String(found.length)} overflow(s)` : 'ok';
    return `\n  ${s.state}: ${head} over ${String(s.readings.length)} text element(s)${found.map(renderFinding).join('')}`;
  });
  return { problems, message: `${where}: ${String(states.length)} state(s), ${String(problems)} problem(s)${lines.join('')}` };
}
