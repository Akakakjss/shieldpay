import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';

// Real HTTP integration: isolated synthetic DB, real backend, built UI.
// Both temporary listeners and the backend child are closed in finally.
const frontend = fileURLToPath(new URL('..', import.meta.url));
const repo = path.dirname(frontend);
const artifacts = path.join(frontend, 'test-artifacts');
await fs.mkdir(artifacts, { recursive: true });
const scratch = process.env.TMPDIR || tmpdir();
const browserAI = process.env.SHIELDPAY_BROWSER_AI || 'lexical';
if (!['lexical', 'onnx'].includes(browserAI))
  throw new Error('SHIELDPAY_BROWSER_AI must be lexical or onnx');
const db = path.join(scratch, `shieldpay-browser-${process.pid}.sqlite3`);
const reserve = createServer();
await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
const backendPort = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
let logs = '';
const python =
  process.env.SHIELDPAY_TEST_PYTHON ||
  path.join(
    repo,
    '.venv',
    ...(process.platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python']),
  );
const backend = spawn(
  python,
  ['-m', 'uvicorn', 'backend.app:app', '--host', '127.0.0.1', '--port', String(backendPort)],
  {
    cwd: repo,
    env: {
      ...process.env,
      SHIELDPAY_MODE: 'demo',
      SHIELDPAY_AI: browserAI,
      SHIELDPAY_DB: db,
      PAYPAL_CLIENT_ID: '',
      PAYPAL_CLIENT_SECRET: '',
      SHIELDPAY_ADMIN_TOKEN: '',
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
backend.stdout.on('data', (chunk) => {
  logs += chunk;
});
backend.stderr.on('data', (chunk) => {
  logs += chunk;
});
let server, browser;
const report = {
  realBackend: true,
  ai: browserAI === 'onnx' ? 'local-onnx' : 'lexical-baseline',
  checks: [],
  consoleErrors: [],
  requestFailures: [],
};
try {
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      const result = await fetch(`http://127.0.0.1:${backendPort}/api/health`);
      if (result.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Temporary backend did not start. ' + logs);
  server = createServer(async (req, res) => {
    if (req.url.startsWith('/api/')) {
      const proxy = httpRequest(
        {
          hostname: '127.0.0.1',
          port: backendPort,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        (response) => {
          res.writeHead(response.statusCode, response.headers);
          response.pipe(res);
        },
      );
      proxy.on('error', (error) => {
        res.writeHead(502);
        res.end(error.message);
      });
      req.pipe(proxy);
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const root = path.join(frontend, 'dist');
      let target = path.resolve(root, '.' + pathname);
      if (!target.startsWith(root + path.sep) && target !== root) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (pathname === '/' || !path.extname(pathname)) target = path.join(root, 'index.html');
      const body = await fs.readFile(target);
      const types = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.svg': 'image/svg+xml',
      };
      res.writeHead(200, {
        'Content-Type': types[path.extname(target)] || 'application/octet-stream',
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : process.env.PLAYWRIGHT_CHANNEL
        ? { channel: process.env.PLAYWRIGHT_CHANNEL }
        : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (req) =>
    report.requestFailures.push(`${req.method()} ${req.url()} ${req.failure()?.errorText}`),
  );
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Synthetic Buyer 1042' })).toBeVisible();
  await expect(page.getByRole('grid')).toBeVisible();
  await expect(page.getByText('$387.00')).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'operator-desktop.png'), fullPage: true });
  report.checks.push('Real AG Grid, three API cases, API-derived $387.00 synthetic exposure');
  const desktopAxe = await new AxeBuilder({ page }).analyze();
  report.desktopAccessibility = desktopAxe.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
  }));
  await page.getByRole('button', { name: 'Analyze evidence', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prepare a response' })).toBeVisible({
    timeout: 90000,
  });
  await expect(
    page.getByText(
      browserAI === 'onnx'
        ? 'Local ONNX retrieval · not a generative LLM'
        : 'Lexical baseline · not a generative LLM',
    ),
  ).toBeVisible();
  report.checks.push(
    browserAI === 'onnx'
      ? 'Actual browser analysis completed real local ONNX inference'
      : 'Explicit lexical browser baseline',
  );
  await page.getByRole('button', { name: 'Inspect source 1042-carrier', exact: true }).click();
  await expect(page.locator('.source-record.source-focused .source-text')).toContainText(
    'Delivery status: DELIVERED',
  );
  await expect(
    page.getByRole('tabpanel').getByText('Synthetic unrelated order (excluded)'),
  ).toHaveCount(0);
  await page.getByRole('tab', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Approve packet', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Generate PDF packet', exact: true }).click();
  await expect(page.getByTitle('Evidence packet PDF preview')).toBeVisible();
  await page.getByRole('button', { name: 'Preview PayPal JSON + PDF parts', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'PayPal multipart payload preview' }),
  ).toContainText('SYNTH-TRACK-1042');
  await expect(
    page.getByRole('region', { name: 'PayPal multipart payload preview' }),
  ).toContainText('application/pdf');
  report.checks.push(
    'Actual generated PDF inline preview and server-generated JSON + binary PDF part preview',
  );
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download evidence PDF' }).click();
  const download = await downloadEvent;
  const pdfPath = path.join(artifacts, 'synthetic-evidence.pdf');
  await download.saveAs(pdfPath);
  const bytes = await fs.readFile(pdfPath);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  report.pdfBytes = bytes.length;
  await page.getByRole('textbox', { name: 'Approved by' }).fill('Browser test operator');
  await page.getByRole('checkbox', { name: /I reviewed the PDF/ }).check();
  await page.getByRole('button', { name: 'Approve packet', exact: true }).click();
  await expect(page.getByText('Approved locally · not sent to PayPal')).toBeVisible();
  await page.getByRole('button', { name: 'Simulate submission', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Simulate submission', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm simulation', exact: true }).click();
  await expect(page.getByText('Simulated · not submitted to PayPal')).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'operator-simulated.png'), fullPage: true });
  report.checks.push(
    'Analyze → exact scoped quotation → real PDF download → explicit approval → confirmation → real backend simulation receipt',
  );
  await page
    .getByRole('button', { name: 'Open Synthetic Buyer 1043 DEMO-1043', exact: true })
    .click();
  await page.getByRole('button', { name: 'Analyze evidence', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Submission blocked' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve packet' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Simulate submission' })).toBeDisabled();
  await page.screenshot({ path: path.join(artifacts, 'operator-blocked.png'), fullPage: true });
  report.checks.push('Missing delivery proof blocks approval and submission');
  await page
    .getByRole('button', { name: 'Open Synthetic Buyer 1044 DEMO-1044', exact: true })
    .click();
  await page.getByRole('button', { name: 'Analyze evidence', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review for a refund' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve packet' })).toBeDisabled();
  report.checks.push('Wrong-item report routes to refund review, never fraud accusation');
  await page.getByRole('button', { name: 'Audit trail', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'simulated submission' })).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, 'operator-audit.png'), fullPage: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByText('Sandbox credentials missing. Demo never calls PayPal.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sync sandbox disputes', exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: path.join(artifacts, 'operator-settings.png'), fullPage: true });
  report.checks.push('Real audit readback and honest credential/provider settings');
  await page.getByRole('button', { name: 'Reset synthetic demo', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm reset', exact: true }).click();
  await expect(page.getByText('Synthetic workspace reset.')).toBeVisible();
  await page.getByRole('button', { name: 'Queue', exact: true }).click();
  await page
    .getByRole('button', { name: 'Open Synthetic Buyer 1042 DEMO-1042', exact: true })
    .click();
  await page.getByRole('button', { name: 'Analyze evidence', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prepare a response' })).toBeVisible({
    timeout: 90000,
  });
  await page.getByRole('button', { name: 'Generate PDF packet', exact: true }).click();
  await page.getByRole('textbox', { name: 'Approved by' }).fill('Drift scenario reviewer');
  await page.getByRole('checkbox', { name: /I reviewed the PDF/ }).check();
  await page.getByRole('button', { name: 'Approve packet', exact: true }).click();
  await expect(page.getByText('Approved locally · not sent to PayPal')).toBeVisible();
  const prior = await (await fetch(base + '/api/cases/DEMO-1042')).json();
  await page.getByRole('button', { name: 'Simulate late buyer message', exact: true }).click();
  await page.getByRole('button', { name: 'Add synthetic message', exact: true }).click();
  await expect(page.getByText('Approval invalidated', { exact: true })).toBeVisible();
  await expect(page.getByTitle('Evidence packet PDF preview')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Simulate submission', exact: true })).toHaveCount(
    0,
  );
  const changed = await (await fetch(base + '/api/cases/DEMO-1042')).json();
  expect(changed.analysis).toBeNull();
  expect(changed.risk).toBe('review');
  expect(changed.sources.length).toBeGreaterThan(prior.sources.length);
  await page.getByRole('button', { name: 'Analyze evidence', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review for a refund' })).toBeVisible({
    timeout: 90000,
  });
  const blockedAfterDrift = await (await fetch(base + '/api/cases/DEMO-1042')).json();
  expect(blockedAfterDrift.risk).toBe('blocked');
  await expect(page.getByRole('button', { name: 'Approve packet', exact: true })).toBeDisabled();
  await page.screenshot({ path: path.join(artifacts, 'operator-drift.png'), fullPage: true });
  report.checks.push(
    'Actual approved packet invalidated by late synthetic message; old PDF removed and new defense blocked',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(artifacts, 'operator-mobile.png'), fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow, 'No page-level horizontal overflow at 390 px').toBe(false);
  report.checks.push('390px mobile layout has no page-level horizontal overflow');
  const mobileAxe = await new AxeBuilder({ page }).analyze();
  report.mobileAccessibility = mobileAxe.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
  }));
  await fs.writeFile(path.join(artifacts, 'browser-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  expect(report.consoleErrors, 'No browser runtime errors').toEqual([]);
  expect(
    report.desktopAccessibility.filter((v) => ['serious', 'critical'].includes(v.impact)),
    'No serious/critical desktop axe violations',
  ).toEqual([]);
  expect(
    report.mobileAccessibility.filter((v) => ['serious', 'critical'].includes(v.impact)),
    'No serious/critical mobile axe violations',
  ).toEqual([]);
} catch (error) {
  report.error = error.message;
  await fs.writeFile(path.join(artifacts, 'browser-report.json'), JSON.stringify(report, null, 2));
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  backend.kill();
  await new Promise((resolve) => {
    if (backend.exitCode !== null) resolve();
    else {
      backend.once('exit', resolve);
      setTimeout(resolve, 3000).unref();
    }
  });
  for (const suffix of ['', '-wal', '-shm']) await fs.unlink(db + suffix).catch(() => {});
}
