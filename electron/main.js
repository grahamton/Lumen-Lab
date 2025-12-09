import { app, BrowserWindow } from 'electron'
import process from 'process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Force High-Performance GPU
app.commandLine.appendSwitch('force_high_performance_gpu')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  // In development, load the local Vite server
  // In production, load the built index.html
  // We can check if we are running from a packaged app or via 'electron .' which typically implies dev if not built?
  // A simple heuristic for this setup:
  // If env variable VITE_DEV_SERVER_URL is set (often used by plugins) or we can just try to connect to localhost?

  // For simplicity in this manual setup:
  // We will assume if the app is packaged, load file.
  // If not packaged, we try to load localhost, fallback to file.

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
    // DEBUG: Open DevTools to diagnose grey screen
    // win.webContents.openDevTools()
  } else {
    // Development mode
    win.loadURL('http://localhost:5173')
    // win.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
