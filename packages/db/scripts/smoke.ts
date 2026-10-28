// packages/db/scripts/smoke.ts
import { prisma,  } from "../src";
import { Checklist } from "@proofpay/shared";
import { transitionJob } from "../src/job";

async function main() {
  const checklist = Checklist.parse([
    {
      kind: "deterministic",
      id: "c1",
      description: "Page loads",
      check: { type: "http_status", expected: 200 },
    },
    {
      kind: "llm",
      id: "c2",
      description: "Looks professional",
      rubric: "Clean layout and consistent fonts",
    },
  ]);

  const job = await prisma.job.create({
    data: {
      title: "Test landing page",
      brief: "Build a landing page",
      budgetCents: 5000,
      checklist,
    },
  });

  await transitionJob(job.id, "DRAFT", "FUNDED");
  const after = await prisma.job.findUnique({ where: { id: job.id } });
  console.log("state:", after?.state); // FUNDED

  try {
    await transitionJob(job.id, "FUNDED", "RELEASED");
  } catch (e) {
    console.log("blocked:", (e as Error).message); // must print this
  }
}

main().finally(() => prisma.$disconnect());