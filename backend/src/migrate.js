import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Applies the bundled schema. The schema is idempotent (IF NOT EXISTS /
// ON CONFLICT DO NOTHING) so this is safe to run on every boot.
export async function runMigrations() {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Migrations applied (schema up to date)");
}
