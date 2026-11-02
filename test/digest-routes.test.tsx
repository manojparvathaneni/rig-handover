import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

type Row = { job: string };
type Body = { night: string; rows: Row[]; badLines: number };

const line = (o: Record<string, unknown>) => JSON.stringify(o);
const good = [
  line({ at: '2026-10-28T01:00:00+01:00', job: 'zeta', status: 'ok', owner: 'ana' }),
  line({ at: '2026-10-28T01:05:00+01:00', job: 'alpha', status: 'retry', owner: null }),
  line({ at: '2026-10-28T01:06:00+01:00', job: 'alpha', status: 'retry', owner: null }),
  line({ at: '2026-10-28T01:07:00+01:00', job: 'alpha', status: 'retry', owner: null }),
  line({ at: '2026-10-28T01:08:00+01:00', job: 'alpha', status: 'fail', owner: null, error: 'boom' }),
];

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(join(runsDir, '2026-10-28.jsonl'), good.join('\n') + '\n');
  writeFileSync(join(runsDir, '2026-10-29.jsonl'), '');
  writeFileSync(join(runsDir, '2026-10-30.jsonl'), [good[0], 'not json {', good[1]].join('\n') + '\n');
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });
});

describe('GET /digest/:night and /api/digest/:night', () => {
  it('200 with the same jobs, sorted, on page and JSON', async () => {
    const page = await app.request('/digest/2026-10-28');
    const api = await app.request('/api/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    const body = (await api.json()) as Body;
    expect(body.rows.map((r) => r.job)).toEqual(['alpha', 'zeta']);
    const html = await page.text();
    expect(html.indexOf('<td>alpha</td>')).toBeGreaterThan(-1);
    expect(html.indexOf('<td>alpha</td>')).toBeLessThan(html.indexOf('<td>zeta</td>'));
  });

  it('marks null owner, many retries and fail on the page', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    expect(html).toContain('<td>—</td>');
    expect(html).toContain('class="warn"');
    expect(html).toContain('3 (many retries)');
    expect(html).toContain('fail (failed)');
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(404);
  });

  it('empty night: nothing ran / rows []', async () => {
    const page = await app.request('/digest/2026-10-29');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const body = (await (await app.request('/api/digest/2026-10-29')).json()) as Body;
    expect(body.rows).toEqual([]);
  });

  it('bad line: still 200, counted, noted, good rows render', async () => {
    const api = await app.request('/api/digest/2026-10-30');
    expect(api.status).toBe(200);
    const body = (await api.json()) as Body;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha', 'zeta']);
    const page = await app.request('/digest/2026-10-30');
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toMatch(/<p class="warn">1 line didn(&#39;|')t parse<\/p>/);
    expect(html).toContain('<td>alpha</td>');
    expect(html).toContain('<td>zeta</td>');
  });
});
