// apps/api/scripts/watch.ts
import { io } from "socket.io-client";

const jobId = process.argv[2];
if (!jobId) throw new Error("usage: bun run scripts/watch.ts <jobId>");

const socket = io("http://localhost:4000");
socket.on("connect", () => {
  console.log("connected, watching", jobId);
  socket.emit("job:watch", jobId);
});
socket.on("job:event", (e) => console.log("event:", e.type, e.data ?? ""));