// Sandboxed preloads can't use ESM imports; keep this file CommonJS.
const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  listProjectionDisplays: () => ipcRenderer.invoke('projection:list-displays'),
  openProjectionWindow: (displayId) => ipcRenderer.invoke('projection:open-window', displayId),
  closeProjectionWindow: () => ipcRenderer.invoke('projection:close-window'),
  onProjectionWindowClosed: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('projection:window-closed', listener)
    return () => ipcRenderer.removeListener('projection:window-closed', listener)
  },
  // File.path was removed in Electron 32; this is the supported replacement.
  getPathForFile: (file) => webUtils.getPathForFile(file),
})
