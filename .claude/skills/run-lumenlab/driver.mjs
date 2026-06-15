// Lumen Lab Electron driver — REPL for agent use.
// Run: node .claude/skills/run-lumenlab/driver.mjs
// Starts the Vite dev server automatically, then launches Electron via Playwright.
import { _electron as electron } from 'playwright-core';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as child_process from 'node:child_process';
import * as net from 'node:net';
import { fileURLToPath } from 'node:url';

// driver.mjs → run-lumenlab → skills → .claude → project root (4 levels up)
const APP_DIR = path.resolve(fileURLToPath(import.meta.url), '../../../..');
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(process.platform === 'win32' ? 'C:\\tmp' : '/tmp', 'shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const electronBin = process.platform === 'win32'
  ? path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe')
  : path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron');

let app = null;
let page = null;
let viteProc = null;
let vitePort = null;

async function startViteServer() {
  if (viteProc) return;
  // Spawn Vite directly via Node (avoids shell: true issues on Windows)
  // Write to log file — stdio:'ignore' prevents Vite from starting on Windows
  const viteLog = path.join(SHOT_DIR, '..', 'vite-driver.log');
  const viteJs = path.join(APP_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  const logFd = fs.openSync(viteLog, 'w');
  viteProc = child_process.spawn(process.execPath, [viteJs], {
    cwd: APP_DIR,
    stdio: ['ignore', logFd, logFd],
  });
  fs.closeSync(logFd);

  // Read the log to find the actual port Vite chose (it may shift if lower ports are taken)
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 30_000;
    viteProc.on('error', reject);
    const poll = () => {
      if (Date.now() > deadline) return reject(new Error('Vite server timed out after 30s'));
      try {
        const raw = fs.readFileSync(viteLog, 'utf8');
        // Strip ANSI escape codes before matching (Vite interleaves them)
        const log = raw.replace(/\x1b\[[0-9;]*m/g, '');
        const m = log.match(/localhost:(\d+)/);
        if (m) { vitePort = parseInt(m[1]); resolve(); return; }
      } catch {}
      setTimeout(poll, 200);
    };
    setTimeout(poll, 500);
  });
  console.log(`Vite dev server ready on :${vitePort}`);
}

const COMMANDS = {
  async launch() {
    if (app) return console.log('already launched');
    console.log('Starting Vite dev server...');
    await startViteServer();
    console.log('Launching Electron...');
    app = await electron.launch({
      executablePath: electronBin,
      args: ['--no-sandbox', APP_DIR],
      env: { ...process.env, VITE_DEV_PORT: String(vitePort) },
      timeout: 30_000,
    });
    // Wait for React + Three.js to hydrate
    await new Promise(r => setTimeout(r, 6_000));
    page = app.windows().find(w => !w.url().startsWith('devtools://')) ?? await app.firstWindow();
    console.log('launched.', app.windows().length, 'windows:');
    for (const w of app.windows()) console.log(' ', w.url());
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f });
    console.log('screenshot:', f);
  },

  async click(sel) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(s => {
      const el = document.querySelector(s);
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK';
    }, sel);
    console.log('click', sel, '→', r);
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first');
    const r = await page.evaluate(t => {
      const els = [...document.querySelectorAll('button, a, [role="button"]')];
      const el = els.find(e => e.textContent?.trim() === t)
              ?? els.find(e => e.textContent?.includes(t));
      if (!el) return 'NOT_FOUND';
      el.click(); return 'OK: ' + el.tagName;
    }, text);
    console.log('click-text', JSON.stringify(text), '→', r);
  },

  async type(text) { if (page) await page.keyboard.type(text, { delay: 30 }); },
  async press(key) { if (page) await page.keyboard.press(key); },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first');
    try { await page.waitForSelector(sel, { timeout: 10_000 }); console.log('found:', sel); }
    catch { console.log('TIMEOUT:', sel); }
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first');
    try { console.log(JSON.stringify(await page.evaluate(expr))); }
    catch (e) { console.log('ERROR:', e.message); }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first');
    console.log(await page.evaluate(
      s => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
      sel || null));
  },

  async windows() {
    if (!app) return console.log('ERROR: launch first');
    for (const w of app.windows()) console.log(' ', w.url());
    const wcs = await app.evaluate(({ webContents }) =>
      webContents.getAllWebContents().map(w => ({ id: w.id, type: w.getType(), url: w.getURL() })));
    console.log('webContents:');
    for (const w of wcs) console.log(` [${w.id}] ${w.type}: ${w.url}`);
  },

  // Lumen Lab-specific: toggle the controls panel
  async 'toggle-controls'() {
    if (!page) return console.log('ERROR: launch first');
    await page.keyboard.press('h');
    await new Promise(r => setTimeout(r, 300));
    console.log('controls toggled');
  },

  async quit() {
    if (app) await app.close().catch(() => {});
    app = null; page = null;
    if (viteProc) { viteProc.kill(); viteProc = null; }
  },

  help() {
    console.log('commands:', Object.keys(COMMANDS).join(', '));
  },
};

// Serialize commands — readline fires events without waiting for async handlers.
// Queue ensures each command finishes before the next starts.
let queue = Promise.resolve();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'driver> ' });

rl.on('line', line => {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  if (!cmd) { rl.prompt(); return; }
  const fn = COMMANDS[cmd];
  if (!fn) { console.log('unknown:', cmd, '— try: help'); rl.prompt(); return; }
  queue = queue.then(async () => {
    try { await fn(rest.join(' ')); } catch (e) { console.log('ERROR:', e.message); }
    if (cmd === 'quit') { rl.close(); process.exit(0); }
    try { rl.prompt(); } catch {} // ignore if stdin already closed
  });
});

rl.on('close', () => {
  // Wait for the command queue to drain before quitting
  queue.then(async () => { await COMMANDS.quit(); process.exit(0); });
});

console.log('Lumen Lab driver — "help" for commands, "launch" to start');
rl.prompt();
