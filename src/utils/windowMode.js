export function isProjectionWindow() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('projection') === '1'
}
