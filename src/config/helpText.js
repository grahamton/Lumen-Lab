// Plain-language names and one-line tips for every control in the side panel.
// The InfoBar looks these up by the `data-help` id of whatever is hovered/focused.
// Slider ids are `${section}.${param}`, matching uiConfig's CONTROLS.

export const IDLE_HELP = 'Hover over anything to see what it does. Press ? for help.'

export const HELP = {
  // Panel header + footer
  'ui.undo':     { name: 'Undo', tip: 'Step back. Ctrl+Z works too.' },
  'ui.redo':     { name: 'Redo', tip: 'Step forward again. Ctrl+Shift+Z.' },
  'ui.help':     { name: 'Help', tip: 'A quick tour of how Lumen Lab works. Press ? any time.' },
  'ui.hide':     { name: 'Hide panel', tip: 'Clear the screen for performing. Press H to bring it back.' },
  'ui.surprise': { name: 'Surprise me', tip: 'Roll the dice for a random look. Undo brings your old one back.' },
  'ui.freeze':   { name: 'Freeze', tip: 'Pause all motion. Press again to carry on.' },
  'ui.record':   { name: 'Record', tip: 'Capture the canvas to a video file. Press R.' },

  // Pattern picker
  'generator.fibonacci': { name: 'Spiral', tip: 'Sunflower-style spiral dots.' },
  'generator.voronoi':   { name: 'Cells', tip: 'Organic cells like soap bubbles.' },
  'generator.grid':      { name: 'Grid', tip: 'Crisp lines and squares.' },
  'generator.liquid':    { name: 'Lava', tip: 'Soft blobs of flowing colour.' },
  'generator.plasma':    { name: 'Plasma', tip: 'Classic swirling electric colour.' },
  'generator.image':     { name: 'Image or video', tip: 'Use your own picture or clip as the starting pattern.' },
  'media.bin':           { name: 'Your media', tip: 'Switch between pictures and clips you have added.' },

  // Knobs (also used as sliders)
  'transforms.scale':  { name: 'Zoom', tip: 'Zoom the pattern in or out. Double-click to reset.' },
  'generator.param3':  { name: 'Pattern speed', tip: 'How fast the pattern itself flows. Double-click to reset.' },
  'color.hue':         { name: 'Color shift', tip: 'Slide every colour around the colour wheel.' },

  // Geometry
  'symmetry.enabled':  { name: 'Mirror', tip: 'Fold the picture into a kaleidoscope.' },
  'symmetry.slices':   { name: 'Mirror slices', tip: '6 = snowflake, 12+ = mandala.' },
  'transforms.rotation': { name: 'Rotation', tip: 'Spin the whole picture.' },
  'displacement.amp':  { name: 'Wobble', tip: 'Funhouse-mirror bend.' },
  'displacement.freq': { name: 'Wobble size', tip: 'Low = big lazy waves, high = tiny ripples.' },
  'warp.type':         { name: 'Bend', tip: 'Warp space itself. Off, Tunnel or Vortex.' },
  'warp.none':         { name: 'Bend off', tip: 'No bending. The picture stays flat.' },
  'warp.polar':        { name: 'Tunnel', tip: 'Wrap the picture around the centre like a tunnel.' },
  'warp.log-polar':    { name: 'Vortex', tip: 'Endless zooming spiral, like falling into a vortex.' },
  'transforms.x':      { name: 'Position X', tip: 'Slide the picture left or right.' },
  'transforms.y':      { name: 'Position Y', tip: 'Slide the picture up or down.' },
  'tiling.type':       { name: 'Repeat', tip: 'Copy the picture into a repeating wallpaper.' },

  // Color
  'color.sat':        { name: 'Saturation', tip: 'Low = washed out, high = vivid.' },
  'color.light':      { name: 'Brightness', tip: 'Make everything darker or brighter.' },
  'color.posterize':  { name: 'Fewer colors', tip: 'Squash the palette for a retro poster look. Far right = off.' },
  'effects.invert':   { name: 'Flip colors', tip: 'Swap light and dark, like a photo negative.' },

  // Effects
  'effects.bloom':               { name: 'Glow', tip: 'Bright areas bleed soft light.' },
  'effects.chromaticAberration': { name: 'Color split', tip: 'Red, green and blue pulled slightly apart.' },
  'effects.noise':               { name: 'Film grain', tip: 'Sprinkle in old-film speckle.' },
  'audio.enabled':     { name: 'React to music', tip: 'Uses your mic so visuals pulse with the beat.' },
  'audio.sensitivity': { name: 'Music sensitivity', tip: 'How strongly the visuals respond to sound.' },
  'canvas.shape':      { name: 'Round frame', tip: 'Crop the picture into a circle.' },

  // Motion
  'animation.enabled': { name: 'Animate', tip: 'Turn movement on or off.' },
  'animation.bpm':     { name: 'Animation speed', tip: 'How fast everything moves while Animate is on.' },
  'flux.enabled':      { name: 'Wander', tip: 'Slowly changes things by itself.' },
  'flux.amount':       { name: 'Wander amount', tip: 'How far the wandering drifts away from your settings.' },

  // Looks and presets
  'preset.item':    { name: 'Ready-made look', tip: 'Click to try it. Undo brings back what you had.' },
  'look.chip':      { name: 'Saved look', tip: 'Click to bring this look back.' },
  'look.delete':    { name: 'Delete look', tip: 'Remove this saved look.' },
  'look.save':      { name: 'Save look', tip: 'Keep the current look so you can come back to it. Press S.' },
  'look.export':    { name: 'Export PNG', tip: 'Save a 4K picture of the canvas.' },
  'project.save':   { name: 'Save project', tip: 'Download everything (looks, media, layout) as a file.' },
  'project.load':   { name: 'Load project', tip: 'Open a project file you saved earlier.' },
  'project.reset':  { name: 'Start over', tip: 'Put every setting back to how it began. Undo can rescue you.' },

  // Section headers (also the fallback for anything inside a section)
  // Output / projector (SectionOutput, overlays, authoring banner)
  'output.projection':        { name: 'Projection', tip: 'Send the picture through the projector mapping.' },
  'output.line-up':           { name: 'Line up projector', tip: 'Drag the 4 corner dots until the picture fits your wall. Esc to finish.' },
  'output.grid-mode':         { name: 'Alignment grid', tip: 'Show a test grid to line up the projector. P cycles.' },
  'output.grid-style':        { name: 'Grid style', tip: 'Pick the grid style. Shift+P changes it.' },
  'output.blackout':          { name: 'Blackout', tip: 'Instantly black out the output. Press B again to bring it back.' },
  'output.reset-alignment':   { name: 'Reset alignment', tip: 'Put the four corners back to the full picture.' },
  'output.display':           { name: 'Display', tip: 'Which screen the output window opens on.' },
  'output.window':            { name: 'Output window', tip: 'Open or close the full-screen output window for the projector.' },
  'output.advanced':          { name: 'Mapped shapes', tip: 'Map the picture onto several shapes and keep saved looks.' },
  'output.new-shape':         { name: 'New shape', tip: 'Add a shape you can place on a wall, window or box.' },
  'output.shape-row':         { name: 'Shape', tip: 'Click to select this shape and edit it below.' },
  'output.shape-summary':     { name: 'Shapes', tip: 'What your shapes are showing right now.' },
  'output.shape-copy':        { name: 'Copy shape', tip: 'Make a copy of this shape, nudged so you can see it.' },
  'output.shape-delete':      { name: 'Delete shape', tip: 'Remove this shape. Click twice to confirm.' },
  'output.shape-edit':        { name: 'Edit on canvas', tip: 'Drag shape corners right on the picture. Esc when done.' },
  'output.shape-edit-mode':   { name: 'Move or cut', tip: 'Move the corners, or cut the shape outline into any polygon.' },
  'output.shape-source':      { name: 'Shows', tip: 'What this shape shows: the main visual or a saved look.' },
  'output.shape-rename':      { name: 'Rename', tip: 'Give this shape a name you will recognise.' },
  'output.shape-visibility':  { name: 'Hide or show', tip: 'Hide this shape on stage without deleting it.' },
  'output.shape-opacity':     { name: 'Opacity', tip: 'How see-through this shape is.' },
  'output.shape-blend':       { name: 'Blend', tip: 'Lighten, solid, glow or darken against shapes beneath.' },
  'output.cut-points':        { name: 'Cut points', tip: 'Points outlining the shape. Drag them on the canvas.' },
  'output.all-main':          { name: 'All follow main', tip: 'Make every visible shape show the main visual.' },
  'output.reset-missing':     { name: 'Fix missing', tip: 'Send shapes whose source is gone back to the main visual.' },
  'output.save-look':         { name: 'Save current look', tip: 'Save the pattern, colour and effects as a reusable look.' },
  'output.look-row':          { name: 'Saved look', tip: 'A look you saved. Put it on a shape or the main visual.' },
  'output.look-show':         { name: 'Show on main', tip: 'Put this look on the main visual.' },
  'output.look-edit':         { name: 'Edit this look', tip: 'The left panel now edits this look. It saves as you go.' },
  'output.look-more':         { name: 'More', tip: 'Rename, copy, overwrite or delete this look.' },
  'output.look-new-edit':     { name: 'New look and edit', tip: "Turn this shape's source into a look and start editing it." },
  'output.look-save-shape':   { name: 'Save as look', tip: 'Save what this shape shows as a reusable look.' },
  'output.save-alignment':    { name: 'Save alignment', tip: 'Remember this projector alignment for next time.' },
  'output.alignment-row':     { name: 'Saved alignment', tip: 'A projector alignment you saved.' },
  'output.alignment-load':    { name: 'Use alignment', tip: 'Snap the corners back to this saved alignment.' },
  'output.media-row':         { name: 'Media', tip: 'A picture or clip you added.' },
  'output.media-main':        { name: 'Show on main', tip: 'Use this picture or clip as the main visual.' },
  'output.media-assign':      { name: 'Use on shape', tip: 'Show this picture or clip on the selected shape.' },
  'output.media-more':        { name: 'More', tip: 'Rename or remove this media.' },
  'output.authoring-banner':  { name: 'Editing a look', tip: 'The left panel is editing a saved look, not the main visual.' },
  'output.keep-changes':      { name: 'Use on main', tip: 'Stop editing and put this look on the main visual.' },
  'output.discard-exit':      { name: 'Done editing', tip: 'Stop editing. The main visual goes back; your edits stay in the look.' },

  'section.geometry': { name: 'Geometry', tip: 'Mirror, wobble, bend and move the picture.' },
  'section.output':   { name: 'Output', tip: 'Fit the picture to a projector, screen or surface.' },
  'section.color':    { name: 'Color', tip: 'Tint, brighten and simplify the palette.' },
  'section.effects':  { name: 'Effects', tip: 'Glow, colour split, grain and music reaction.' },
  'section.motion':   { name: 'Motion', tip: 'Make it move and drift on its own.' },
  'section.presets':  { name: 'Presets', tip: 'Ready-made looks, your saved looks, and project files.' },
}

// Values shown next to sliders. Keys are `${section}.${param}`.
const RAD_TO_DEG = 180 / Math.PI

export function formatControlValue(section, param, value, step) {
  if (typeof value !== 'number') return String(value)
  const id = `${section}.${param}`
  if (id === 'transforms.rotation') return `${Math.round(value * RAD_TO_DEG)}°`
  if (id === 'color.posterize') return value >= 33 ? 'Off' : String(Math.round(value))
  if (step >= 1) return String(Math.round(value))
  return value.toFixed(2)
}

// Hover tips for the MIDI Learn bar.
export const HELP_TEXT = {
  midiLearn:
    'MIDI Learn: click or move a slider, then turn a knob or press a pad on your controller to bind it. ' +
    'Right-click a slider (or its ×) to clear its mapping. Esc exits.',
  midiUnavailable: 'Connect a MIDI controller to map its knobs to sliders.',
}
