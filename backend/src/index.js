import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import brandRoutes from "./routes/brands.js";
import contentRoutes from "./routes/content.js";
import { startScheduler } from "./services/scheduler.js";
import { runMigrations } from "./migrate.js";

const app = express();
// CORS_ORIGIN = "*" (allow all) or a comma-separated allowlist of origins.
// Note: passing ["*"] to cors() is NOT a wildcard — it's a literal match — so
// the "*" case must stay the string "*", and only a real list becomes an array.
const rawCorsOrigin = process.env.CORS_ORIGIN || "*";
const corsOrigin = rawCorsOrigin === "*"
  ? "*"
  : rawCorsOrigin.split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/brands", brandRoutes);
app.use("/content", contentRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

// In Express 4 an async route handler that rejects isn't caught by the error
// middleware — it surfaces as an unhandledRejection which, by default, would
// terminate the process. Log it and keep the server alive instead of letting a
// single bad request take down the whole API for everyone.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

const port = process.env.PORT || 4000;

runMigrations()
  .then(() => {
    app.listen(port, () => {
      console.log(`Content Hub API listening on :${port}`);
      startScheduler();
    });
  })
  .catch((err) => {
    console.error("Failed to run migrations, aborting startup:", err);
    process.exit(1);
  });
