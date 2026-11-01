import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads a night into one row per job and counts bad lines', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night.exists).toBe(true);
    expect(night.rows).toHaveLength(5);
    expect(night.badLines).toBe(1);
    expect(night.rows.map((row) => row.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts runs and retries, and takes status and error from the last line', () => {
    const night = readNight('runs', '2026-10-28');
    const fixtures = night.rows.find((row) => row.job === 'fixtures/refresh');
    expect(fixtures).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null });
    const notes = night.rows.find((row) => row.job === 'notes/backup');
    expect(notes).toMatchObject({ runs: 1, lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a row whose owner is null', () => {
    const night = readNight('runs', '2026-10-28');
    const digest = night.rows.find((row) => row.job === 'digest/render');
    expect(digest).toBeDefined();
    expect(digest?.owner).toBeNull();
  });

  it('returns exists=false for a night with no file', () => {
    const night = readNight('runs', '2000-01-01');
    expect(night.exists).toBe(false);
    expect(night.rows).toEqual([]);
  });
});
