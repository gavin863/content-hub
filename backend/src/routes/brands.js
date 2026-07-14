import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireBrandRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// List brands the caller can see
router.get("/", async (req, res) => {
  if (req.user.is_super_admin) {
    const { rows } = await query("SELECT id, name, slug FROM brands ORDER BY name");
    return res.json(rows);
  }
  const { rows } = await query(
    `SELECT b.id, b.name, b.slug, ub.role FROM user_brands ub
     JOIN brands b ON b.id = ub.brand_id WHERE ub.user_id = $1 ORDER BY b.name`,
    [req.user.id]
  );
  res.json(rows);
});

// Create a brand (super admin only)
router.post("/", async (req, res) => {
  if (!req.user.is_super_admin) return res.status(403).json({ error: "Super admin only" });
  const { name, slug } = req.body;
  const { rows } = await query(
    "INSERT INTO brands (name, slug) VALUES ($1, $2) RETURNING *",
    [name, slug]
  );
  res.json(rows[0]);
});

// --- Channels (Facebook Pages / WordPress sites) for a brand ---

router.get("/:brandId/channels", async (req, res, next) =>
  (await requireBrandRole("writer"))(req, res, next)
, async (req, res) => {
  const { rows } = await query(
    `SELECT id, brand_id, type, name, active,
            CASE WHEN $2 = 'admin' THEN config ELSE '{}'::jsonb END as config
     FROM channels WHERE brand_id = $1 ORDER BY name`,
    [req.params.brandId, req.brandRole]
  );
  res.json(rows);
});

router.post("/:brandId/channels", async (req, res, next) =>
  (await requireBrandRole("admin"))(req, res, next)
, async (req, res) => {
  const { type, name, config } = req.body;
  if (!["facebook", "wordpress"].includes(type)) {
    return res.status(400).json({ error: "type must be 'facebook' or 'wordpress'" });
  }
  const { rows } = await query(
    `INSERT INTO channels (brand_id, type, name, config) VALUES ($1, $2, $3, $4) RETURNING id, brand_id, type, name, active`,
    [req.params.brandId, type, name, config || {}]
  );
  res.json(rows[0]);
});

router.put("/:brandId/channels/:channelId", async (req, res, next) =>
  (await requireBrandRole("admin"))(req, res, next)
, async (req, res) => {
  const { name, config, active } = req.body;
  const { rows } = await query(
    `UPDATE channels SET
       name = COALESCE($1, name),
       config = COALESCE($2, config),
       active = COALESCE($3, active)
     WHERE id = $4 AND brand_id = $5 RETURNING id, brand_id, type, name, active`,
    [name, config, active, req.params.channelId, req.params.brandId]
  );
  if (!rows.length) return res.status(404).json({ error: "Channel not found" });
  res.json(rows[0]);
});

// --- Team members for a brand ---

router.get("/:brandId/team", async (req, res, next) =>
  (await requireBrandRole("approver"))(req, res, next)
, async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, ub.role FROM user_brands ub
     JOIN users u ON u.id = ub.user_id WHERE ub.brand_id = $1 ORDER BY u.name`,
    [req.params.brandId]
  );
  res.json(rows);
});

router.post("/:brandId/team", async (req, res, next) =>
  (await requireBrandRole("admin"))(req, res, next)
, async (req, res) => {
  const { email, role } = req.body; // adds an existing user (by email) to this brand
  if (!["writer", "approver", "admin"].includes(role)) {
    return res.status(400).json({ error: "invalid role" });
  }
  const { rows: users } = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (!users.length) return res.status(404).json({ error: "No user with that email. Ask them to register first." });

  await query(
    `INSERT INTO user_brands (user_id, brand_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, brand_id) DO UPDATE SET role = $3`,
    [users[0].id, req.params.brandId, role]
  );
  res.json({ ok: true });
});

export default router;
