import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NIGHT_RE, parseLine } from './read.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Counts run lines by status for one night; null when the night has no file. Bad lines are skipped.
export function countNight(runsDir: string, night: string): NightCounts | null {
  if (!NIGHT_RE.test(night)) return null;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;
  const c: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (raw.trim() === '') continue;
    const l = parseLine(raw);
    if (l) c[l.status]++;
  }
  return c;
}
