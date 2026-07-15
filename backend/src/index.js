import "dotenv/config";
import express from "express";
import cors from "cors";
import { mkdirSync } from "fs";
import authRoutes from "./routes/auth.js";
import brandRoutes from "./routes/brands.js";
import inviteRoutes from "./routes/invites.js";
import contentRoutes from "./routes/content.js";
import uploadRoutes, { UPLOAD_DIR } from "./routes/uploads.js";
import { startScheduler } from "./services/scheduler.js";
import { runMigrations } from "./migrate.js";

const app = express();
app.set("trust proxy", 1); // Railway proxy: gives correct req.protocol (https)

// Ensure the uploads directory exists (Railway volume mount in prod).
try { mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) { console.error("mkdir uploads:", e.message); }
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

// Serve uploaded images (GET) and accept uploads (POST) at /uploads.
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));
app.use("/uploads", uploadRoutes);

app.use("/auth", authRoutes);
app.use("/brands", brandRoutes);
app.use("/invites", inviteRoutes);
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
