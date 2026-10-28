// packages/shared/src/checklist.ts
import { z } from "zod";

export const DeterministicCheck = z.discriminatedUnion("type", [
  z.object({ type: z.literal("http_status"), expected: z.number().default(200) }),
  z.object({ type: z.literal("text_exists"), text: z.string() }),
  z.object({ type: z.literal("selector_exists"), selector: z.string() }),
  z.object({ type: z.literal("no_console_errors") }),
]);

export const ChecklistItem = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("deterministic"),
    id: z.string(),
    description: z.string(),
    check: DeterministicCheck,
  }),
  z.object({
    kind: z.literal("llm"),
    id: z.string(),
    description: z.string(),
    rubric: z.string(),
  }),
]);

export const Checklist = z.array(ChecklistItem).min(1).max(20);

export type ChecklistItem = z.infer<typeof ChecklistItem>;
export type DeterministicCheck = z.infer<typeof DeterministicCheck>;