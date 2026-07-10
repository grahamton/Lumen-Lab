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

The source model has also moved materially beyond the older projection-source UX state:

- New non-live surface assignments are now normalized toward reusable `scene` records
- `media`, `builtin`, and `user` selections act as scene-creation shortcuts for new work
- Scene origin/provenance is stored on scene records
- Scene authoring sessions now carry explicit runtime metadata:
  - `activeSceneId`
  - `mode`
  - `sourceSurfaceId`
  - `sourceSurfaceName`
  - `originalLiveState`
  - `draftState`
  - `hasLocalEdits`
- Active scene authoring now autosyncs into both persisted `scene.state` and an explicit `draftState`
- Projection source resolution and scene-library content are draft-aware for the actively authored scene

Core verification currently passes on the tree:

- `npm run lint`
- `npm test -- --run`
- `npm run build`

Dedicated projector validation has been completed by user testing, including a second display/projector check.

## Latest Completed Work

The latest completed batch continued the scene-first source-model phase and pushed scene authoring closer to being independent from the shared live composition.

- Surface/source UX
  - New direct `media`, `builtin`, and `user` assignments now create scenes and assign the surface to the new scene
  - Surface authoring actions were clarified:
    - `AUTHOR SCENE`
    - `FORK + AUTHOR`
    - `CREATE + AUTHOR SCENE`
  - Scene-library actions were clarified:
    - `AUTHOR`
    - `LOAD LIVE`
    - `REPLACE FROM LIVE`

- Scene model
  - Scene records now store origin/provenance metadata
  - Shared-scene authoring auto-forks before editing
  - Non-scene surfaces can be promoted into a scene and immediately authored

- Authoring session state
  - `sceneEditor` is now a first-class authoring-session model rather than only `activeSceneId + originalLiveState`
  - Explicit `draftState` is now stored for the active authored scene
  - Draft edits mark `hasLocalEdits`
  - Session reset paths now consistently clear authoring state

- Draft-aware consumers
  - Projection source resolution prefers the active draft for the currently authored scene
  - `CanvasGL` uses draft-aware scene source resolution
  - Scene-library content labels prefer the active draft when that scene is being authored

- Bundle/compositor follow-up
  - The `CanvasGL` async chunk has been split away from the heavy 3D vendor code with manual chunking
  - The main `CanvasGL` chunk is now much smaller, but the `three` vendor chunk still exceeds Vite's warning threshold
  - Switching `CanvasGL` to named `three` imports did not materially reduce the remaining vendor chunk, which suggests the warning is mostly inherent to the current Three.js surface area

- Legacy source migration
  - Imported and rehydrated legacy `media`, `builtin`, and `user` surface sources are now normalized into reusable scenes
  - Old direct surface-source assignments no longer need to persist as the long-term storage shape

- Projector workflow hardening
  - The projection window now rehomes itself if the selected display changes or disappears
  - The output-display selector can move an already-open output window to a new display

- Project model split
  - Project export/import now carries explicit `layout`, `sources`, and `lookPresets` sections
  - The old flat project shape still imports for compatibility, but the structured sections are now the preferred model boundary
  - The new structured document shape round-trips in tests, and legacy flat imports still normalize correctly

- Authored-scene selectors
  - The store now exposes explicit helpers for the active authored scene id and draft state
  - `CanvasGL` and scene-library/output consumers route through the authored-scene selector boundary instead of repeating direct draft lookups
  - The output panel now selects authored-scene session fields directly from the store helpers instead of carrying the raw session object through UI logic

- Project-file copy
  - The project import/export UI now describes the structured `layout` / `sources` / `lookPresets` document shape instead of only the older flat wording

- Draft-first authoring path
  - Control reads now route through the active authored draft when a scene authoring session is open
  - Scene-edit control writes now update the authored draft and persisted `scene.state` without overwriting the shared live state
  - `KEEP LIVE` is now the explicit transition that applies the authored draft back onto live output

- Tests
  - Store tests cover:
    - library authoring sessions
    - surface authoring sessions
    - auto-fork-on-author for shared scenes
    - draft-state autosync
    - draft-aware `LOAD LIVE`
    - explicit `REPLACE FROM LIVE`
  - Projection source tests cover draft-aware scene resolution
  - Output UI tests cover authoring copy and draft-aware scene-library labels

## Runtime Reproduction Result

The earlier reported “generators do nothing anymore” issue was reproduced against the running app.

- Result: `LIVE OUTPUT` does respond correctly.
- Reproduction outcome:
  1. Added two surfaces
  2. Set one surface to a non-live source
  3. Set one surface to `LIVE OUTPUT`
  4. Switched the main generator
  5. Confirmed only the live surface changed
- Conclusion:
  - this is primarily a source-state visibility / UX problem
  - it did not reproduce as a broken live render path

## Most Relevant Files

- `src/store/useStore.js`
- `src/utils/projectionSources.js`
- `src/components/CanvasGL.jsx`
- `src/components/controls/SectionOutput.jsx`
- `src/store/useStore.test.js`
- `src/utils/projectionSources.test.js`
- `src/components/controls/SectionOutput.test.jsx`

## Next Goals Not Yet Hit

The projection and scene work is stronger now, but these larger goals are still incomplete.

### 1. Finish separating scene authoring from the shared live controls

Current state:

- Scene authoring now has explicit runtime session state and explicit `draftState`
- Draft-aware consumers exist for projection source resolution, scene-library content, and the main control/render path
- Scene authoring no longer has to overwrite the shared live state while edits are in progress

Work:

- Audit remaining editor-adjacent readers for direct live-state assumptions
- Keep tightening draft-first behavior around secondary authoring actions like snapshots, presets, and imported live-state transitions
- Keep `restoreLive` and `KEEP LIVE` semantics stable as more consumers move to authored-state selectors

Likely files:

- `src/store/useStore.js`
- `src/components/CanvasGL.jsx`
- control components that currently read/write global live state directly

### 2. Reproduce and harden the long-term live-source model

Current state:

- The app is now much closer to a `live + scene` model
- Backward compatibility for legacy persisted surface source modes still matters
- Legacy non-scene source modes are now normalized during import and rehydration
- Surface assignment UI now treats `media`, `builtin`, and `user` as scene-creation shortcuts rather than steady-state runtime source types

Work:

- Keep tightening recovery language and stage-state visibility where confusion remains
- Audit any remaining direct reads/writes that bypass the scene-first model
- Treat legacy source types as import/recovery compatibility shapes rather than first-class runtime authoring targets

### 3. Performance pass on the compositor

Current state:

- Surface compositing is still done by duplicating source canvases and using DOM/CSS transforms and `clip-path`
- This remains functional and is the accepted short-term path until measured runtime pressure justifies a rewrite
- `CanvasGL` no longer owns the bulk of the 3D vendor weight, but the `three` vendor chunk still produces a build-size warning

Work:

- Measure performance with several surfaces and video sources
- Measure whether the current DOM composition is acceptable before opening a GPU-native compositor rewrite
- Review whether the projection pipeline or code-splitting should be improved before deeper compositor work
- Reduce or accept the remaining `three` vendor chunk warning if the bundle split is deemed sufficient; current evidence suggests the remaining size is mostly structural

### 4. Real project model

Current state:

- Projection settings, surfaces, scenes, and media library live in store state and persistence
- Project export/import exists, but the broader data-model separation is still incomplete
- Project export now includes explicit sections for layout, sources, and look presets while preserving compatibility with the older flat shape
- Project UI copy now describes live composition as a separate boundary from reusable sources and look presets

Work:

- Keep routing project import/export expectations through the structured section boundary instead of the older flat shape
- Keep live composition, reusable sources, and look presets conceptually separate so future persistence changes do not depend on store-internal coupling

### 5. Dedicated projector workflow polish

Current state:

- Secondary output window exists and syncs state
- User testing has already validated the second display/projector workflow
- The output window now has fallback/rehome behavior when the selected display changes or is removed

Work:

- Keep hardware-specific regression checks as a follow-up when projector-window behavior changes materially
- Verify fullscreen behavior, state sync latency, and output cleanup when related code changes land
- Confirm calibration, blackout, and patterns behave correctly in the output window after future output-window changes

## Suggested Order For The Next Session

1. Continue the scene-authoring decoupling work.
2. Make draft-backed authored state the primary editing path rather than using the shared live control state as the authoring driver.
3. Audit remaining control readers/writers that still assume the global live state is the only editable state.
4. After that architectural step is stable, choose between:
   - finishing deeper scene-editor separation, or
   - scheduling the compositor/performance pass.
5. Leave dedicated projector regression checks as a later manual milestone if output-window behavior changes again.

Recent progress:
- `CanvasGL` bundle pressure has been reduced by splitting the heavy vendor stack out of the async scene chunk.
- The remaining warning is now isolated to the `three` vendor chunk rather than the `CanvasGL` chunk itself.

## Quick Verification Checklist After Fixes

- `npm run lint`
- `npm test -- --run`
- `npm run build`
- Manual:
  - upload two media assets and switch between them
  - assign one surface to `LIVE OUTPUT`
  - confirm generator changes affect that surface
  - assign another surface to media or preset and confirm it is normalized into a reusable scene
  - author a scene from the library and confirm scene-library labels reflect draft changes immediately
  - author a scene from a selected surface and confirm:
    - shared scenes auto-fork before authoring
    - `RESTORE LIVE` returns to the pre-authoring live composition
    - `KEEP LIVE` leaves the current global composition in place
  - confirm mixed-stage warning appears when live and independent surfaces coexist
  - confirm `MAKE ALL LIVE` restores all visible non-live surfaces
  - confirm `RESET MISSING TO LIVE` only repairs invalid visible surfaces
