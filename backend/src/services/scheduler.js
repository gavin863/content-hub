import cron from "node-cron";
import { query } from "../db.js";
import { publishContentItem } from "./publisher.js";

// Runs every minute: publishes content that is APPROVED (or explicitly
// scheduled) and whose planned time (scheduled_at) has arrived. A writer can set
// scheduled_at early on a draft, but it will NOT publish until it's approved —
// so "the date can be set up front, and if it isn't approved by then it won't go
// out."
export function startScheduler() {
  cron.schedule("* * * * *", async () => {
    try {
      const { rows } = await query(
        `SELECT * FROM content_items
         WHERE status IN ('approved', 'scheduled')
           AND scheduled_at IS NOT NULL AND scheduled_at <= now()`
      );
      for (const item of rows) {
        await publishContentItem(item);
      }
    } catch (err) {
      console.error("Scheduler run failed:", err.message);
    }
  });
  console.log("Scheduler started (checks every minute for due content)");
}
