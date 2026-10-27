import { app, BrowserWindow, ipcMain, Menu, screen, session, shell } from 'electron'
import process from 'process'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let mainWindow = null
let projectionWindow = null
let projectionWindowDisplayId = null

// Force High-Performance GPU
app.commandLine.appendSwitch('force_high_performance_gpu')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
// WebGPU: on by default on Windows/macOS; on Linux Chromium enables it only for
// known-good drivers. The renderer falls back to WebGL2 everywhere else, and
// `--force-webgl` skips WebGPU entirely.

const ALLOWED_PERMISSIONS = new Set(['media', 'midi', 'midiSysex', 'fullscreen', 'clipboard-sanitized-write'])

// Only the app's own page counts: any file:// prefix would let a file dropped
// on the window replace the app (with the preload still attached).
function isAppUrl(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (app.isPackaged) {
    const indexUrl = pathToFileURL(path.join(__dirname, '../dist/index.html'))
    return parsed.protocol === 'file:' && parsed.pathname === indexUrl.pathname
  }
  const devPort = process.env.VITE_DEV_PORT || '5173'
  return parsed.origin === `http://localhost:${devPort}`
}

// Keep windows on the app: no navigation away (e.g. a file dropped on the
// window) and no new windows. External http(s) links open in the browser.
function hardenWindow(win) {
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault()
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
}

function installApplicationMenu() {
  if (!app.isPackaged) return
  // No default menu in production: its Ctrl+R / Ctrl+W / devtools accelerators
  // can reload or close the app mid-show. macOS keeps app + edit menus.
  const template = process.platform === 'darwin'
    ? [{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]
    : null
  Menu.setApplicationMenu(template ? Menu.buildFromTemplate(template) : null)
}

// `--force-webgl` (or LUMEN_RENDERER=webgl) skips WebGPU for troubleshooting.
const forceWebGL = process.argv.includes('--force-webgl') || process.env.LUMEN_RENDERER === 'webgl'

function loadRenderer(win, extraQuery = {}) {
  const query = forceWebGL ? { ...extraQuery, renderer: 'webgl' } : extraQuery
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
    title: 'Lumen Lab',
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    }
  })
  hardenWindow(win)
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
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    }
  })
  hardenWindow(projectionWindow)

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

const hasInstanceLock = app.requestSingleInstanceLock()
if (!hasInstanceLock) app.quit()

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.whenReady().then(() => {
  if (!hasInstanceLock) return
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission))
  })
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => ALLOWED_PERMISSIONS.has(permission))
  installApplicationMenu()
  registerProjectionIpc()
  mainWindow = createWindow()
  // The projector window is frameless and fullscreen; don't leave it orphaned.
  mainWindow.on('closed', () => {
    if (projectionWindow && !projectionWindow.isDestroyed()) projectionWindow.close()
  })

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
