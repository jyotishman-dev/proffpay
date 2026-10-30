// apps/api/src/routes/jobs.ts
import { Router } from "express";
import { z } from "zod";
import { prisma, transitionJob } from "@proofpay/db";
import { Checklist, canTransition } from "@proofpay/shared";
import { enqueueVerification } from "@proofpay/queue";

export const jobsRouter = Router();

const CreateJob = z.object({
  title: z.string().min(3).max(120),
  brief: z.string().min(10).max(5000),
  budgetCents: z.number().int().min(100).max(1_000_000),
  checklist: Checklist,
});

const SubmitWork = z.object({
  url: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "URL must be http or https"),
});

jobsRouter.post("/", async (req, res) => {
  const body = CreateJob.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const job = await prisma.job.create({ data: body.data });
  res.status(201).json(job);
});

jobsRouter.get("/:id", async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: {
      submissions: { orderBy: { createdAt: "desc" }, include: { results: true } },
      ledger: true,
    },
  });
  if (!job) return res.status(404).json({ error: "job not found" });
  res.json(job);
});

// DEV ONLY: replaced by PayPal capture + webhook later, then deleted.
jobsRouter.post("/:id/fund", async (req, res) => {
  if (process.env.ENABLE_DEV_FUNDING !== "true") {
    return res.status(404).json({ error: "not found" });
  }
  await transitionJob(req.params.id, "DRAFT", "FUNDED");
  res.json({ ok: true, state: "FUNDED" });
});

jobsRouter.post("/:id/submit", async (req, res) => {
  const body = SubmitWork.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: body.error.flatten() });

  const job = await prisma.job.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ error: "job not found" });
  if (!canTransition(job.state, "SUBMITTED")) {
    return res.status(409).json({ error: `Cannot submit while job is ${job.state}` });
  }

  // TODO(hardening): SSRF guard goes here, before any URL is accepted.

  await transitionJob(job.id, job.state, "SUBMITTED");
  const submission = await prisma.submission.create({
    data: { jobId: job.id, url: body.data.url },
  });
  await enqueueVerification({
    jobId: job.id,
    submissionId: submission.id,
    url: submission.url,
  });

  res.status(202).json({ submissionId: submission.id, state: "SUBMITTED" });
});