import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { act } from 'react'
import { MidiLearnBar } from './MidiLearnBar'
import { ControlGroup } from './ControlGroup'
import { useStore } from '../../store/useStore'

function connectDevice() {
  act(() => {
    useStore.getState().setMidi('isEnabled', true)
    useStore.getState().setMidi('inputs', [{ id: 'a', name: 'Test Controller' }])
  })
}

describe('MidiLearnBar', () => {
  beforeEach(() => {
    act(() => {
      useStore.getState().resetAll()
    })
  })

  it('shows "No MIDI device" when nothing is connected', () => {
    render(<MidiLearnBar />)
    expect(screen.getByText('NO MIDI DEVICE')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'MIDI LEARN' })).toBeNull()
  })

  it('toggles learn mode, shows the banner, and exits on Escape', () => {
    connectDevice()
    render(<MidiLearnBar />)

    const toggle = screen.getByRole('button', { name: 'MIDI LEARN' })
    expect(toggle).toHaveAttribute('title', expect.stringContaining('MIDI Learn'))
    fireEvent.click(toggle)

    expect(useStore.getState().ui.midiLearnActive).toBe(true)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Move a control, then turn a knob')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useStore.getState().ui.midiLearnActive).toBe(false)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('learns a mapping from a control, shows its CC, and clears it', () => {
    connectDevice()
    render(
      <>
        <MidiLearnBar />
        <ControlGroup section="color" param="posterize" value={8} onChange={() => {}} />
      </>
    )

    fireEvent.click(screen.getByRole('button', { name: 'MIDI LEARN' }))
    fireEvent.pointerDown(screen.getByRole('slider', { name: 'Posterize' }))
    expect(useStore.getState().ui.midiLearnId).toBe('color.posterize')
    expect(screen.getByText('● WAITING')).toBeInTheDocument()

    act(() => {
      useStore.getState().setMidi('lastMsg', { type: 'cc', channel: 1, note: 20, value: 0.5 })
    })
    expect(screen.getByText('CC20')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear MIDI mapping for Posterize' }))
    expect(screen.queryByText('CC20')).toBeNull()
    expect(useStore.getState().midi.mappings).toEqual({})
  })

  it('clears a mapping on right-click in learn mode', () => {
    connectDevice()
    act(() => {
      useStore.getState().setMidiMapping('1-cc-9', 'color.hue')
      useStore.getState().setMidiLearn(true)
    })
    render(<ControlGroup section="color" param="hue" value={0} onChange={() => {}} />)

    expect(screen.getByText('CC9')).toBeInTheDocument()
    fireEvent.contextMenu(screen.getByRole('slider', { name: 'Hue' }))
    expect(screen.queryByText('CC9')).toBeNull()
  })
})
