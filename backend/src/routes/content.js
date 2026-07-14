import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireBrandRole } from "../middleware/auth.js";
import { publishContentItem } from "../services/publisher.js";

const router = Router();
router.use(requireAuth);

const roleGate = (min) => async (req, res, next) => (await requireBrandRole(min))(req, res, next);

// List content for a brand, optionally filtered by status
router.get("/", roleGate("writer"), async (req, res) => {
  const { brandId, status } = req.query;
  const params = [brandId];
  // Qualify columns: content_items and channels both have brand_id, so an
  // unqualified reference is ambiguous (Postgres error 42702).
  let where = "ci.brand_id = $1";
  if (status) {
    params.push(status);
    where += ` AND ci.status = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT ci.*, u.name as author_name, c.name as channel_name, c.type as channel_type
     FROM content_items ci
     JOIN users u ON u.id = ci.author_id
     JOIN channels c ON c.id = ci.channel_id
     WHERE ${where} ORDER BY ci.updated_at DESC`,
    params
  );
  res.json(rows);
});

router.get("/:id", requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT ci.*, u.name as author_name, c.name as channel_name, c.type as channel_type
     FROM content_items ci
     JOIN users u ON u.id = ci.author_id
     JOIN channels c ON c.id = ci.channel_id
     WHERE ci.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });

  const { rows: comments } = await query(
    `SELECT cc.*, u.name as user_name FROM content_comments cc
     JOIN users u ON u.id = cc.user_id WHERE content_item_id = $1 ORDER BY created_at`,
    [req.params.id]
  );
  res.json({ ...rows[0], comments });
});

// Create a draft
router.post("/", roleGate("writer"), async (req, res) => {
  const { brandId, channelId, title, body, mediaUrls } = req.body;
  const { rows } = await query(
    `INSERT INTO content_items (brand_id, channel_id, author_id, title, body, media_urls)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [brandId, channelId, req.user.id, title || null, body, JSON.stringify(mediaUrls || [])]
  );
  res.json(rows[0]);
});

// Edit a draft (author or approver+, only while draft/changes_requested)
router.put("/:id", requireAuth, async (req, res) => {
  const { title, body, mediaUrls } = req.body;
  const { rows: existing } = await query("SELECT * FROM content_items WHERE id = $1", [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: "Not found" });
  const item = existing[0];

  if (!["draft", "changes_requested"].includes(item.status)) {
    return res.status(400).json({ error: "Can only edit drafts or items with requested changes" });
  }
  if (item.author_id !== req.user.id && !req.user.is_super_admin) {
    return res.status(403).json({ error: "Only the author can edit this" });
  }

  const { rows } = await query(
    `UPDATE content_items SET title = COALESCE($1, title), body = COALESCE($2, body),
       media_urls = COALESCE($3, media_urls), updated_at = now()
     WHERE id = $4 RETURNING *`,
    [title, body, mediaUrls ? JSON.stringify(mediaUrls) : null, req.params.id]
  );
  res.json(rows[0]);
});

// Submit for review
router.post("/:id/submit", requireAuth, async (req, res) => {
  const { rows } = await query(
    `UPDATE content_items SET status = 'pending_review', updated_at = now()
     WHERE id = $1 AND status IN ('draft', 'changes_requested') AND author_id = $2 RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(400).json({ error: "Cannot submit this item" });
  res.json(rows[0]);
});

// Approve -> publishes immediately, or marks 'scheduled' if scheduledAt is in the future
router.post("/:id/approve", requireAuth, async (req, res) => {
  const { rows: itemRows } = await query("SELECT * FROM content_items WHERE id = $1", [req.params.id]);
  if (!itemRows.length) return res.status(404).json({ error: "Not found" });
  const item = itemRows[0];

  const gate = await requireBrandRole("approver");
  await gate({ ...req, params: { brandId: item.brand_id } }, res, async () => {
    const { scheduledAt } = req.body;
    const isFuture = scheduledAt && new Date(scheduledAt) > new Date();

    const { rows } = await query(
      `UPDATE content_items SET
         status = $1, reviewer_id = $2, scheduled_at = $3, rejection_reason = NULL, updated_at = now()
       WHERE id = $4 RETURNING *`,
      [isFuture ? "scheduled" : "approved", req.user.id, scheduledAt || null, req.params.id]
    );

    if (!isFuture) {
      // publish right away
      const result = await publishContentItem(rows[0]);
      return res.json(result);
    }
    res.json(rows[0]);
  });
});

// Request changes (send back to author with feedback)
router.post("/:id/request-changes", requireAuth, async (req, res) => {
  const { rows: itemRows } = await query("SELECT * FROM content_items WHERE id = $1", [req.params.id]);
  if (!itemRows.length) return res.status(404).json({ error: "Not found" });

  const gate = await requireBrandRole("approver");
  await gate({ ...req, params: { brandId: itemRows[0].brand_id } }, res, async () => {
    const { reason } = req.body;
    const { rows } = await query(
      `UPDATE content_items SET status = 'changes_requested', reviewer_id = $1,
         rejection_reason = $2, updated_at = now() WHERE id = $3 RETURNING *`,
      [req.user.id, reason || null, req.params.id]
    );
    if (reason) {
      await query(
        "INSERT INTO content_comments (content_item_id, user_id, comment) VALUES ($1, $2, $3)",
        [req.params.id, req.user.id, reason]
      );
    }
    res.json(rows[0]);
  });
});

// Add a comment
router.post("/:id/comments", requireAuth, async (req, res) => {
  const { comment } = req.body;
  const { rows } = await query(
    `INSERT INTO content_comments (content_item_id, user_id, comment) VALUES ($1, $2, $3)
     RETURNING *`,
    [req.params.id, req.user.id, comment]
  );
  res.json(rows[0]);
});

// Manually retry a publish (e.g. after a failure)
router.post("/:id/publish-now", requireAuth, async (req, res) => {
  const { rows: itemRows } = await query("SELECT * FROM content_items WHERE id = $1", [req.params.id]);
  if (!itemRows.length) return res.status(404).json({ error: "Not found" });

  const gate = await requireBrandRole("approver");
  await gate({ ...req, params: { brandId: itemRows[0].brand_id } }, res, async () => {
    const result = await publishContentItem(itemRows[0]);
    res.json(result);
  });
});

export default router;
