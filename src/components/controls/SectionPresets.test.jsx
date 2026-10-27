import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { act } from 'react'
import { SectionPresets } from './SectionPresets'
import { useStore } from '../../store/useStore'

describe('SectionPresets saved looks', () => {
  beforeEach(() => {
    act(() => { useStore.getState().resetAll() })
  })

  it('shows an empty state, then numbered looks after saving', () => {
    render(<SectionPresets />)
    expect(screen.getByText('Press S any time to save a look here.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('SAVE LOOK (S)'))
    fireEvent.click(screen.getByText('SAVE LOOK (S)'))

    expect(screen.queryByText('Press S any time to save a look here.')).not.toBeInTheDocument()
    expect(screen.getByText('Look 1')).toBeInTheDocument()
    expect(screen.getByText('Look 2')).toBeInTheDocument()
    expect(useStore.getState().snapshots).toHaveLength(2)
  })

  it('loads a look on click and deletes it with the x', () => {
    render(<SectionPresets />)
    act(() => { useStore.getState().setSymmetry('slices', 9) })
    fireEvent.click(screen.getByText('SAVE LOOK (S)'))
    act(() => { useStore.getState().setSymmetry('slices', 11) })
    fireEvent.click(screen.getByText('Look 1'))
    expect(useStore.getState().symmetry.slices).toBe(9)

    fireEvent.click(screen.getByLabelText('Delete Look 1'))
    expect(useStore.getState().snapshots).toHaveLength(0)
    expect(screen.getByText('Press S any time to save a look here.')).toBeInTheDocument()
  })
})
