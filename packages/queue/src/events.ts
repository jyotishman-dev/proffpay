// packages/queue/src/events.ts
import { createConnection } from "./connection";

export const EVENTS_CHANNEL = "proofpay:job-events";

export type JobEvent = {
  jobId: string;
  type: "verification.started" | "check.completed" | "verification.finished";
  data?: Record<string, unknown>;
};

const publisher = createConnection();

export async function publishJobEvent(event: JobEvent) {
  await publisher.publish(EVENTS_CHANNEL, JSON.stringify(event));
}

export function subscribeJobEvents(handler: (event: JobEvent) => void) {
  const sub = createConnection();
  sub.subscribe(EVENTS_CHANNEL);
  sub.on("message", (_channel, message) => handler(JSON.parse(message)));
  return () => sub.quit();
}