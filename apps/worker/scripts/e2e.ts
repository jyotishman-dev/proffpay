// apps/worker/scripts/e2e.ts
// End-to-end smoke test: enqueues a verification job and watches for results.
//
// Usage:  npx tsx scripts/e2e.ts <url> [jobId]
//
// Prerequisites: Redis must be running, and the worker must be running
// (`bun run dev` in another terminal).

import { prisma } from "@proofpay/db";
import { enqueueVerification } from "@proofpay/queue";
import { randomUUID } from "node:crypto";

const url = process.argv[2];
if (!url) {
  console.error("Usage: npx tsx scripts/e2e.ts <url> [jobId]");
  process.exit(1);
}

const jobId = process.argv[3] ?? randomUUID();
const submissionId = randomUUID();

// 1. Seed a minimal job + submission so the worker can find them
const job = await prisma.job.upsert({
  where: { id: jobId },
  update: {},
  create: {
    id: jobId,
    title: "E2E Test Job",
    brief: "Automated smoke test",
    budgetCents: 0,
    state: "SUBMITTED",
    checklist: [
      {
        id: randomUUID(),
        kind: "deterministic",
        label: "Page loads with HTTP 200",
        check: { type: "http_status", expected: 200 },
      },
      {
        id: randomUUID(),
        kind: "deterministic",
        label: "No console errors",
        check: { type: "no_console_errors" },
      },
    ],
  },
});

const submission = await prisma.submission.create({
  data: {
    id: submissionId,
    jobId: job.id,
    url,
  },
});

console.log(`\n🚀 E2E test started`);
console.log(`   Job ID:        ${job.id}`);
console.log(`   Submission ID: ${submission.id}`);
console.log(`   URL:           ${url}\n`);

// 2. Enqueue the work
await enqueueVerification({ jobId: job.id, submissionId: submission.id, url });
console.log("📨 Verification job enqueued – waiting for results…\n");

// 3. Poll for completion
const TIMEOUT = 60_000;
const INTERVAL = 2_000;
const start = Date.now();

while (Date.now() - start < TIMEOUT) {
  const updated = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });

  if (["PASSED", "FAILED", "NEEDS_REVIEW"].includes(updated.state)) {
    console.log(`✅ Job finished with state: ${updated.state}`);

    const results = await prisma.verificationResult.findMany({
      where: { submissionId },
    });

    console.log(`\n📋 ${results.length} verification result(s):\n`);
    for (const r of results) {
      const icon = r.verdict === "PASS" ? "✅" : r.verdict === "FAIL" ? "❌" : "🟡";
      console.log(`   ${icon} [${r.verdict}] ${r.explanation}`);
    }

    await prisma.$disconnect();
    process.exit(0);
  }

  await new Promise((r) => setTimeout(r, INTERVAL));
}

console.error("⏰ Timed out waiting for job to complete");
await prisma.$disconnect();
process.exit(1);