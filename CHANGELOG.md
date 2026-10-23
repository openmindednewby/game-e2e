# Changelog

All notable changes to `@dloizides/game-e2e` are documented here.

## 1.6.1

GAME-INPUT-PROMPTS-1 "Every action bound, with device labels", D-GIP-9 "Widen AC-GIP-5":

- `actionBindingFindings` reports `prompt missing` when a bound action's binding carries a prompt label but no visible
  `data-gi-prompt` shows it (absent, hidden or zero-size chip). Before, such a chip passed. On touch the caller passes
  bindings with `prompt: null`, so hidden chips still pass (AC-GIP-9).

## 1.6.0

GAME-INPUT-PROMPTS-1 "Every action bound, with device labels":

- `expectActionsBound(page, bindings, options?)`, `measureActionBinding`, `readActionElements`, `toActionReading`,
  `summariseActionBinding`, `actionBindingFindings`: fails when a visible clickable has no `data-gi-action`, a tagged
  action has no key or pad binding, a visible `data-gi-prompt` shows a label other than the current binding, or zero
  elements were read. Bindings are an input (`ActionBindings`), so the gate does not depend on a game-input release.

## 1.5.0

TEXT-FIT-1 "UI text never overflows its box at 360x640 or desktop, in every state":

- `expectTextFits(page, selector?, options?)`, `measureTextFit`, `readTextBoxes`, `summariseTextFit`, `textFitFindings`:
  fails when visible text is wider/taller than its box or spills its parent, across named UI states. Trigger: Surge's
  "Daily run" button with the "Completed today" badge ran past the button edge at 360x640 and 1280.

## 1.4.0

GAME-E2E-PRESS-1 "Faster pad presses in game-e2e walks":

- `stubGamepad().press` holds the button for exactly one sampled frame and resolves once a reader has seen it
  released (`navigator.getGamepads()` calls latched to `document.timeline.currentTime`), instead of 3+3 fixed
  `requestAnimationFrame` ticks. Under CPU load the old hold outlasted the 380 ms pad repeat delay and moved focus
  twice, so the walk skipped rows. `STUB_FRAMES` is now 1; `PRESS_WAIT_FRAMES` (240) caps the wait when no reader polls.

## 1.3.0

NAV-1 "Every game menu works with arrow keys and controller", phase 4 (canvas menus):

- `expectHookMenuWalkable(page, { screens, open, via?, sizes? })` / `walkHookMenus`: walks menus drawn on a canvas
  (Phaser, Babylon GUI) through the `window.__menuWalk` hook (`MenuWalkHook` from `@dloizides/game-input` 1.6.0).
  Per screen, at phone (360x640) and desktop (1280x720) viewports, by arrow keys and the stubbed pad: learns every
  focus transition until no direction is left untried, fails naming each unreached item. `activates: { item, to }`
  checks Enter / A opens a screen; Escape / B must leave the screen unless `leaves: false`.
- Arrow/pad driver moved to `menu-walk-driver.ts`, shared by the DOM and hook walkers (adds Enter / A `activate`).

## 1.2.1

- Listener lookup is one `Runtime.evaluate` (DevTools `getEventListeners`) instead of two CDP calls per element. The
  per-element calls slowed the walk enough that a screen re-rendering on a late fetch (Surge `stagePreview`) went red.

## 1.2.0

NAV-1 "Every game menu works with arrow keys and controller", walker gap:

- The walker now finds pointer-only items whose click / pointerdown / pointerup handler is set as a property
  (`el.onclick = ...`) or added with `addEventListener`, not only the `[onclick]` attribute. A visible element
  with such a handler that is not focusable is reported `unreached`.
- Listeners are read through CDP `DOMDebugger.getEventListeners` (Chromium). Without CDP (Firefox, WebKit) only
  the attribute and properties are checked, and each result carries a `notes` line saying so.
- Delegation: an element that contains a walk control, or sits inside one, is never flagged, so a listener on a
  menu container does not flag the container or its children. When nested elements are both flagged, only the
  innermost is reported.
- `WalkResult.notes` (new, printed as `note:` by `renderWalk`).

## 1.1.0

NAV-1 "Every game menu works with arrow keys and controller", phase 1:

- `walkMenus()` / `expectMenuWalkable()`: open each screen, walk every focusable control by arrow keys and
  by a stubbed gamepad (breadth-first from the focused control), report unreached controls, a dialog that
  opens without focus inside it, sliders that ignore Left/Right, and Escape / B that does not close a dialog.
  Exemptions take a selector and a printed reason.
- `stubGamepad()`: a `navigator.getGamepads()` stand-in driven from the test (`PadDriver.press`).
- `renderWalk()`, `walkFailed()`, `WALK_INPUTS`.
- Depends on `@dloizides/game-input` ^1.5.1 for the shared focusable and dialog selectors.

## 1.0.0

First release. Playwright helpers that Aurora, Surge and Morphe each carried a copy of, unified on the
strictest behaviour of the three:

- `phone()` / `desktop()` / `gameProjects()`: Galaxy S5 and Desktop Chrome device descriptors (touch,
  mobile UA, isMobile on the phone), resized; never a bare viewport.
- `armVisibleHeight()` / `shrinkVisibleHeight()`: a simulated browser toolbar. `relayoutGlobal` waits for
  every active Phaser scene to re-create and throws when the global is missing.
- `expectFitTo()`, `expectCanvasHeight()`, `expectCanvasInside()`: game-shell fit assertions with a
  configurable canvas selector.
- `domControls()`, `overlaps()`, `findOverlaps()`, `findOverlapsWithin()`, `canvasBoxToPage()`.
- `diffPngs()` / `regionDiff()` / `countDiff()`: exact by default (tolerance 0, sizes must match);
  `ANTI_ALIAS_TOLERANCE` (48) and `width`/`height` opt into Surge's tolerant, scaled comparison.
- `auditTouchTargets()` + `expectTouchTargets(AcrossRoutes)()`: the 44x44 hit-box gate.
- `readHorizontalOverflow()` + `expectNoHorizontalOverflow(AcrossRoutes)()`: the no-horizontal-scroll
  gate, measured against the narrower of visualViewport width and clientWidth.
