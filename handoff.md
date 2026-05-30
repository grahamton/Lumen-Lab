# Handoff

## Current State

The current tree has substantially expanded Lumen Lab's projection workflow:

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

Core verification currently passes on the tree:

- `npm run lint`
- `npm test -- --run`
- `npm run build`

No live projector validation has been done in this environment.

## Latest Completed Work

The latest completed batch hardened the projection source UX without changing the persisted surface source model.

- Bulk recovery actions are now normalized around `MAKE ALL LIVE`
- Mixed-stage warning is shown when visible surfaces split between live and independent sources
- No-live warning copy now explicitly states that generator/effect changes will not appear on stage
- Per-surface status copy now explicitly distinguishes:
  - `LIVE OUTPUT`
  - independent non-live sources
  - missing sources
- Selected-surface helper copy now clearly explains when a surface is independent from live controls
- Hidden-surface copy is deterministic in the selected-surface panel
- Output-panel tests now cover mixed state, no-live state, missing-source repair, and hide/show behavior

## Runtime Reproduction Result

The reported “generators do nothing anymore” issue was reproduced against the running app.

- Result: `LIVE OUTPUT` does respond correctly.
- Reproduction outcome:
  1. Added two surfaces
  2. Set one surface to `BUILT-IN`
  3. Set one surface to `LIVE OUTPUT`
  4. Switched the main generator to `PLASMA`
  5. Confirmed only the live surface changed
- Conclusion:
  - this is primarily a source-state visibility / UX problem
  - it did not reproduce as a broken live render path

Also verified manually in the running app:

- `MAKE ALL LIVE`
- `RESET MISSING TO LIVE`
- hide/show surface behavior

Most relevant files:

- `src/components/controls/SectionOutput.jsx`
- `src/utils/projectionSources.js`
- `src/components/controls/SectionOutput.test.jsx`

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

- Keep tightening the source-state model and recovery language where confusion remains.
- Decide whether to keep the current source types long-term or converge toward a `live` + `scene` model.
- Preserve backward compatibility for persisted projection surface records while evolving the UX.

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

1. Start the scene-first source model phase.
2. Treat `builtin`, `user`, and direct `media` assignments as scene-creation shortcuts rather than long-term authored surface modes.
3. Keep scene editing clearly separated from live-state editing.
4. Decide whether to continue with per-surface scene authoring or schedule a compositor/performance measurement pass.
5. Leave dedicated projector validation as a later manual milestone.

## Quick Verification Checklist After Fixes

- `npm run lint`
- `npm test -- --run`
- `npm run build`
- Manual:
  - upload two media assets and switch between them
  - assign one surface to `LIVE OUTPUT`
  - confirm generator changes affect that surface
  - assign another surface to media or preset
  - confirm mixed-stage warning appears when live and independent surfaces coexist
  - confirm `MAKE ALL LIVE` restores all visible non-live surfaces
  - confirm `RESET MISSING TO LIVE` only repairs invalid visible surfaces
