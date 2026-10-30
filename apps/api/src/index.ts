// apps/api/src/index.ts  (replace the old file)
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { subscribeJobEvents } from "@proofpay/queue";
import { jobsRouter } from "./routes/jobs";

const origin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const app = express();
app.use(cors({ origin }));
// PayPal webhooks will mount BEFORE this line (they need the raw body)
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/jobs", jobsRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const conflict = /Illegal job transition|refused move/.test(err.message);
  if (conflict) return res.status(409).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin } });

io.on("connection", (socket) => {
  socket.on("job:watch", (jobId: unknown) => {
    if (typeof jobId === "string") socket.join(`job:${jobId}`);
  });
});

subscribeJobEvents((event) => io.to(`job:${event.jobId}`).emit("job:event", event));

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => console.log(`api on :${port}`));