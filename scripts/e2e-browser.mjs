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