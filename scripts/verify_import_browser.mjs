// Actual HTTP/browser verification against isolated synthetic sandbox-shaped data.
import { chromium, expect } from '../frontend/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '../frontend/node_modules/@axe-core/playwright/dist/index.mjs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reserve = createServer();
await new Promise(r => reserve.listen(0, '127.0.0.1', r));
const port = reserve.address().port;
await new Promise(r => reserve.close(r));
const db = path.join(process.env.TMPDIR || tmpdir(), `shieldpay-import-browser-${process.pid}.db`);
const python = path.join(root, '.venv', ...(process.platform === 'win32' ? ['Scripts','python.exe'] : ['bin','python']));
const child = spawn(python, ['scripts/sandbox_browser_fixture.py'], {
  cwd: root, stdio: ['ignore','pipe','pipe'], windowsHide: true,
  env: {...process.env, PAYPAL_CLIENT_ID:'', PAYPAL_CLIENT_SECRET:'', SHIELDPAY_ADMIN_TOKEN:'', SHIELDPAY_FIXTURE_DB:db, SHIELDPAY_FIXTURE_PORT:String(port)}
});
let logs = '';
child.stderr.on('data', x => { logs += x; });
const report = { syntheticFixture:true, realHttpBackend:true, realPayPalCalls:false, checks:[], pageErrors:[] };
let browser;
try {
  const base = `http://127.0.0.1:${port}`;
  let ready=false;
  for(let i=0;i<150;i++) {
    try { if((await fetch(base+'/api/health')).ok) {ready=true;break;} } catch {}
    await new Promise(r=>setTimeout(r,100));
  }
  if(!ready) throw new Error('Fixture failed to start: '+logs);
  const protectedRead = await fetch(base+'/api/cases');
  expect(protectedRead.status).toBe(401);
  report.checks.push('Unauthenticated sandbox records rejected with401');
  browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1100}});
  const page = await context.newPage();
  page.on('pageerror',e=>report.pageErrors.push(e.message));
  await page.goto(base);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByLabel('Session admin token').fill('synthetic-browser-only');
  await page.getByRole('button',{name:'Unlock sandbox records',exact:true}).click();
  await expect(page.getByText('Sandbox records unlocked for this session.')).toBeVisible();
  await page.getByRole('button',{name:'Queue',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Synthetic browser fixture'})).toBeVisible();
  await page.getByRole('button',{name:'Analyze evidence',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Prepare a response'})).toBeVisible();
  await page.getByRole('button',{name:'Generate PDF packet',exact:true}).click();
  await page.getByRole('textbox',{name:'Approved by'}).fill('Synthetic test reviewer');
  await page.getByRole('checkbox',{name:/I reviewed the PDF/}).check();
  await page.getByRole('button',{name:'Approve packet',exact:true}).click();
  await expect(page.getByText('Approved locally · not sent to PayPal')).toBeVisible();
  await page.getByRole('tab',{name:'Evidence (3)',exact:true}).click();
  await page.getByText('Import sandbox evidence',{exact:true}).click();
  const payload = [{type:'order',title:'Synthetic replacement',text:'Order: ORDER-1042\nTracking: TEST-REPLACED',occurred_at:'2025-01-01T12:00:00Z',order_id:'ORDER-1042'}];
  await page.getByLabel('Source records JSON').fill(JSON.stringify(payload));
  await page.getByLabel('Reviewed by',{exact:true}).fill('Synthetic import reviewer');
  await page.getByRole('checkbox',{name:/I acknowledge these records/}).check();
  await page.getByRole('button',{name:'Review replacement',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Replace this case’s evidence?'})).toBeVisible();
  await page.getByRole('button',{name:'Confirm replacement',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'1 record(s) replaced'})).toBeVisible();
  await expect(page.getByLabel('Source records JSON')).toHaveValue('');
  await expect(page.getByLabel('Reviewed by',{exact:true})).toHaveValue('');
  await expect(page.getByRole('checkbox',{name:/I acknowledge these records/})).not.toBeChecked();
  await expect(page.getByText('UNVERIFIED human-provided | Synthetic replacement',{exact:true})).toBeVisible();
  report.checks.push('Protected UI unlock; actual local replacement; exact provenance; form reset');
  await fs.mkdir(path.join(root,'artifacts'),{recursive:true});
  await page.screenshot({path:path.join(root,'artifacts/import-browser-desktop.png'),fullPage:true});
  await page.getByRole('tab',{name:'Review',exact:true}).click();
  await expect(page.getByRole('button',{name:'Analyze evidence',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Download evidence PDF'})).toHaveCount(0);
  await expect(page.getByText('Approved locally · not sent to PayPal')).toHaveCount(0);
  await page.getByRole('button',{name:'Analyze evidence',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Submission blocked'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Approve packet',exact:true})).toBeDisabled();
  report.checks.push('Replacement invalidates analysis/PDF/approval; missing proof blocks new defense');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const axe = await new AxeBuilder({page}).analyze();
  report.accessibility = axe.violations.map(v=>({id:v.id,impact:v.impact}));
  expect(report.accessibility.filter(v=>['critical','serious'].includes(v.impact))).toEqual([]);
  await page.screenshot({path:path.join(root,'artifacts/import-browser-mobile.png'),fullPage:true});
  report.checks.push('390px mobile layout and no serious/critical axe violations');
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Clear session token',exact:true}).click();
  await page.getByRole('button',{name:'Queue',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Synthetic browser fixture'})).toHaveCount(0);
  report.checks.push('Clearing token removes sensitive records from UI');
  expect(report.pageErrors).toEqual([]);
  report.passed=true;
} catch(e) {report.error=e.message;throw e;}
finally {
  await browser?.close();
  child.kill();
  await new Promise(resolve=>{if(child.exitCode!==null)resolve();else{child.once('exit',resolve);setTimeout(resolve,3000).unref();}});
  await fs.writeFile(path.join(root,'artifacts/import-browser-verification.json'),JSON.stringify(report,null,2));
  for(const suffix of ['', '-wal','-shm'])await fs.unlink(db+suffix).catch(()=>{});
  console.log(JSON.stringify(report,null,2));
}
