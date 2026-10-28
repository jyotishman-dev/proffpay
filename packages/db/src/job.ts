
import { assertTransition, type JobState } from "@proofpay/shared";
import { prisma } from "./client";

export async function transitionJob(
  jobId: string,
  from: JobState,
  to: JobState
): Promise<void> {
  assertTransition(from, to);

  const { count } = await prisma.job.updateMany({
    where: { id: jobId, state: from },
    data: { state: to },
  });

  if (count === 0) {
    throw new Error(`Job ${jobId} is not in state ${from}; refused move to ${to}`);
  }
}