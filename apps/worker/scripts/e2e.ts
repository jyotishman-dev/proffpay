import { prisma, transitionJob } from "@proofpay/db";
import { Checklist } from "@proofpay/shared";
import { enqueueVerification, subscribeJobEvents } from "@proofpay/queue";

const url = process.argv[2] ?? "http://localhost:4100/good";

const checklist = Checklist.parse([
  { kind: "deterministic", id: "c1", description: "Page loads", check: { type: "http_status", expected: 200 } },
  { kind: "deterministic", id: "c2", description: "Has a heading", check: { type: "selector_exists", selector: "h1" } },
  { kind: "deterministic", id: "c3", description: "Has a pricing section", check: { type: "text_exists", text: "Pricing" } },
  { kind: "deterministic", id: "c4", description: "Has a contact form", check: { type: "selector_exists", selector: "form#contact" } },
  { kind: "deterministic", id: "c5", description: "No console errors", check: { type: "no_console_errors" } },
  { kind: "llm", id: "c6", description: "Looks professional", rubric: "Clean layout, readable text" },
]);

const job = await prisma.job.create({
  data: { title: "E2E test", brief: "fixture site", budgetCents: 5000, checklist },
});
await transitionJob(job.id, "DRAFT", "FUNDED");
await transitionJob(job.id, "FUNDED", "SUBMITTED");
const sub = await prisma.submission.create({ data: { jobId: job.id, url } });

const finished = new Promise<void>((resolve) => {
  subscribeJobEvents((e) => {
    if (e.jobId !== job.id) return;
    console.log("event:", e.type, e.data ?? "");
    if (e.type === "verification.finished") resolve();
  });
});

await enqueueVerification({ jobId: job.id, submissionId: sub.id, url });
await finished;

const final = await prisma.job.findUniqueOrThrow({
  where: { id: job.id },
  include: { submissions: { include: { results: true } } },
});
console.log("final state:", final.state);
console.table(
  final.submissions[0].results.map((r) => ({ item: r.itemId, verdict: r.verdict, why: r.explanation }))
);
process.exit(0);