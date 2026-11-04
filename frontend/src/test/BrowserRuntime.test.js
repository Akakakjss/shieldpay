import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Execute the verifier's real startup preamble without spawning a backend or listeners.
// Only filesystem creation and the disposable port reservation are replaced.
async function startup(platform, env) {
  const source = await readFile(path.join(process.cwd(), 'scripts', 'verify-browser.mjs'), 'utf8');
  const preamble = source
    .slice(source.indexOf('// Real HTTP integration:'), source.indexOf('const backend = spawn('))
    .replaceAll(
      'import.meta.url',
      JSON.stringify('file:///repo/frontend/scripts/verify-browser.mjs'),
    );
  const evaluate = new (Object.getPrototypeOf(async function () {}).constructor)(
    'process',
    'path',
    'fs',
    'fileURLToPath',
    'createServer',
    'tmpdir',
    preamble + '\nreturn { python, db };',
  );
  return evaluate(
    { platform, pid: 123, env },
    path.posix,
    { mkdir: async () => {} },
    () => '/repo/frontend',
    () => ({
      listen: (_port, _host, done) => done(),
      address: () => ({ port: 1234 }),
      close: (done) => done(),
    }),
    () => '/os-scratch',
  );
}

describe('portable browser verification startup', () => {
  it('defaults to Playwright Chromium and supports an installed browser override', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'scripts', 'verify-browser.mjs'),
      'utf8',
    );
    const start = source.indexOf('  browser = await chromium.launch(');
    const statement = source.slice(start, source.indexOf(';', start) + 1);
    const evaluate = new (Object.getPrototypeOf(async function () {}).constructor)(
      'process',
      'chromium',
      'let browser; ' + statement,
    );
    for (const [env, expected] of [
      [{}, { headless: true }],
      [{ PLAYWRIGHT_CHANNEL: 'chrome' }, { headless: true, channel: 'chrome' }],
      [
        { PLAYWRIGHT_EXECUTABLE_PATH: '/installed/chromium' },
        { headless: true, executablePath: '/installed/chromium' },
      ],
    ]) {
      let options;
      await evaluate(
        { env },
        {
          launch: async (value) => {
            options = value;
          },
        },
      );
      expect(options).toEqual(expected);
    }
  });
  it('uses the POSIX virtualenv and OS scratch fallback without Hermes environment variables', async () => {
    expect(await startup('linux', {})).toEqual({
      python: '/repo/.venv/bin/python',
      db: '/os-scratch/shieldpay-browser-123.sqlite3',
    });
  });
  it('preserves explicit Python and scratch overrides', async () => {
    expect(
      await startup('win32', { TMPDIR: '/scratch', SHIELDPAY_TEST_PYTHON: '/custom/python' }),
    ).toEqual({ python: '/custom/python', db: '/scratch/shieldpay-browser-123.sqlite3' });
  });
});
