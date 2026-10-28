import { useRef } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InfoBar } from './InfoBar'
import { IDLE_HELP, HELP } from '../../config/helpText'

function Harness() {
  const ref = useRef(null)
  return (
    <div ref={ref}>
      <button data-help="symmetry.slices">Slices</button>
      <button>No help here</button>
      <InfoBar rootRef={ref} />
    </div>
  )
}

describe('InfoBar', () => {
  it('shows idle text, then the hovered control name and tip, then idle again', () => {
    render(<Harness />)
    const bar = screen.getByTestId('info-bar')
    expect(bar).toHaveAttribute('aria-live', 'polite')
    expect(bar).toHaveTextContent(IDLE_HELP)

    fireEvent.mouseOver(screen.getByText('Slices'))
    expect(bar).toHaveTextContent(HELP['symmetry.slices'].name)
    expect(bar).toHaveTextContent('6 = snowflake, 12+ = mandala.')

    fireEvent.mouseLeave(bar.parentElement)
    expect(bar).toHaveTextContent(IDLE_HELP)
  })

  it('also follows keyboard focus', () => {
    render(<Harness />)
    fireEvent.focusIn(screen.getByText('Slices'))
    expect(screen.getByTestId('info-bar')).toHaveTextContent('Mirror slices')
  })

  it('has a tip for every known id', () => {
    for (const [id, entry] of Object.entries(HELP)) {
      expect(entry.name, id).toBeTruthy()
      expect(entry.tip, id).toBeTruthy()
    }
  })
})
