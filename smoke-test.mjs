import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:4280/game';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

const errors = [];
const logs = [];
page.on('console', m => {
  const line = `[${m.type()}] ${m.text()}`;
  logs.push(line);
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
});
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('requestfailed', r => errors.push('REQFAIL: ' + r.url() + ' ' + (r.failure()?.errorText || '')));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
// Let the render loop + sim run.
await new Promise(r => setTimeout(r, 4000));

const probe = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const hud = document.querySelector('app-hud .hud');
  return {
    hasCanvas: !!canvas,
    canvasW: canvas?.width ?? 0,
    canvasH: canvas?.height ?? 0,
    hasHud: !!hud,
    nagaDots: document.querySelectorAll('.naga-dot').length,
    hearts: document.querySelectorAll('.heart').length,
  };
});

// End-to-end loop proof: read HUD, press V (venom), confirm mode flips and
// the shared meter starts draining — i.e. input → sim tick → signal → DOM.
const readHud = () => page.evaluate(() => ({
  mode: document.querySelector('.mode-label')?.textContent?.trim(),
  vm: parseFloat(getComputedStyle(document.querySelector('.vm-bar')).width),
}));
const before = await readHud();
await page.keyboard.press('v');                // venom on
await new Promise(r => setTimeout(r, 500));
const after = await readHud();                 // measure the flip before it drains away

await page.keyboard.down('w');                 // step north off the gopuram (framing)
await new Promise(r => setTimeout(r, 700));
await page.keyboard.up('w');
await new Promise(r => setTimeout(r, 300));

// Rough FPS probe (NOTE: headless uses the SwiftShader software renderer, so
// absolute fps is far below a real GPU — only useful for relative comparison).
const fps = await page.evaluate(() => new Promise(res => {
  let f = 0; const s = performance.now();
  const loop = () => {
    f++;
    if (performance.now() - s < 1500) requestAnimationFrame(loop);
    else res(Math.round(f / ((performance.now() - s) / 1000)));
  };
  requestAnimationFrame(loop);
}));
console.log('FPS(swiftshader)', fps);

await page.screenshot({ path: 'smoke-screenshot.png', clip: { x: 0, y: 0, width: 1280, height: 800 } });

console.log('PROBE', JSON.stringify(probe, null, 2));
console.log('HUD before', JSON.stringify(before), 'after', JSON.stringify(after));
const loopAlive = before.mode === 'NORMAL' && after.mode === 'VENOM' && after.vm < before.vm;
console.log('LOOP_ALIVE', loopAlive);
if (!loopAlive) errors.push('LOOP: input→sim→HUD did not behave as expected');
const ignorable = (s) => /favicon|fonts.googleapis|fonts.gstatic|webpack-dev-server|sockjs|\[vite\]/i.test(s);
const realErrors = errors.filter(e => !ignorable(e));
console.log('REAL_ERRORS', realErrors.length);
realErrors.slice(0, 20).forEach(e => console.log('  ' + e));
console.log('--- last 20 console logs ---');
logs.slice(-20).forEach(l => console.log('  ' + l));

await browser.close();
process.exit(realErrors.length === 0 && probe.hasCanvas && probe.canvasW > 0 ? 0 : 1);
