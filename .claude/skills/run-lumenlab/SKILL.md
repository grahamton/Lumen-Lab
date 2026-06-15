---
name: run-lumenlab
description: Build, run, and drive the Lumen Lab Electron desktop app. Use when asked to start the app, run it, take a screenshot of its UI, build it, interact with its controls, or test visual changes in the running app.
---

Lumen Lab is a real-time visual synthesizer — an Electron app that uses React + Three.js (WebGL) for a live canvas. For agent/automated use, drive it via the Playwright REPL at `.claude/skills/run-lumenlab/driver.mjs`. The driver starts the Vite dev server automatically, launches Electron, and exposes a command interface for screenshots and interactions.

All paths are relative to the project root (`C:\dev\Lumenlab` or wherever the repo is cloned).

## Prerequisites

`playwright-core` is already in `devDependencies` — `npm install` is sufficient. No additional system packages are needed on Windows (no xvfb, no libXss1, etc.).

```bash
npm install
```

On Linux (headless): you'll also need xvfb and Chromium shared libs:
```bash
sudo apt-get install -y xvfb libnss3 libgbm1 libasound2t64 libgtk-3-0 libxss1 libxkbcommon0 libatk-bridge2.0-0 libcups2 libdrm2
```

## Build

No build step needed for the driver path — it runs against the Vite dev server, which the driver starts automatically. To build a distribution package:

```bash
npm run dist    # builds dist/ via Vite + packages with electron-builder
```

## Run (agent path)

```bash
node .claude/skills/run-lumenlab/driver.mjs
```

The driver starts Vite, waits for it to be ready, then launches Electron. On first run this takes ~10s total (Vite ~2s + Electron launch ~6s hydration wait).

Pipe commands for non-interactive use:

```bash
printf "launch\nss landing\nclick-text FIBONACCI\nss fibonacci\nquit\n" | node .claude/skills/run-lumenlab/driver.mjs
```

Screenshots land in `C:\tmp\shots\` by default. Override with `SCREENSHOT_DIR` env var.

### Commands

| command | what it does |
|---|---|
| `launch` | start Vite dev server + Electron, wait for hydration |
| `ss [name]` | screenshot → `$SCREENSHOT_DIR/<name>.png` |
| `click <css-sel>` | click element by CSS selector (via DOM) |
| `click-text <text>` | click button/link containing text |
| `type <text>` | keyboard type into focused element |
| `press <key>` | send key press (e.g. `h`, `Escape`, `KeyB`) |
| `wait <css-sel>` | wait up to 10s for selector |
| `eval <js>` | evaluate JS in page, print result as JSON |
| `text [css-sel]` | print innerText of selector (or body if omitted) |
| `toggle-controls` | press `h` to show/hide the left control panel |
| `windows` | list all Electron windows + webContents (for debugging) |
| `quit` | close Electron + Vite, exit driver |
| `help` | list all commands |

### Key bindings (send via `press`)

| key | action |
|---|---|
| `h` | toggle controls panel |
| `b` | toggle blackout |
| `p` | cycle projection pattern mode |
| `Shift+p` | cycle projection pattern type |
| `f` | toggle fullscreen |
| `r` | toggle recording |
| `s` | add snapshot |

## Run (human path)

```bash
# Requires Vite dev server running in a separate terminal:
npm run dev

# Then in another terminal:
npm run electron
```

Or combined (builds first, then launches):
```bash
npm run electron:build
```

## Test

```bash
npm test -- --run
```

8 test files, 74 tests. All should pass. Test suite uses jsdom (no Electron needed).

---

## Gotchas

- **`app.isPackaged` is always `false` when running `electron .`** — so the app always connects to Vite on `localhost:<port>`, never the built `dist/`. The driver starts Vite automatically before launching Electron. Forgetting this causes a blank white window with a connection error.

- **`stdio: 'ignore'` blocks Vite startup on Windows** — when spawning Vite with `stdio: 'ignore'`, the process starts but never writes to stdout/stderr, which on Windows seems to stall the process. The driver redirects to a log file (`C:\tmp\vite-driver.log`) instead.

- **Vite's port output has ANSI codes between `localhost:` and the port number** — the raw log contains `localhost:\x1b[1m5173`, not `localhost:5173`. The driver strips ANSI codes before regex-matching the port.

- **Vite shifts ports if 5173 is taken** — stale Vite processes from crashed/killed runs hold 5173–5175+. The driver reads the actual port Vite chose from its log and passes it to Electron via `VITE_DEV_PORT` env var. `electron/main.js` was patched to read this env var.

- **`rl.close` fires immediately in piped mode** — when commands are piped via `printf ... | node driver.mjs`, stdin closes after the last command is buffered, so `rl.close` fires before the queue drains. The driver's `close` handler waits for `queue` to settle before exiting.

- **The onboarding modal appears on first launch** — a full-screen help dialog (titled "Lumen Lab / Real-time Visual Synthesizer") blocks the UI until dismissed. Click it away with: `click-text Got it, let's create!`. On subsequent launches it won't appear if the app restored prior state.

- **6-second hydration wait is blind** — there's no clean "app is ready" signal from Electron. The driver sleeps 6s after `electron.launch()` returns. If you're on a very slow machine, increase this in the driver.

- **`APP_DIR` path goes 4 levels up from `driver.mjs`** — the file is at `.claude/skills/run-lumenlab/driver.mjs`, so `path.resolve(import.meta.url, '../../../..')` is needed to reach the project root (not 3 levels).

## Troubleshooting

- **"Vite server timed out after 30s"**: Check `C:\tmp\vite-driver.log` — if it's empty or missing, the spawn failed. Verify `node_modules/vite/bin/vite.js` exists. On Windows, `stdio: 'ignore'` mode is the cause if you see this; the driver uses file redirect to avoid it.

- **Blank/error page in Electron**: Vite isn't running or `VITE_DEV_PORT` wasn't propagated. Check the `electron/main.js` patch: it should read `process.env.VITE_DEV_PORT || '5173'`.

- **Port conflicts on 5173–5179**: Kill stale Node processes. The driver handles dynamic port detection, but if too many are running, Vite may take longer or fail to start. Run `netstat -ano | findstr ":517"` to identify and kill them.

- **Launch hangs at "Launching Electron..."**: The 30s Playwright timeout fired. Usually means Electron couldn't connect to the Vite server (check the port). Run `windows` command to inspect what windows were found.

- **On Linux: "Missing display"**: Prepend `xvfb-run -a` to the node command.
