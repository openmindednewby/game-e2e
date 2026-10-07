# Changelog

All notable changes to `@dloizides/game-e2e` are documented here.

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
