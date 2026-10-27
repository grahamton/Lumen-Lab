import { describe, expect, it } from 'vitest'
import { createMediaAsset, isMediaFile, toFileUrl } from './mediaFiles'

describe('mediaFiles', () => {
  it('builds file URLs that survive special characters and Windows drives', () => {
    expect(toFileUrl('C:\\Media\\clip #1.mp4')).toBe('file:///C:/Media/clip%20%231.mp4')
    expect(toFileUrl('/home/vj/loops/50% off?.png')).toBe('file:///home/vj/loops/50%25%20off%3F.png')
  })

  it('accepts only images and videos', () => {
    expect(isMediaFile(new File([''], 'a.png', { type: 'image/png' }))).toBe(true)
    expect(isMediaFile(new File([''], 'a.webm', { type: 'video/webm' }))).toBe(true)
    expect(isMediaFile(new File([''], 'a.txt', { type: 'text/plain' }))).toBe(false)
  })

  it('inlines images when there is no file path (dev / browser)', async () => {
    const asset = await createMediaAsset(new File(['png'], 'still.png', { type: 'image/png' }))
    expect(asset).toMatchObject({ type: 'image', name: 'still.png', persistMode: 'inline' })
    expect(asset.src.startsWith('data:image/png')).toBe(true)
  })
})
