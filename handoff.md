# Handoff

## Current State

The current uncommitted work has substantially expanded Lumen Lab's projection workflow:

- Global 4-corner projector calibration
- Calibration overlay with keyboard nudge and guide controls
- Secondary projector/output window in Electron
- Multi-surface mapped output
- Surface warp editing
- Polygon mask editing
- Per-surface source selection
- Reusable media library
- Projection profiles
- Broadcast sync to the output window

Core verification has already passed on the current tree:

- `npm run lint`
- `npm test -- --run`
- `npm run build`

No live projector validation has been done in this environment.

## First Fixes To Make

These are the first two fixes to land next session because they are concrete regressions from the current diff.

### 1. Blank-state overlay ignores mapped output

Problem:

- `src/App.jsx` computes `hasVisualSource` only from the live generator/media path.
- If the stage is being driven entirely by mapped surfaces with `MEDIA`, `BUILT-IN`, or `USER` sources, the app still shows the "Start creating" helper over a valid scene.

Fix:

- Update `hasVisualSource` in `src/App.jsx` so it also returns true when there are visible projection surfaces that can render output.
- At minimum, treat any visible projection surface as a visual source while projection mode is active.
- Better: check for any visible surface with a valid source assignment.

Suggested files:

- `src/App.jsx`

Acceptance:

- No blank-state helper appears when mapped surfaces are actively producing output, even if the live source is empty.

### 2. Switching active media can leave stale content on screen

Problem:

- `src/store/useStore.js` updates `state.media` when switching active media assets, but does not clear `state.image`.
- `src/components/CanvasGL.jsx` prefers `image` over `media`, so the previous image/video can remain visible until the replacement loads, or indefinitely if the replacement fails.

Fix:

- Clear `image` whenever the active media asset changes.
- Review all store paths that swap live media:
  - `setMedia`
  - `addMediaAsset` when activating
  - `setActiveMediaAsset`
- Keep the hydration logic in `src/components/controls/TopStrip.jsx`, but make sure the renderer no longer treats a stale `image` element as authoritative after a source switch.

Suggested files:

- `src/store/useStore.js`
- `src/components/CanvasGL.jsx`
- `src/components/controls/TopStrip.jsx`

Acceptance:

- Switching between media assets updates the visible result immediately to the new source path.
- If the next asset fails to load, the app should not silently keep presenting the old one as if the switch succeeded.

## Important Follow-Up

There is a user-reported regression to reproduce directly:

- "the rest of lumenlab does not do anything anymore, no generators etc."

Do not assume this is only user confusion about `LIVE OUTPUT`.

Next session should explicitly reproduce:

1. Add surfaces.
2. Assign non-live sources.
3. Switch a surface back to `LIVE OUTPUT`.
4. Change generator to `PLASMA`.
5. Verify whether the mapped stage responds.

Possible outcomes:

- If live surfaces respond again, the issue is primarily UX and source visibility.
- If live surfaces still do not respond, there is a real regression in the live render path and it should be fixed before further feature work.

Most relevant files:

- `src/components/CanvasGL.jsx`
- `src/components/controls/SectionOutput.jsx`
- `src/components/controls/TopStrip.jsx`
- `src/store/useStore.js`

## Next Goals Not Yet Hit

The projection work is much stronger now, but these larger goals are still incomplete.

### 1. Reproduce and harden the live-source model

Why:

- The source graph is now more complex and easy to confuse.
- The app needs a clearly correct model for:
  - live source
  - media asset source
  - built-in preset source
  - user preset source

Work:

- Reproduce the reported generator issue in the running app.
- Make source state visible in the UI.
- Consider showing a clearer "this surface is independent from live controls" indicator.
- Consider adding a global "make one surface live" or "return to live composition" action.

### 2. Per-surface independent media/generator authoring

Current state:

- Surfaces can reference different media assets or preset-derived states.
- There is still not a true per-surface scene editor with independent generator/media/effect state authored in place.

Work:

- Introduce a proper scene/source model rather than overloading presets as source definitions.
- Let surfaces reference reusable scene records.
- Support editing a selected scene without overwriting the global live state unintentionally.

Likely files:

- `src/store/useStore.js`
- `src/components/CanvasGL.jsx`
- new scene/source UI components

### 3. Performance pass on the compositor

Current state:

- Surface compositing is done by duplicating source canvases and using DOM/CSS transforms and `clip-path`.
- This is functional but not the long-term rendering path.

Work:

- Measure performance with several surfaces and video sources.
- Decide whether to keep DOM composition for now or move toward a GPU-native compositor.
- The main hotspot to review is `src/components/CanvasGL.jsx`.

### 4. Real project model

Current state:

- Projection settings, surfaces, and media library live in store state and persistence.
- There is still no explicit project file workflow.

Work:

- Add project save/load boundaries distinct from presets.
- Separate:
  - project layout/output config
  - look presets
  - scene/source definitions

### 5. Dedicated projector workflow polish

Current state:

- Secondary output window exists and syncs state.
- No real-world validation against a second display/projector has been done.

Work:

- Live test with a second display.
- Verify fullscreen behavior, state sync latency, and output cleanup.
- Confirm calibration, blackout, and patterns behave correctly in the output window.

## Suggested Order For The Next Session

1. Fix the two review findings.
2. Reproduce the reported "generators do nothing" issue in the running app.
3. Fix any real live-source regression if reproduction succeeds.
4. Tighten source-state UX in the output panel.
5. Decide whether to continue with per-surface scene authoring or a performance/compositor pass.

## Quick Verification Checklist After Fixes

- `npm run lint`
- `npm test -- --run`
- `npm run build`
- Manual:
  - upload two media assets and switch between them
  - assign one surface to `LIVE OUTPUT`
  - confirm generator changes affect that surface
  - assign another surface to media or preset
  - confirm blank-state helper does not show over valid mapped output

