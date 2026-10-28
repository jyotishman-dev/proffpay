
export const JOB_STATES = [
  "DRAFT",
  "FUNDED",
  "SUBMITTED",
  "VERIFYING",
  "PASSED",
  "FAILED",
  "NEEDS_REVIEW",
  "RELEASED",
  "REFUNDED",
] as const;

export type JobState = (typeof JOB_STATES)[number];

const TRANSITIONS: Record<JobState, JobState[]> = {
  DRAFT: ["FUNDED"],
  FUNDED: ["SUBMITTED", "REFUNDED"],
  SUBMITTED: ["VERIFYING"],
  VERIFYING: ["PASSED", "FAILED", "NEEDS_REVIEW"],
  PASSED: ["RELEASED"],
  FAILED: ["SUBMITTED", "REFUNDED"],
  NEEDS_REVIEW: ["PASSED", "FAILED"], 
  RELEASED: [],
  REFUNDED: [],
};

export function canTransition(from: JobState, to: JobState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: JobState, to: JobState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal job transition: ${from} -> ${to}`);
  }
}