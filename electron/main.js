import { app, BrowserWindow, ipcMain, screen } from 'electron'
import process from 'process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let mainWindow = null
let projectionWindow = null
let projectionWindowDisplayId = null

// Force High-Performance GPU
app.commandLine.appendSwitch('force_high_performance_gpu')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')

function loadRenderer(win, query = {}) {
  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'), { query })
  } else {
    const devPort = process.env.VITE_DEV_PORT || '5173'
    const url = new URL(`http://localhost:${devPort}`)
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
    win.loadURL(url.toString())
  }
}

function getProjectionDisplay(displayId = null) {
  const displays = screen.getAllDisplays()
  return displays.find((display) => display.id === displayId) || screen.getPrimaryDisplay()
}

function applyProjectionWindowDisplay(displayId = null) {
  const win = projectionWindow
  if (!win || win.isDestroyed()) return null

  const targetDisplay = getProjectionDisplay(displayId)
  const { bounds } = targetDisplay
  projectionWindowDisplayId = targetDisplay.id

  win.setBounds(bounds)
  win.setFullScreen(true)
  return targetDisplay
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  })
  loadRenderer(win)
  return win
}

function createProjectionWindow(displayId = null) {
  const targetDisplay = getProjectionDisplay(displayId)
  const { bounds } = targetDisplay

  if (projectionWindow && !projectionWindow.isDestroyed()) {
    applyProjectionWindowDisplay(displayId)
    projectionWindow.focus()
    return projectionWindow
  }

  projectionWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  })

  projectionWindowDisplayId = targetDisplay.id
  applyProjectionWindowDisplay(targetDisplay.id)
  loadRenderer(projectionWindow, { projection: '1' })

  projectionWindow.on('closed', () => {
    projectionWindow = null
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('projection:window-closed')
    }
  })

  return projectionWindow
}

function syncProjectionWindowToDisplay() {
  if (!projectionWindow || projectionWindow.isDestroyed()) return
  applyProjectionWindowDisplay(projectionWindowDisplayId)
}

function registerProjectionIpc() {
  ipcMain.handle('projection:list-displays', () => (
    screen.getAllDisplays().map((display, index) => ({
      id: display.id,
      label: display.label || `Display ${index + 1}`,
      bounds: display.bounds,
      isPrimary: display.id === screen.getPrimaryDisplay().id,
    }))
  ))

  ipcMain.handle('projection:open-window', (_event, displayId) => {
    createProjectionWindow(displayId)
    return true
  })

  ipcMain.handle('projection:close-window', () => {
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.close()
    }
    return true
  })

  screen.on('display-added', syncProjectionWindowToDisplay)
  screen.on('display-removed', syncProjectionWindowToDisplay)
  screen.on('display-metrics-changed', syncProjectionWindowToDisplay)
}

app.whenReady().then(() => {
  registerProjectionIpc()
  mainWindow = createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  projectionWindowDisplayId = null
})
