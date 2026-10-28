// packages/verifier/src/checks.ts
import type { Page } from "playwright";
import type { ChecklistItem } from "@proofpay/shared";

export type DeterministicItem = Extract<ChecklistItem, { kind: "deterministic" }>;

export type CheckResult = {
  itemId: string;
  verdict: "PASS" | "FAIL";
  explanation: string;
};

export type PageContext = {
  status: number | null;
  consoleErrors: string[];
};

export async function runCheck(
  page: Page,
  item: DeterministicItem,
  ctx: PageContext
): Promise<CheckResult> {
  const c = item.check;
  const done = (ok: boolean, pass: string, fail: string): CheckResult => ({
    itemId: item.id,
    verdict: ok ? "PASS" : "FAIL",
    explanation: ok ? pass : fail,
  });

  switch (c.type) {
    case "http_status":
      return done(
        ctx.status === c.expected,
        `Page responded with ${c.expected}`,
        `Expected HTTP ${c.expected} but got ${ctx.status}`
      );

    case "text_exists": {
      const body = await page.innerText("body");
      return done(
        body.toLowerCase().includes(c.text.toLowerCase()),
        `Found text "${c.text}" on the page`,
        `Text "${c.text}" was not found on the page`
      );
    }

    case "selector_exists": {
      const count = await page.locator(c.selector).count();
      return done(
        count > 0,
        `Found ${count} element(s) matching "${c.selector}"`,
        `No element matches "${c.selector}"`
      );
    }

    case "no_console_errors":
      return done(
        ctx.consoleErrors.length === 0,
        "No console errors",
        `Console errors: ${ctx.consoleErrors.slice(0, 3).join(" | ")}`
      );
  }
}