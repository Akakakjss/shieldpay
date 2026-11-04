// Record actual synthetic UI interactions, not fabricated application frames.
import { chromium, expect } from '../frontend/node_modules/@playwright/test/index.mjs';
import { promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'artifacts');
const base = process.env.SHIELDPAY_RECORD_URL || 'http://127.0.0.1:8790';
const url = new URL(base);
if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Recording is localhost-only.');
const health = await (await fetch(base + '/api/health')).json();
if (health.mode !== 'demo') throw new Error('Refusing to record or reset a non-demo instance.');
await fs.mkdir(path.join(artifacts, 'recording'), { recursive: true });
await fetch(base + '/api/demo/reset', { method: 'POST' });
// Warm real inference outside the take. Verify it again in the take.
const warm = await (await fetch(base + '/api/cases/DEMO-1042/analyze', { method: 'POST' })).json();
if (warm.provider !== 'local-onnx') throw new Error('Real ONNX inference required; refusing to relabel fallback.');
await fetch(base + '/api/demo/reset', { method: 'POST' });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, recordVideo: { dir: path.join(artifacts, 'recording'), size: { width: 1600, height: 1000 } }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const video = page.video();
const started = Date.now();
const timeline = [];
async function at(seconds, action) {
  await new Promise(resolve => setTimeout(resolve, Math.max(0, seconds * 1000 - (Date.now() - started))));
  await action();
  timeline.push({ plannedSecond: seconds, actualSecond: (Date.now() - started) / 1000 });
}
try {
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Synthetic Buyer 1042' })).toBeVisible();
  await at(21, async () => {
    await page.getByRole('button', { name: 'Analyze evidence', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Prepare a response' })).toBeVisible();
    await expect(page.getByText('Local ONNX retrieval · not a generative LLM')).toBeVisible();
  });
  await at(37, async () => {
    await page.getByRole('button', { name: 'Inspect source 1042-carrier', exact: true }).click();
    await expect(page.locator('.source-record.source-focused .source-text')).toContainText('DELIVERED');
  });
  await at(48, async () => { await page.getByRole('tab', { name: 'Review', exact: true }).click(); });
  await at(54, async () => {
    await page.getByRole('button', { name: 'Generate PDF packet', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download evidence PDF' }).click();
    await (await pending).saveAs(path.join(artifacts, 'recorded-evidence.pdf'));
    const renderer = "import fitz,sys; d=fitz.open(sys.argv[1]); d[0].get_pixmap(matrix=fitz.Matrix(1.4,1.4)).save(sys.argv[2])";
    const result = spawnSync('uv', ['run', '--with', 'pymupdf', 'python', '-c', renderer, path.join(artifacts, 'recorded-evidence.pdf'), path.join(artifacts, 'recorded-pdf-page.png')], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Actual PDF rendering failed: ' + result.stderr);
  });
  await at(61, async () => {
    const png = (await fs.readFile(path.join(artifacts, 'recorded-pdf-page.png'))).toString('base64');
    await page.goto('about:blank');
    await page.setContent(`<body style="margin:0;background:#e7e6e0;font:16px sans-serif"><div style="padding:10px 24px">Actual downloaded PDF · page 1 · synthetic demonstration</div><img style="height:950px;display:block;margin:auto" src="data:image/png;base64,${png}"></body>`);
  });
  await at(80, async () => {
    await page.goto(base);
    await expect(page.getByRole('button', { name: 'Generate PDF packet', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Generate PDF packet', exact: true }).click();
    await page.getByRole('textbox', { name: 'Approved by' }).fill('Demo reviewer');
    await page.getByRole('checkbox', { name: /I reviewed the PDF/ }).check();
    await page.getByRole('button', { name: 'Approve packet', exact: true }).click();
    await expect(page.getByText('Approved locally · not sent to PayPal')).toBeVisible();
  });
  await at(94, async () => {
    await page.getByRole('button', { name: 'Simulate submission', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm simulation', exact: true }).click();
    await expect(page.getByText('Simulated · not submitted to PayPal')).toBeVisible();
  });
  await at(105, async () => { await page.getByRole('button', { name: 'Audit trail', exact: true }).click(); });
  await at(111, async () => {
    await page.getByRole('button', { name: 'Queue', exact: true }).click();
    await page.getByRole('button', { name: 'Open Synthetic Buyer 1043 DEMO-1043', exact: true }).click();
    await page.getByRole('button', { name: 'Analyze evidence', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Submission blocked' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve packet', exact: true })).toBeDisabled();
  });
  await at(123, async () => {
    await page.getByRole('button', { name: 'Open Synthetic Buyer 1044 DEMO-1044', exact: true }).click();
    await page.getByRole('button', { name: 'Analyze evidence', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Review for a refund' })).toBeVisible();
  });
  await at(135, async () => {
    const proof = JSON.parse(await fs.readFile(path.join(artifacts, 'sandbox-verification.json'), 'utf8'));
    if (!proof.oauth_and_disputes_verified || proof.remote_writes_sent !== 0) throw new Error('Missing actual read-only sandbox proof.');
    const safe = JSON.stringify(proof, null, 2).replaceAll('&', '&amp;').replaceAll('<', '&lt;');
    await page.goto('about:blank');
    await page.setContent(`<body style="padding:70px;font:24px/1.7 monospace;background:#fcfbf7;color:#233733"><h1>Separate PayPal sandbox verification</h1><p>Actual read-only check. No evidence or money writes.</p><pre style="font-size:20px;white-space:pre-wrap">${safe}</pre></body>`);
  });
  await at(150, async () => { await page.goto(base); await page.getByRole('heading', { name: 'Dispute queue' }).waitFor(); });
  await at(160, async () => {});
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await context.close();
  await video.saveAs(path.join(artifacts, 'shieldpay-demo-raw.webm'));
  await browser.close();
  await fs.writeFile(path.join(artifacts, 'recording-timeline.json'), JSON.stringify({ timeline, errors, synthetic: true, actualOnnx: true, remoteEvidenceWrites: 0 }, null, 2));
}
console.log('Recorded actual UI and PDF to artifacts/shieldpay-demo-raw.webm');
