import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { act } from 'react'
import { ControlGroup } from './ControlGroup'
import { Toggle } from './Toggle'
import { useStore } from '../../store/useStore'

describe('ControlGroup', () => {
  beforeEach(() => {
    act(() => { useStore.getState().resetAll() })
  })

  it('uses friendly labels, a data-help id, and degrees for rotation', () => {
    const { container } = render(
      <ControlGroup section="transforms" param="rotation" value={Math.PI / 2} onChange={() => {}} />
    )
    expect(screen.getByText('ROTATION')).toBeInTheDocument()
    expect(screen.getByText('90°')).toBeInTheDocument()
    expect(container.querySelector('[data-help="transforms.rotation"]')).not.toBeNull()
  })

  it('shows Off for posterize at the top of the range', () => {
    render(<ControlGroup section="color" param="posterize" value={256} onChange={() => {}} />)
    expect(screen.getByText('FEWER COLORS')).toBeInTheDocument()
    expect(screen.getByText('Off')).toBeInTheDocument()
  })

  it('double-click resets to the default and announces it', () => {
    act(() => { useStore.getState().setSymmetry('slices', 12) })
    render(
      <ControlGroup section="symmetry" param="slices" value={12} set={useStore.getState().setSymmetry} />
    )
    fireEvent.doubleClick(screen.getByRole('slider'))
    expect(useStore.getState().symmetry.slices).toBe(6)
    expect(useStore.getState().toast?.message).toBe('Reset Mirror Slices')
  })
})

describe('Toggle', () => {
  it('is a switch whose whole row toggles', () => {
    let calls = 0
    render(<Toggle label="MIRROR" isOn={false} onToggle={() => { calls += 1 }} help="symmetry.enabled" />)
    const sw = screen.getByRole('switch', { name: 'MIRROR' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(screen.getByText('MIRROR'))
    expect(calls).toBe(1)
  })
})
