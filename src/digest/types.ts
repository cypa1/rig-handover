// Digest contract (plan.md § 1). Section 2 is written against this file; the reader
// implementation lives in ./read.js.

export type DigestStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: DigestStatus | null;
  lastError: string | null;
  firstAt: string | null;
  lastAt: string | null;
};

// One line's status, counted across the whole night.
export type DigestCounts = { ok: number; retry: number; fail: number };

export type DigestNight = {
  night: string;
  // false when runs/<night>.jsonl does not exist (the page answers 404).
  exists: boolean;
  rows: DigestRow[];
  // Lines that did not parse. Counted, never thrown (plan.md § 1).
  badLines: number;
  counts: DigestCounts;
};

// readNight(runsDir, night) -> DigestNight. Implemented in ./read.js.
export type ReadNight = (runsDir: string, night: string) => DigestNight;
