#!/usr/bin/env node
// Browser smoke test: serves apps/web/dist, drives the app with Playwright,
// asserts demo values + slider reactivity. Usage: node scripts/e2e-browser.mjs
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.env.DIST_DIR ?? path.join(root, 'apps/web/dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.resolve(dist, '.' + urlPath);
  if (!file.startsWith(dist)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/`;
console.log('serving', dist, 'at', url);

let browser;
let failed = false;
try {
  const browserType = chromium;
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  browser = await (executablePath
    ? browserType.launch({ headless: true, executablePath })
    : browserType.launch({ headless: true }));
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[console.error] ${m.text()}`);
  });
  page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));

  const readNodeValues = () =>
    page.evaluate(() =>
      Object.fromEntries(
        Array.from(document.querySelectorAll('.node-card')).map((el) => [
          el.querySelector('.node-id')?.textContent,
          el.querySelector('.node-value')?.textContent ?? null,
        ]),
      ),
    );

  const check = (name, cond, detail = '') => {
    if (cond) console.log(`  ok  ${name}`);
    else {
      failed++;
      console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ''}`);
    }
  };

  console.log('» initial load');
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  let v = await readNodeValues();
  console.log('  values:', JSON.stringify(v));
  check('constants render', v['c1'] === '10' && v['c2'] === '3', JSON.stringify(v));
  check('add=13', v['add1'] === '13', JSON.stringify(v));
  check('mul=26', v['mul1'] === '26', JSON.stringify(v));
  check('out=26', v['out1'] === '26', JSON.stringify(v));

  console.log('» slider change 2 -> 5');
  const slider = page.locator('input[type=range]').first();
  check('slider exists', (await slider.count()) === 1);
  await slider.fill('5');
  await page.waitForTimeout(1200);
  v = await readNodeValues();
  console.log('  values:', JSON.stringify(v));
  check('constants preserved', v['c1'] === '10' && v['c2'] === '3', JSON.stringify(v));
  check('add still 13', v['add1'] === '13', JSON.stringify(v));
  check('mul=65', v['mul1'] === '65', JSON.stringify(v));
  check('out=65', v['out1'] === '65', JSON.stringify(v));

  console.log('» persistence: reload');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  v = await readNodeValues();
  console.log('  values:', JSON.stringify(v));
  check('restored slider=5', v['s1'] === '5', JSON.stringify(v));
  check('restored mul=65', v['mul1'] === '65', JSON.stringify(v));
  check('restored out=65', v['out1'] === '65', JSON.stringify(v));

  console.log('» undo/redo + copy/paste');
  const nodeCards = () => page.locator('.node-card').count();
  const base = await nodeCards();
  check('demo has 6 nodes', base === 6, String(base));

  await page.locator('.node-id', { hasText: 'c1' }).click();
  await page.waitForTimeout(200);
  await page.keyboard.press('Control+c');
  await page.waitForTimeout(200);
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(800);
  const afterPaste = await nodeCards();
  check('paste adds a node', afterPaste === base + 1, `${base} -> ${afterPaste}`);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(500);
  const afterUndo = await nodeCards();
  check('undo reverts paste', afterUndo === base, `${afterPaste} -> ${afterUndo}`);

  await page.keyboard.press('Control+Shift+z');
  await page.waitForTimeout(500);
  const afterRedo = await nodeCards();
  check('redo re-applies paste', afterRedo === base + 1, `${afterUndo} -> ${afterRedo}`);

  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);

  console.log('» theme toggle');
  const htmlTheme = () => page.evaluate(() => document.documentElement.dataset.theme ?? 'dark');
  const startTheme = await htmlTheme();
  await page.locator('.theme-toggle').click();
  await page.waitForTimeout(200);
  const afterToggle = await htmlTheme();
  check('theme toggles', afterToggle !== startTheme, `start=${startTheme} after=${afterToggle}`);
  await page.locator('.theme-toggle').click();
  await page.waitForTimeout(200);
  check('theme toggles back', (await htmlTheme()) === startTheme);

  console.log('» zoom hud');
  const zoomPct = page.locator('.hud-zoom-pct');
  check('zoom hud visible', (await zoomPct.count()) === 1);
  const pct = async () => Number((await zoomPct.textContent()).replace('%', ''));
  check('initial zoom 100%', (await pct()) === 100, String(await pct()));
  await page.locator('button[aria-label="zoom-in"]').click();
  await page.waitForTimeout(200);
  check('zoom in increases', (await pct()) > 100, String(await pct()));
  await page.locator('button[aria-label="fit"]').click();
  await page.waitForTimeout(200);
  check('fit keeps nodes in view', (await pct()) > 0 && (await pct()) <= 100, String(await pct()));

  console.log('» text/concat graph via Import');
  const textGraph = {
    nodes: [
      { id: 't1', kind: 'text', params: { text: 'Hello' }, x: 40, y: 40 },
      { id: 't2', kind: 'text', params: { text: ' world' }, x: 40, y: 160 },
      { id: 'cc1', kind: 'concat', params: {}, x: 240, y: 100 },
      { id: 'u1', kind: 'uppercase', params: {}, x: 440, y: 40 },
      { id: 'l1', kind: 'lowercase', params: {}, x: 440, y: 160 },
      { id: 'ln1', kind: 'length', params: {}, x: 640, y: 100 },
      { id: 'o1', kind: 'output', params: {}, x: 820, y: 60 },
    ],
    edges: [
      { id: 'e1', from: 't1', fromPort: 'value', to: 'cc1', toPort: 'a' },
      { id: 'e2', from: 't2', fromPort: 'value', to: 'cc1', toPort: 'b' },
      { id: 'e3', from: 'cc1', fromPort: 'out', to: 'u1', toPort: 'text' },
      { id: 'e4', from: 'cc1', fromPort: 'out', to: 'l1', toPort: 'text' },
      { id: 'e5', from: 'cc1', fromPort: 'out', to: 'ln1', toPort: 'text' },
      { id: 'e6', from: 'u1', fromPort: 'out', to: 'o1', toPort: 'in' },
    ],
  };
  await page.locator('#file-import').setInputFiles({
    name: 'text-graph.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(textGraph)),
  });
  await page.waitForTimeout(1200);
  v = await readNodeValues();
  console.log('  values:', JSON.stringify(v));
  check('concat=Hello world', v['cc1'] === 'Hello world', JSON.stringify(v));
  check('uppercase=HELLO WORLD', v['u1'] === 'HELLO WORLD', JSON.stringify(v));
  check('lowercase=hello world', v['l1'] === 'hello world', JSON.stringify(v));
  check('length=11', v['ln1'] === '11', JSON.stringify(v));
  check('out=HELLO WORLD', v['o1'] === 'HELLO WORLD', JSON.stringify(v));

  console.log('» text node param edit');
  await page.locator('.node-id', { hasText: 't1' }).click();
  await page.waitForTimeout(300);
  const textInput = page.locator('input[type=text]').first();
  check('text param input exists', (await textInput.count()) === 1);
  await textInput.fill('Hi');
  await page.waitForTimeout(800);
  v = await readNodeValues();
  console.log('  values:', JSON.stringify(v));
  check('concat=Hi world', v['cc1'] === 'Hi world', JSON.stringify(v));

  console.log('» extended node library via Import');
  const libraryGraph = {
    nodes: [
      { id: 'x', kind: 'constant', params: { value: 15 }, x: 40, y: 40 },
      { id: 'cl', kind: 'clamp', params: {}, x: 240, y: 40 },
      { id: 'lp', kind: 'lerp', params: {}, x: 240, y: 180 },
      { id: 'md', kind: 'mod', params: {}, x: 240, y: 320 },
      { id: 'gd', kind: 'gcd', params: {}, x: 240, y: 460 },
      { id: 'pn', kind: 'parsenum', params: {}, x: 460, y: 40 },
      { id: 'sb', kind: 'substring', params: {}, x: 460, y: 180 },
      { id: 'tr', kind: 'trim', params: {}, x: 460, y: 320 },
      { id: 'rp', kind: 'replace', params: {}, x: 460, y: 460 },
      { id: 'inc', kind: 'includes', params: {}, x: 680, y: 40 },
      { id: 'sw', kind: 'startswith', params: {}, x: 680, y: 180 },
      { id: 'out', kind: 'output', params: {}, x: 900, y: 40 },
    ],
    edges: [
      { id: 'we1', from: 'x', fromPort: 'value', to: 'cl', toPort: 'a' },
      { id: 'we2', from: 'x', fromPort: 'value', to: 'lp', toPort: 'a' },
      { id: 'we3', from: 'cl', fromPort: 'out', to: 'out', toPort: 'in' },
    ],
  };
  await page.locator('#file-import').setInputFiles({
    name: 'lib-graph.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(libraryGraph)),
  });
  await page.waitForTimeout(1200);
  v = await readNodeValues();
  console.log('  values:', JSON.stringify(v));
  check('clamp(15,0,0)=0', v['cl'] === '0', JSON.stringify(v));
  check('lerp(15,0,0)=15', v['lp'] === '15', JSON.stringify(v));
  check('mod(15,0)=NaN', v['md'] === 'NaN', JSON.stringify(v));
  check('gcd unbound=0', v['gd'] === '0', JSON.stringify(v));
  check('parsenum empty=0', v['pn'] === '0', JSON.stringify(v));
  check('substring empty=""', v['sb'] === '', JSON.stringify(v));
  check('trim coerces to "0"', v['tr'] === '0', JSON.stringify(v));
  check('replace of "0" is "0"', v['rp'] === '0', JSON.stringify(v));
  check('includes("0","0")=true', v['inc'] === 'true', JSON.stringify(v));
  check('startswith("0","0")=true', v['sw'] === 'true', JSON.stringify(v));

  console.log('» incompatible port hover feedback');
  const xOut = page.locator('.node-card:has(.node-id:text("x")) .port-out').first();
  const incIn = page.locator('.node-card:has(.node-id:text("inc")) .port-in').first();
  const xOutBox = await xOut.boundingBox();
  const incInBox = await incIn.boundingBox();
  const edgesBeforeHover = await page.locator('.edge-layer path').count();
  check('port boxes found', !!xOutBox && !!incInBox);
  await page.mouse.move(xOutBox.x + xOutBox.width / 2, xOutBox.y + xOutBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(incInBox.x + incInBox.width / 2, incInBox.y + incInBox.height / 2, { steps: 8 });
  await page.waitForTimeout(300);
  const incClass = await incIn.evaluate((el) => el.className);
  check('incompatible hover class applied', incClass.includes('port-incompatible'), incClass);
  const ghostStroke = await page
    .locator('.ghost-line path')
    .count()
    .then((n) => (n ? page.locator('.ghost-line path').getAttribute('stroke') : null));
  check('ghost line turns red', ghostStroke === '#ef4444', String(ghostStroke));
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.waitForTimeout(300);
  const edgesAfterHover = await page.locator('.edge-layer path').count();
  check('no edge created on incompatible drop', edgesAfterHover === edgesBeforeHover, `${edgesBeforeHover} -> ${edgesAfterHover}`);

  console.log('» edge selection + remove in inspector');
  const worldT = await page.evaluate(() => document.querySelector('.world')?.style.transform ?? '');
  const wm = worldT.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.]+)\)/);
  const [offX, offY, scaleK] = wm ? [parseFloat(wm[1]), parseFloat(wm[2]), parseFloat(wm[3])] : [40, 40, 1];
  const firstEdge = page.locator('.edge-layer path').nth(2);
  const t = await firstEdge.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, rect: `${r.x.toFixed(1)},${r.y.toFixed(1)} ${r.width.toFixed(1)}x${r.height.toFixed(1)}` };
  });
  console.log(`  click edge rect=${t.rect}  screen transform is`, worldT);
  const sx = t.x;
  const sy = t.y;
  const hitEl = await page.evaluate(([px, py]) => {
    const el = document.elementFromPoint(px, py);
    return el ? `${el.tagName}.${el.className}` : 'none';
  }, [sx, sy]);
  console.log(`  hit=${hitEl}`);
  await page.mouse.move(sx, sy);
  await page.mouse.click(sx, sy);
  await page.waitForTimeout(300);
  check('edge inspector visible', (await page.locator('.inspector-title', { hasText: 'Edge' }).count()) === 1);
  const removeBtn = page.locator('.danger-btn').first();
  check('remove edge button visible', (await removeBtn.count()) === 1);
  const edgesBeforeRemove = await page.locator('.edge-layer path').count();
  await removeBtn.click();
  await page.waitForTimeout(600);
  v = await readNodeValues();
  console.log('  values:', JSON.stringify(v));
  const edgesAfterRemove = await page.locator('.edge-layer path').count();
  check('edge removed from canvas', edgesAfterRemove === edgesBeforeRemove - 1, `${edgesBeforeRemove} -> ${edgesAfterRemove}`);
  check('output input detached', v['out'] === '∅', JSON.stringify(v));
  check('inspector cleared after remove', (await page.locator('.inspector-title', { hasText: 'Edge' }).count()) === 0);

  console.log('» example gallery');
  const galleryBtn = page.locator('.gallery-toggle').first();
  check('gallery button visible', (await galleryBtn.count()) === 1);
  await galleryBtn.click();
  await page.waitForTimeout(300);
  const cards = page.locator('.gallery-card');
  check('gallery lists 4 examples', (await cards.count()) === 4, String(await cards.count()));
  await cards.nth(0).click(); // °F → °C
  await page.waitForTimeout(1200);
  v = await readNodeValues();
  console.log('  values:', JSON.stringify(v));
  check('example F->C loads (8 nodes)', v['o1'] === '25', JSON.stringify(v));
  check('converter intermediate 45', v['s1'] === '45', JSON.stringify(v));

  await galleryBtn.click();
  await page.waitForTimeout(200);
  await page.locator('.gallery-card').nth(2).click(); // text pipeline
  await page.waitForTimeout(1200);
  v = await readNodeValues();
  console.log('  values:', JSON.stringify(v));
  check('text pipeline output', v['o1'] === 'HELLO UNIVERSE', JSON.stringify(v));

  console.log('» minimap');
  const mini = page.locator('.minimap');
  check('minimap visible', (await mini.count()) === 1);
  const miniNodeRects = await page.locator('.minimap rect[data-id]').count();
  check('minimap draws node rects', miniNodeRects >= 6, `rects=${miniNodeRects}`);
  const viewportRect = await page.locator('.minimap .minimap-viewport').count();
  check('minimap viewport indicator', viewportRect === 1, `vp=${viewportRect}`);
  const worldT0 = await page.evaluate(() => document.querySelector('.world')?.style.transform ?? '');
  const mb = await mini.boundingBox();
  await page.mouse.click(mb.x + mb.width * 0.78, mb.y + mb.height * 0.72);
  await page.waitForTimeout(300);
  const worldT1 = await page.evaluate(() => document.querySelector('.world')?.style.transform ?? '');
  check('minimap click pans canvas', worldT0 !== worldT1, `${worldT0} -> ${worldT1}`);

  if (consoleErrors.length) {
    check('no console errors', false, consoleErrors.slice(0, 5).join('\n      '));
  } else {
    console.log('  ok  no console errors');
  }
} catch (err) {
  failed++;
  console.log('FAIL', err.message);
} finally {
  await browser?.close();
  server.close();
}

if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nall e2e checks passed');