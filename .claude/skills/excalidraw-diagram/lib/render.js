'use strict';
// Renders a .excalidraw scene to PNG with the real Excalidraw renderer (exportToSvg, real fonts) in a headless
// Chromium-based browser (Edge, Chrome or Chromium; "Edge" below means any of them).
// How it works: a throw-away local HTTP server serves one page with the scene inline and receives the page's
// status (size, text widths). One headless Edge is launched with its own profile; Node drives it over the
// DevTools protocol (Node's built-in WebSocket): navigate, wait for the page's "done" status, set the viewport to
// the exported size x scale, capture the PNG, close Edge. No browser pane, no dev server.
//
// Why not `msedge --headless --screenshot`: with --virtual-time-budget the page is stopped while the Excalidraw
// font is still loading (document.fonts.ready never resolves), and without it the screenshot is taken before the
// module has run. Waiting for the page's own "done" message over the DevTools protocol avoids both.
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const EXCALIDRAW_URL = 'https://esm.sh/@excalidraw/excalidraw@0.18.0?deps=react@18.3.1,react-dom@18.3.1';
// Any Chromium-based browser works. EXCALIDRAW_BROWSER (a full path) wins over this list.
const LINUX_BROWSERS = ['microsoft-edge', 'microsoft-edge-stable', 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
function browserCandidates(platform = process.platform) {
  if (platform === 'win32') {
    const roots = [process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', process.env.ProgramFiles || 'C:\\Program Files',
      process.env.LOCALAPPDATA].filter(Boolean);
    return roots.flatMap(r => [path.win32.join(r, 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.win32.join(r, 'Google\\Chrome\\Application\\chrome.exe')]);
  }
  if (platform === 'darwin') {
    return ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'];
  }
  const dirs = (process.env.PATH || '/usr/bin:/usr/local/bin').split(path.delimiter);
  return LINUX_BROWSERS.flatMap(name => dirs.map(dir => path.posix.join(dir, name)));
}
const EXPORT_PADDING = 30;
const TIMEOUT_MS = 120000;
const START_TIMEOUT_MS = 30000;
const FONT_TIMEOUT_MS = 15000;
const CALL_TIMEOUT_MS = 30000;
const SCREENSHOT_TIMEOUT_MS = 60000;
const KILL_TIMEOUT_MS = 15000;
const PROFILE_REMOVE_TRIES = 5;
const PROFILE_RETRY_DELAY_MS = 300;

function findBrowser() {
  const override = process.env.EXCALIDRAW_BROWSER;
  if (override) {
    if (!fs.existsSync(override)) throw new Error(`EXCALIDRAW_BROWSER points to a missing file: ${override}`);
    return override;
  }
  const candidates = browserCandidates();
  const found = candidates.find(p => fs.existsSync(p));
  if (!found) {
    throw new Error(`No Edge / Chrome / Chromium found. Set EXCALIDRAW_BROWSER to the browser's full path. Looked in:\n${candidates.join('\n')}`);
  }
  return found;
}

function pageHtml(scene) {
  // '<' is escaped so a text such as "</script>" in the diagram cannot end the script block
  const data = JSON.stringify(scene).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>html,body{margin:0;background:#ffffff}svg{display:block}</style></head>
<body><script type="module">
const report = s => fetch('/status', { method: 'POST', body: JSON.stringify(s) });
try {
  const { exportToSvg } = await import(${JSON.stringify(EXCALIDRAW_URL)});
  const scene = ${data};
  const svg = await exportToSvg({
    elements: scene.elements,
    files: scene.files || {},
    appState: { ...scene.appState, exportBackground: true },
    exportPadding: ${EXPORT_PADDING},
  });
  document.body.appendChild(svg);
  // exportToSvg registers its fonts but does not load them; load them, then wait for the font set to settle
  await Promise.race([
    Promise.all([...document.fonts].map(f => f.load())).then(() => document.fonts.ready),
    new Promise(resolve => setTimeout(resolve, ${FONT_TIMEOUT_MS})),
  ]);
  const textWidths = [...svg.querySelectorAll('text')].map(t => t.getBBox().width);
  await report({
    ok: true,
    width: Math.ceil(Number(svg.getAttribute('width'))),
    height: Math.ceil(Number(svg.getAttribute('height'))),
    textWidths,
  });
} catch (e) {
  await report({ ok: false, error: String((e && e.stack) || e) });
}
</script></body></html>`;
}

function startServer(html) {
  let resolveStatus;
  const status = new Promise(resolve => { resolveStatus = resolve; });
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/status') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        res.end('ok');
        try {
          resolveStatus(JSON.parse(body));
        } catch (e) {
          resolveStatus({ ok: false, error: `unreadable status from the page: ${body}` });
        }
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${server.address().port}/`,
      status,
      close: () => {
        server.closeAllConnections();
        server.close();
      },
    }));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms / 1000} s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// A separate profile per run keeps this Edge apart from the user's own Edge windows.
// The debugging port is chosen by Edge itself (port 0) and published in <profile>/DevToolsActivePort.
async function launchBrowser(browser) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'excalidraw-edge-'));
  const child = spawn(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: 'ignore' });
  child.on('error', () => {}); // a launch failure shows up as the DevToolsActivePort timeout below
  const portFile = path.join(profile, 'DevToolsActivePort');
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (fs.existsSync(portFile)) {
      const [port, wsPath] = fs.readFileSync(portFile, 'utf8').split('\n');
      if (port && wsPath) return { child, profile, wsUrl: `ws://127.0.0.1:${port}${wsPath.trim()}` };
    }
    await sleep(200);
  }
  await stopBrowser({ child, profile });
  throw new Error(`${browser} did not start its DevTools endpoint within ${START_TIMEOUT_MS / 1000} s`);
}

// The launcher process hands over to a detached browser process, so killing the launcher is not enough:
// end every process that was started with this run's own (unique) profile directory.
async function stopBrowser(run) {
  try {
    if (process.platform === 'win32') {
      const script = `Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*${run.profile}*' } `
        + '| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }';
      spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'ignore', timeout: KILL_TIMEOUT_MS });
    } else {
      spawnSync('pkill', ['-f', run.profile], { stdio: 'ignore', timeout: KILL_TIMEOUT_MS });
    }
    run.child.kill();
  } catch (e) { /* already exited */ }
  // Edge can still hold files in the profile for a moment after it exits, and nothing else removes the folder
  // (the OS does not clear the temp folder on Windows): try again every PROFILE_RETRY_DELAY_MS, then give up
  for (let i = 0; i < PROFILE_REMOVE_TRIES; i++) {
    try { fs.rmSync(run.profile, { recursive: true, force: true }); return; } catch (e) { /* retry */ }
    await sleep(PROFILE_RETRY_DELAY_MS);
  }
}

// minimal DevTools protocol client: send(method, params, sessionId, timeoutMs) -> result
// Every call is bounded: it rejects on its own timeout, and all open calls reject when the socket closes or fails,
// so a dead or hung Edge can never leave render() waiting forever.
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 0;
    let opened = false;
    let signalClosed;
    const closed = new Promise((_, rej) => { signalClosed = rej; });
    closed.catch(() => {}); // only awaited by render(); avoid an unhandled rejection otherwise
    const failAll = reason => {
      signalClosed(new Error(`Edge connection lost: ${reason}`));
      for (const wait of pending.values()) wait.reject(new Error(`${wait.method}: ${reason}`));
      pending.clear();
    };
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      const wait = msg.id && pending.get(msg.id);
      if (!wait) return;
      pending.delete(msg.id);
      if (msg.error) wait.reject(new Error(`${wait.method}: ${msg.error.message}`));
      else wait.resolve(msg.result);
    };
    ws.onerror = () => {
      if (!opened) reject(new Error(`cannot connect to ${wsUrl}`));
      else failAll('DevTools connection failed');
    };
    ws.onclose = () => {
      if (!opened) reject(new Error(`cannot connect to ${wsUrl}`));
      else failAll('DevTools connection closed (did Edge exit?)');
    };
    ws.onopen = () => {
      opened = true;
      resolve({
        closed,
        send: (method, params = {}, sessionId, timeoutMs = CALL_TIMEOUT_MS) => {
          const id = ++nextId;
          const call = new Promise((res, rej) => {
            pending.set(id, { resolve: res, reject: rej, method });
            try {
              if (ws.readyState !== WebSocket.OPEN) throw new Error('DevTools connection is closed');
              ws.send(JSON.stringify({ id, method, params, sessionId }));
            } catch (e) {
              pending.delete(id);
              rej(new Error(`${method}: ${e.message}`));
            }
          });
          return withTimeout(call, timeoutMs, `DevTools call ${method}`).finally(() => pending.delete(id));
        },
        close: () => ws.close(),
      });
    };
  });
}

async function render(inFile, outFile, { scale = 2 } = {}) {
  const scene = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  const out = path.resolve(outFile);
  const srv = await startServer(pageHtml(scene));
  let run;
  let cdp;
  try {
    run = await launchBrowser(findBrowser());
    cdp = await connect(run.wsUrl);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.navigate', { url: srv.url }, sessionId);
    const status = await Promise.race([withTimeout(srv.status, TIMEOUT_MS, 'loading the Excalidraw renderer'), cdp.closed]);
    if (!status.ok) {
      throw new Error(`render failed in the page: ${status.error}\n`
        + 'Is esm.sh reachable? Without network the renderer cannot load (SKILL.md, "Offline").');
    }
    // screenshot at exactly the exported size times the scale
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: status.width, height: status.height, deviceScaleFactor: scale, mobile: false }, sessionId);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId, SCREENSHOT_TIMEOUT_MS);
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    const header = fs.readFileSync(out);
    return { file: out, width: header.readUInt32BE(16), height: header.readUInt32BE(20), textWidths: status.textWidths };
  } finally {
    if (cdp) {
      // ask Edge to quit itself first; stopBrowser below makes sure nothing is left
      await withTimeout(cdp.send('Browser.close'), 5000, 'closing Edge').catch(() => {});
      cdp.close();
    }
    if (run) await stopBrowser(run);
    srv.close();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--scale');
  const scale = at >= 0 ? Number(args.splice(at, 2)[1]) : 2;
  const [inFile, outFile] = args;
  if (!inFile) {
    console.error('usage: node render.js <in.excalidraw> [out.png] [--scale 2]');
    process.exit(2);
  }
  render(inFile, outFile || inFile.replace(/\.excalidraw$/, '') + '.png', { scale })
    .then(r => console.log(`PNG ${r.width}×${r.height} → ${r.file}`))
    .catch(e => {
      console.error(e.message);
      process.exit(1);
    });
}

module.exports = { render, findBrowser, browserCandidates, pageHtml, EXPORT_PADDING };
