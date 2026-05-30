import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { TopStrip } from './TopStrip'
import { useStore } from '../../store/useStore'

describe('TopStrip', () => {
  const OriginalImage = globalThis.Image

  beforeEach(() => {
    act(() => {
      useStore.getState().resetAll()
    })
  })

  afterEach(() => {
    globalThis.Image = OriginalImage
  })

  it('hydrates media-backed state without resetting imported live composition', async () => {
    class MockImage {
      constructor() {
        this.listeners = {}
        this.complete = false
        this.naturalWidth = 1280
        this.naturalHeight = 720
      }

      addEventListener(type, listener) {
        this.listeners[type] = listener
      }

      set src(value) {
        this._src = value
        this.complete = true
        this.listeners.load?.()
      }

      get src() {
        return this._src
      }
    }

    globalThis.Image = MockImage

    act(() => {
      useStore.setState({
        generator: {
          ...useStore.getState().generator,
          type: 'plasma',
        },
        media: {
          id: 'asset-a',
          type: 'image',
          src: 'file:///alpha.png',
          name: 'Alpha',
        },
        mediaLibrary: [{
          id: 'asset-a',
          type: 'image',
          src: 'file:///alpha.png',
          name: 'Alpha',
        }],
        activeMediaId: 'asset-a',
        image: null,
      })
    })

    render(<TopStrip />)

    await waitFor(() => {
      expect(useStore.getState().image).toBeInstanceOf(MockImage)
    })

    expect(useStore.getState().generator.type).toBe('plasma')
    expect(useStore.getState().image.src).toBe('file:///alpha.png')
  })
})
