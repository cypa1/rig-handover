import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  DigestCounts,
  DigestNight,
  DigestRow,
  DigestStatus,
  ReadNight,
} from './types.js';

// A parsed log line. Fields are unknown until checked: input is parsed at the edge.
type Line = {
  at?: unknown;
  job?: unknown;
  status?: unknown;
  owner?: unknown;
  error?: unknown;
};

function parse(raw: string): Line | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    return value as Line;
  } catch {
    return null;
  }
}

function asStatus(value: unknown): DigestStatus | null {
  return value === 'ok' || value === 'retry' || value === 'fail' ? value : null;
}

function timeOf(value: string | null): number {
  return value === null ? 0 : Date.parse(value) || 0;
}

export const readNight: ReadNight = (runsDir, night) => {
  const counts: DigestCounts = { ok: 0, retry: 0, fail: 0 };
  let content: string;
  try {
    content = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return { night, exists: false, rows: [], badLines: 0, counts };
  }

  const acc = new Map<string, { row: DigestRow; at: number }>();
  let badLines = 0;

  for (const raw of content.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parse(raw);
    const job = line && typeof line.job === 'string' ? line.job : null;
    const status = line ? asStatus(line.status) : null;
    if (line === null || job === null || status === null) {
      // A line that doesn't parse is counted, never thrown (plan.md § 1).
      badLines += 1;
      continue;
    }

    counts[status] += 1;
    const at = typeof line.at === 'string' ? line.at : null;
    const owner = typeof line.owner === 'string' ? line.owner : null;
    const error = typeof line.error === 'string' ? line.error : null;
    const seen = timeOf(at);

    const current = acc.get(job);
    if (current === undefined) {
      acc.set(job, {
        at: seen,
        row: {
          job,
          owner,
          runs: 1,
          retries: status === 'retry' ? 1 : 0,
          lastStatus: status,
          lastError: error,
          firstAt: at,
          lastAt: at,
        },
      });
      continue;
    }

    const { row } = current;
    row.runs += 1;
    if (status === 'retry') row.retries += 1;
    if (row.firstAt === null || (at !== null && seen < timeOf(row.firstAt))) row.firstAt = at;
    if (seen >= current.at) {
      // The newest line decides the row's last status, error, owner and time.
      current.at = seen;
      row.lastStatus = status;
      row.lastError = error;
      row.owner = owner;
      row.lastAt = at;
    }
  }

  const rows = [...acc.values()]
    .map((entry) => entry.row)
    .sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));

  return { night, exists: true, rows, badLines, counts };
};
