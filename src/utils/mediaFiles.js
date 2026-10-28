// Turns a user-picked or dropped File into a media-library asset.

export function isMediaFile(file) {
  return Boolean(file?.type) && (file.type.startsWith('image/') || file.type.startsWith('video/'))
}

export function toFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  const withLeadingSlash = /^[A-Za-z]:/.test(normalized) ? `/${normalized}` : normalized
  // Encode per segment so '#', '?' and '%' in file names survive.
  const encoded = withLeadingSlash
    .split('/')
    .map((segment) => (/^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)))
    .join('/')
  return `file://${encoded}`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function createMediaAsset(file) {
  // Packaged builds reference the file on disk so it survives restarts without
  // bloating saved state; dev (http origin) can't load file:// URLs.
  const filePath = window.location.protocol === 'file:'
    ? window.electronAPI?.getPathForFile?.(file) || ''
    : ''
  const isVideo = file.type.startsWith('video/')
  const src = filePath
    ? toFileUrl(filePath)
    : isVideo
      ? URL.createObjectURL(file)
      : await readFileAsDataUrl(file)

  return {
    id: `media-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    type: isVideo ? 'video' : 'image',
    src,
    name: file.name,
    mimeType: file.type,
    persistMode: filePath ? 'file' : (isVideo ? 'object-url' : 'inline'),
  }
}
