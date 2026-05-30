export function updateProjectionCanvasRegistry(currentRegistry, sourceKey, canvasElement) {
  if (!sourceKey) return currentRegistry

  if (!canvasElement) {
    if (!Object.hasOwn(currentRegistry, sourceKey)) return currentRegistry
    const nextRegistry = { ...currentRegistry }
    delete nextRegistry[sourceKey]
    return nextRegistry
  }

  if (currentRegistry[sourceKey] === canvasElement) return currentRegistry
  return { ...currentRegistry, [sourceKey]: canvasElement }
}

export function pruneProjectionCanvasRegistry(currentRegistry, activeSourceKeys) {
  const activeKeys = new Set(activeSourceKeys)
  const staleKeys = Object.keys(currentRegistry).filter((key) => !activeKeys.has(key))
  if (staleKeys.length === 0) return currentRegistry

  const nextRegistry = { ...currentRegistry }
  for (const key of staleKeys) {
    delete nextRegistry[key]
  }

  return nextRegistry
}
