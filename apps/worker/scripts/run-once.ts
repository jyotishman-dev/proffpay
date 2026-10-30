// apps/worker/scripts/run-once.ts
import { processVerification } from "../src/process";

const [jobId, submissionId, url] = process.argv.slice(2);
if (!jobId || !submissionId || !url) {
  throw new Error("usage: bun run scripts/run-once.ts <jobId> <submissionId> <url>");
}

await processVerification({ jobId, submissionId, url });
console.log("done");
process.exit(0);