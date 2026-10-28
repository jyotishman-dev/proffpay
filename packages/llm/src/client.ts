// packages/llm/src/client.ts
import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const MODEL = process.env.LLM_MODEL ?? "claude-sonnet-5-5";

export async function askJson<T>(opts: {
  system: string;
  user: string;
  schema: ZodType<T>;
  maxAttempts?: number;
}): Promise<T> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: opts.user }];
  let lastError = "";

  for (let i = 0; i < (opts.maxAttempts ?? 3); i++) {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: opts.system,
      messages,
    });

    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const cleaned = text.replace(/```json|```/g, "").trim();

    try {
      const parsed = opts.schema.safeParse(JSON.parse(cleaned));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.message;
    } catch (e) {
      lastError = (e as Error).message;
    }

    messages.push(
      { role: "assistant", content: text },
      { role: "user", content: `That was invalid: ${lastError}\nReturn only the corrected JSON.` }
    );
  }

  throw new Error(`LLM output failed validation: ${lastError}`);
}