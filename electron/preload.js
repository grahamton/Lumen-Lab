import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  listProjectionDisplays: () => ipcRenderer.invoke('projection:list-displays'),
  openProjectionWindow: (displayId) => ipcRenderer.invoke('projection:open-window', displayId),
  closeProjectionWindow: () => ipcRenderer.invoke('projection:close-window'),
  onProjectionWindowClosed: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('projection:window-closed', listener)
    return () => ipcRenderer.removeListener('projection:window-closed', listener)
  },
})
