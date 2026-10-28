// apps/worker/src/index.ts
import { transitionJob } from "@proofpay/db";
import {
  createConnection,
  publishJobEvent,
  VERIFY_QUEUE,
  VerifyPayload,
  Worker,
} from "@proofpay/queue";
import { processVerification } from "./process";

const worker = new Worker<VerifyPayload>(
  VERIFY_QUEUE,
  (job) => processVerification(VerifyPayload.parse(job.data)),
  { connection: createConnection(), concurrency: 2 }
);

worker.on("failed", async (job, err) => {
  console.error("verification error:", err.message);
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    try {
      await transitionJob(job.data.jobId, "VERIFYING", "NEEDS_REVIEW");
      await publishJobEvent({
        jobId: job.data.jobId,
        type: "verification.finished",
        data: { state: "NEEDS_REVIEW", error: err.message },
      });
    } catch {
      // job wasn't in VERIFYING; nothing to hand off
    }
  }
});

console.log("worker listening on queue:", VERIFY_QUEUE);