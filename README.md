# @dloizides/game-e2e

Playwright helpers for the EisaiPollis browser games. Aurora, Surge and Morphe each held a copy of the
same fixtures; this package is the one copy. Where the three differed, the default is the strictest
behaviour and the looser one is an option.

```bash
npm install -D @dloizides/game-e2e
```

`@playwright/test` (>= 1.57) is a peer dependency.

## Projects: device descriptors, never a bare viewport

```ts
import { defineConfig } from '@playwright/test';
import { gameProjects } from '@dloizides/game-e2e';

export default defineConfig({ projects: gameProjects() });
```

`gameProjects()` returns `phone` (Galaxy S5 descriptor: mobile UA, touch, `isMobile`, at 360x640) and
`desktop` (Desktop Chrome at 1280x720, scale factor 1). A bare `viewport` has no touch flag, no scale
factor and no mobile UA, so it is not offered. `phone(w, h, dsf?)` and `desktop(w, h, dsf?)` build a
single context, e.g. `test.use(phone(390, 844))`.

## Visible height and fit

```ts
await armVisibleHeight(page);
await page.goto('/');
await shrinkVisibleHeight(page, 560, { relayoutGlobal: '__auroraGame' });
await expectFitTo(page, 560);
await expectCanvasHeight(page, 560, { canvasSelector: '#game-container canvas' });
```

| Option | Default | Why |
|---|---|---|
| `shrinkVisibleHeight` `relayoutGlobal` | none | Aurora's behaviour: wait until every active Phaser scene on `window[relayoutGlobal]` re-creates. Throws when the global is missing (Aurora's copy passed silently). Without it, the call only fires the resize (Surge, Morphe). |
| `expectCanvasHeight` / `expectCanvasInside` `canvasSelector` | `canvas` | Aurora `#game-container canvas`, Surge `#app canvas`, Morphe `#game-root canvas`. |
| `expectCanvasHeight` `timeout` | 15 s | Aurora's value; Surge used 10 s. |

## Boxes and overlaps

`domControls(page, selector?)` names each control `tag#id:text` or `tag.class:text` (Surge's form; Aurora and
Morphe dropped the text, which made two unnamed buttons indistinguishable). `findOverlaps(a, b)` and
`findOverlapsWithin(boxes)` return the overlapping pairs; `canvasBoxToPage(frame, bounds, name, band?)`
is the game-space to CSS-px transform the scene-target probes use.

## Pixel and region diff

```ts
const r = await diffPngs(browser, before, after);
const s = await regionDiff(page.context(), { png: a, region: { x: 0, y: 0, w: 200, h: 80 } }, { png: b, region: null }, { tolerance: ANTI_ALIAS_TOLERANCE });
```

Returns `{ differing, total, ratio, bbox }`. Default is exact (any RGB change counts) and the two PNGs must
be the same size, as in Aurora. `tolerance: ANTI_ALIAS_TOLERANCE` (48) and `width`/`height` give Surge's
tolerant comparison of both images scaled to one size. Alpha is ignored in both.

## Mobile gates

- `expectTouchTargets(page, where)` / `auditRoute` + `expectTouchTargetsAcrossRoutes(readings, portal)`:
  every reachable pressable is at least 44x44 (`MIN_TARGET_PX`) and has a role or an accessible name. One
  assertion per portal; a route that reads zero targets fails as a broken probe.
- `expectNoHorizontalOverflow(page, where)` / `measureHorizontalOverflow` +
  `expectNoHorizontalOverflowAcrossRoutes`: overflow is `scrollWidth` minus the narrower of
  `visualViewport.width` and `clientWidth`. Morphe compared against `clientWidth`, Aurora against the visual
  viewport; the gate fails if either says the page scrolls sideways.

## Migration

### Aurora (`tests/design-ac/fixtures/`)

| Local | Export |
|---|---|
| `game-fit.ts` `phone`, `desktop` | `phone`, `desktop` (same signature) |
| `game-fit.ts` `armVisibleHeight` | `armVisibleHeight` |
| `game-fit.ts` `shrinkVisibleHeight(page, h)` | `shrinkVisibleHeight(page, h, { relayoutGlobal: '__auroraGame' })` |
| `game-fit.ts` `Box`, `overlaps`, `domControls` | `Box`, `overlaps`, `domControls` (names gain `:text`) |
| `game-fit.ts` `expectFitTo` | `expectFitTo` |
| `game-fit.ts` `expectCanvasHeight` | `expectCanvasHeight(page, h, { canvasSelector: '#game-container canvas' })` |
| `game-fit.ts` `sceneTargets`, `titleTexts` | stay local; may use `canvasBoxToPage` |
| `pixel-diff.ts` `countDiffPixels(browser, a, b)` | `diffPngs(browser, a, b)` (`differing`, `total`, `bbox` unchanged, plus `ratio`) |
| `mobile-gates.ts` (all) | same names: `MIN_TARGET_PX`, `auditTouchTargets`, `auditRoute`, `expectTouchTargets`, `expectTouchTargetsAcrossRoutes` |
| `mobile-overflow.ts` (all) | same names: `readHorizontalOverflow`, `measureHorizontalOverflow`, `expectNoHorizontalOverflow`, `expectNoHorizontalOverflowAcrossRoutes` |

### Surge (`e2e/fixtures/`)

| Local | Export |
|---|---|
| `game-fit.ts` `phone`, `desktop` | `phone`, `desktop` |
| `game-fit.ts` `armVisibleHeight`, `shrinkVisibleHeight` | same names |
| `game-fit.ts` `Box`, `overlaps`, `domControls`, `expectFitTo` | same names |
| `game-fit.ts` `expectCanvasHeight` | `expectCanvasHeight(page, h, { canvasSelector: '#app canvas', timeout: 10_000 })` |
| `game-fit.ts` `horizontalOverflow` | `horizontalOverflowPx` |
| `game-fit.ts` `openTitle` | stays local |
| `pixelDiff.ts` `CHANNEL_TOLERANCE` | `ANTI_ALIAS_TOLERANCE` |
| `pixelDiff.ts` `diffPngs(page, a, b, w, h)` | `(await diffPngs(page.context(), a, b, { width: w, height: h, tolerance: ANTI_ALIAS_TOLERANCE })).ratio` |
| `regionDiff.ts` `regionDiff(page, a, ra, b, rb, w, h)` | `(await regionDiff(page.context(), { png: a, region: ra }, { png: b, region: rb }, { width: w, height: h, tolerance: ANTI_ALIAS_TOLERANCE })).ratio` |
| `regionDiff.ts` `Region` | `Region` |

### Morphe (`e2e/fixtures/`)

| Local | Export |
|---|---|
| `game-fit.ts` `phone`, `desktop` | `phone`, `desktop` |
| `game-fit.ts` `armVisibleHeight`, `shrinkVisibleHeight` | same names |
| `game-fit.ts` `Box`, `overlaps`, `domControls`, `expectFitTo` | same names |
| `game-fit.ts` `expectCanvasInside` | `expectCanvasInside(page, h, { canvasSelector: '#game-root canvas' })` |
| `game-fit.ts` `expectNoHorizontalScroll(page, label)` | `expectNoHorizontalOverflow(page, label)` (stricter denominator) |
| `game-fit.ts` `openGame`, `gameTargets` | stay local; `gameTargets` may use `canvasBoxToPage` |

## Publish

`./publish.ps1 -Bump patch|minor|major` (guarded by `publish-guard.ps1`).
