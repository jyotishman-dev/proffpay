// packages/verifier/src/verify.ts
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { ChecklistItem } from "@proofpay/shared";
import { runCheck, type CheckResult, type DeterministicItem } from "./checks";

export type Evidence = {
  finalUrl: string;
  status: number | null;
  title: string;
  text: string;
  consoleErrors: string[];
  screenshotPath: string;
};

export type VerifyOutput = {
  evidence: Evidence;
  results: CheckResult[];
  pendingLlmItems: Extract<ChecklistItem, { kind: "llm" }>[];
};

export async function verifyUrl(
  url: string,
  items: ChecklistItem[],
  outDir: string
): Promise<VerifyOutput> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const consoleErrors: string[] = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("pageerror", (e) => consoleErrors.push(e.message));

    const response = await page.goto(url, { waitUntil: "load", timeout: 20_000 });
    const status = response?.status() ?? null;

    await mkdir(outDir, { recursive: true });
    const screenshotPath = path.join(outDir, `${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const evidence: Evidence = {
      finalUrl: page.url(),
      status,
      title: await page.title(),
      text: (await page.innerText("body")).slice(0, 20_000),
      consoleErrors,
      screenshotPath,
    };

    const results: CheckResult[] = [];
    for (const item of items) {
      if (item.kind === "deterministic") {
        results.push(await runCheck(page, item as DeterministicItem, { status, consoleErrors }));
      }
    }

    const pendingLlmItems = items.filter(
      (i): i is Extract<ChecklistItem, { kind: "llm" }> => i.kind === "llm"
    );

    return { evidence, results, pendingLlmItems };
  } finally {
    await browser.close();
  }
}