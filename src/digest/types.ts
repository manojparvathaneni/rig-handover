// Plan morning-digest § 1. The contract section 2 builds against: commit this before the reader.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One job's night, folded from every line of runs/<night>.jsonl that names it. */
export type DigestRow = {
  job: string;
  /** null when the log says null; views render it as `—`. */
  owner: string | null;
  /** Lines for this job. */
  runs: number;
  /** Lines with status `retry`. */
  retries: number;
  /** Status of the job's last line, by time. */
  lastStatus: RunStatus;
  /** `error` of the job's last line, if it had one. */
  lastError: string | null;
  /** `at` of the first and last line, offset kept as logged. */
  first: string;
  last: string;
};

export type Night = {
  night: string;
  /** Sorted by job. */
  rows: DigestRow[];
  /** Lines that did not parse as a run line. Counted, never thrown. */
  badLines: number;
};

/**
 * Reads runs/<night>.jsonl. Returns null when the night has no file; an empty file gives
 * `rows: []`.
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;
