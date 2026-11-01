import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// runs/ is read-only (AGENTS.md): route tests build their own nights in a temp dir.
const runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir,
};

beforeAll(() => {
  writeFileSync(
    join(runsDir, '2026-10-28.jsonl'),
    [
      '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
      '{"at":"2026-10-29T04:00:01+01:00","job":"notes/backup","status":"fail","owner":"lane-07","error":"quota exceeded"}',
      'this line does not parse',
    ].join('\n'),
  );
  writeFileSync(join(runsDir, '2026-10-27.jsonl'), '');
});

afterAll(() => rmSync(runsDir, { recursive: true, force: true }));

const app = createApp(config);

describe('digest routes', () => {
  it('renders the night page and counts its bad line', async () => {
    const res = await app.request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('rig/rotate-logs');
    expect(html).toContain('quota exceeded');
    expect(html).toContain('did not parse');
  });

  it('answers 404 for a night with no file', async () => {
    expect((await app.request('/digest/2000-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2000-01-01')).status).toBe(404);
  });

  it('renders "nothing ran" for an empty night', async () => {
    const res = await app.request('/digest/2026-10-27');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('serves the same rows as JSON, in the same order as the page', async () => {
    const page = await (await app.request('/digest/2026-10-28')).text();
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as {
      rows: { job: string }[];
    };
    const jobs = body.rows.map((row) => row.job);
    expect(jobs).toEqual(['notes/backup', 'rig/rotate-logs']);
    for (const job of jobs) expect(page).toContain(`<td>${job}</td>`);
    expect(page.indexOf('<td>notes/backup</td>')).toBeLessThan(
      page.indexOf('<td>rig/rotate-logs</td>'),
    );
  });
});
