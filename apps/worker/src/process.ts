// apps/worker/src/process.ts
import { prisma, transitionJob } from "@proofpay/db";
import { Checklist } from "@proofpay/shared";
import { publishJobEvent, type VerifyPayload } from "@proofpay/queue";
import { verifyUrl } from "@proofpay/verifier";

export async function processVerification({ jobId, submissionId, url }: VerifyPayload) {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });

  if (job.state === "SUBMITTED") {
    await transitionJob(jobId, "SUBMITTED", "VERIFYING");
  } else if (job.state !== "VERIFYING") {
    return; // already finished or not ready: nothing to do
  }
  await publishJobEvent({ jobId, type: "verification.started" });

  const checklist = Checklist.parse(job.checklist);
  const { evidence, results, pendingLlmItems } = await verifyUrl(
    url,
    checklist,
    `./evidence/${jobId}`
  );

  const evidenceJson = {
    screenshotPath: evidence.screenshotPath,
    finalUrl: evidence.finalUrl,
    status: evidence.status,
    title: evidence.title,
  };

  // retries must not leave duplicate rows
  await prisma.verificationResult.deleteMany({ where: { submissionId } });
  await prisma.verificationResult.createMany({
    data: [
      ...results.map((r) => ({
        submissionId,
        itemId: r.itemId,
        verdict: r.verdict,
        explanation: r.explanation,
        evidence: evidenceJson,
      })),
      ...pendingLlmItems.map((i) => ({
        submissionId,
        itemId: i.id,
        verdict: "UNSURE" as const,
        explanation: "AI judgment is not configured yet; needs human review",
        evidence: evidenceJson,
      })),
    ],
  });

  for (const r of results) {
    await publishJobEvent({
      jobId,
      type: "check.completed",
      data: { itemId: r.itemId, verdict: r.verdict },
    });
  }

  const anyFail = results.some((r) => r.verdict === "FAIL");
  const next = anyFail ? "FAILED" : pendingLlmItems.length > 0 ? "NEEDS_REVIEW" : "PASSED";

  await transitionJob(jobId, "VERIFYING", next);
  await publishJobEvent({ jobId, type: "verification.finished", data: { state: next } });
}