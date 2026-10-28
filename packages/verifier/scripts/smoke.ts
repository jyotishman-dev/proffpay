// packages/verifier/scripts/smoke.ts
import { Checklist } from "@proofpay/shared";
import { verifyUrl } from "../src";

const url = process.argv[2] ?? "http://localhost:4100/good";

const items = Checklist.parse([
  { kind: "deterministic", id: "c1", description: "Page loads", check: { type: "http_status", expected: 200 } },
  { kind: "deterministic", id: "c2", description: "Has a heading", check: { type: "selector_exists", selector: "h1" } },
  { kind: "deterministic", id: "c3", description: "Has a pricing section", check: { type: "text_exists", text: "Pricing" } },
  { kind: "deterministic", id: "c4", description: "Has a contact form", check: { type: "selector_exists", selector: "form#contact" } },
  { kind: "deterministic", id: "c5", description: "No console errors", check: { type: "no_console_errors" } },
  { kind: "llm", id: "c6", description: "Looks professional", rubric: "Clean layout, readable text" },
]);

const out = await verifyUrl(url, items, "./evidence/test-job");
console.log(out.results);
console.log("screenshot:", out.evidence.screenshotPath);
console.log("pending for LLM:", out.pendingLlmItems.map((i) => i.id));