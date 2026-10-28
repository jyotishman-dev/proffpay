// packages/queue/scripts/smoke.ts
import { Worker } from "bullmq";
import {
  createConnection,
  enqueueVerification,
  publishJobEvent,
  subscribeJobEvents,
  VERIFY_QUEUE,
  verifyQueue,
} from "../src";

subscribeJobEvents((e) => console.log("event:", e));

const worker = new Worker(
  VERIFY_QUEUE,
  async (job) => {
    await publishJobEvent({ jobId: job.data.jobId, type: "verification.started" });
    return "done";
  },
  { connection: createConnection() }
);

await enqueueVerification({
  jobId: "job-1",
  submissionId: `sub-${Date.now()}`,
  url: "https://example.com",
});

setTimeout(async () => {
  await worker.close();
  await verifyQueue.close();
  process.exit(0);
}, 1500);