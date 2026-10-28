import { Queue } from "bullmq";
import { z } from "zod";
import { createConnection } from "./connection";




export const VERIFY_QUEUE = "verify";

export const VerifyPayload = z.object({
  jobId: z.string(),
  submissionId: z.string(),
  url: z.string().url(),
});
export type VerifyPayload = z.infer<typeof VerifyPayload>;

export const verifyQueue = new Queue<VerifyPayload>(VERIFY_QUEUE, {
  connection: createConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export async function enqueueVerification(payload: VerifyPayload) {
  const data = VerifyPayload.parse(payload);
  return verifyQueue.add("verify-submission", data, { jobId: data.submissionId });
}