# Lumen Lab Road Map

This roadmap outlines major milestones and associated issues for future development. Milestones are sequenced roughly by priority and may overlap.

## Milestone 1 – MIDI Control Integration

- [x] **Design MIDI architecture**: Research and select a cross‑platform MIDI library and decide how to map incoming MIDI messages to internal parameters.
- [x] **Implement MIDI input**: Add support for reading MIDI events (note on/off, control change) and map them to visual engine controls such as generator parameters, effect intensities and presets.
- [x] **MIDI mapping UI**: Provide a user interface for assigning MIDI controls to specific parameters; include save/load of MIDI mappings.
- [x] **Cross‑platform testing**: Verify MIDI functionality on Windows, macOS and Linux; address latency and device compatibility issues.

## Milestone 2 – Generative Engine Expansion

- [x] **Add new generators**: Implement additional mathematical generators such as fractal noise, cellular automata, Lissajous curves and reaction–diffusion patterns.
- [ ] **User‑defined equations**: Allow advanced users to define custom formulas or GLSL shaders for generators via a scripting interface.
- [x] **Optimize existing engines**: Profile and improve performance of existing generators; leverage GPU acceleration where possible.
- [x] **Parameter modulation**: Enable modulation of generator parameters via internal LFOs, envelopes or MIDI/OSC input.

## Milestone 3 – Community Preset Library

- [x] **Preset format specification**: Define a versioned file format to save complete sessions, including generator settings, effects stack and MIDI mappings.
- [x] **Import/export**: Implement import/export functionality and integrate with the preset manager so users can share configurations.
- [ ] **Library repository**: Host a cloud‑accessible repository (e.g., GitHub Pages or a simple API) where users can browse and download presets.
- [ ] **In‑app browser**: Build an interface within Lumen Lab to browse, search and download community presets.

## Milestone 4 – UI and UX Improvements

- [x] **Interface refinement**: Improve layout and typography; ensure controls are intuitive and accessible.
- [ ] **Onboarding tutorial**: Create a guided tutorial on first launch to introduce key concepts like generators, effects and controls.
- [ ] **Theme customization**: Add light/dark modes and allow users to adjust UI color schemes.
- [ ] **Performance optimizations**: Identify and eliminate UI bottlenecks; ensure responsive performance even with complex scenes.

## Milestone 5 – Extended Control & Integration

- [ ] **OSC support**: Add support for Open Sound Control (OSC) to allow network‑based control and integration with DAWs and other visual tools.
- [ ] **VST/AU plug‑in**: Explore building a plug‑in version of Lumen Lab that can run inside popular audio workstations, enabling synchronised visuals during music production.
- [ ] **DMX/Lighting integration**: Investigate integration with lighting protocols (DMX, Art‑Net) to sync stage lights with visual output.

## Milestone 6 – Documentation & Tutorials

- [x] **User guide**: Write comprehensive user documentation covering installation, controls, generator descriptions, MIDI mapping and export options.
- [ ] **Developer docs**: Document code structure and contribute guidelines to encourage community contributions.
- [ ] **Video tutorials**: Produce short tutorial videos demonstrating setup, creating visuals, using MIDI control and sharing presets.

## Milestone 7 – Cross‑Platform Packaging

- [ ] **macOS build**: Package and distribute Lumen Lab for macOS using Electron/Node packaging tools; test on Apple Silicon and Intel systems.
- [ ] **Linux build**: Create a Linux build (AppImage or Flatpak) and verify compatibility with major distributions.
- [ ] **Auto‑update**: Integrate an auto‑update mechanism to notify users of new releases and install updates seamlessly.

## Milestone 8 – Beta Release & Feedback

- [ ] **Feature freeze**: Stabilize the codebase and freeze features for the beta release.
- [x] **Bug tracking** (Reset Logic & Crash Fixes Verified)
- [x] **Feedback integration** (LFO, Flux, Tunnels): Prioritize and address critical feedback, focusing on stability, performance and usability.
