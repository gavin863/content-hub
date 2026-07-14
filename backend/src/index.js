import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import brandRoutes from "./routes/brands.js";
import contentRoutes from "./routes/content.js";
import { startScheduler } from "./services/scheduler.js";

const app = express();
app.use(cors({ origin: (process.env.CORS_ORIGIN || "*").split(",") }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/brands", brandRoutes);
app.use("/content", contentRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Content Hub API listening on :${port}`);
  startScheduler();
});
