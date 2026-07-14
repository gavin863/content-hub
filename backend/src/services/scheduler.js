import cron from "node-cron";
import { query } from "../db.js";
import { publishContentItem } from "./publisher.js";

// Runs every minute: finds content that's approved-and-scheduled with a
// scheduled_at time in the past, and publishes it.
export function startScheduler() {
  cron.schedule("* * * * *", async () => {
    try {
      const { rows } = await query(
        `SELECT * FROM content_items WHERE status = 'scheduled' AND scheduled_at <= now()`
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
