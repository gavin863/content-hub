import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db.js";

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, is_super_admin: user.is_super_admin },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

// Look up an invite by its token (public). Tells the accept page which brand /
// role it's for, and whether the invitee already has an account.
router.get("/:token", async (req, res) => {
  const { rows } = await query(
    `SELECT i.email, i.role, i.accepted_at, b.name AS brand_name
     FROM invites i JOIN brands b ON b.id = i.brand_id
     WHERE i.token = $1`,
    [req.params.token]
  );
  if (!rows.length) return res.status(404).json({ error: "This invitation link is invalid." });
  const invite = rows[0];
  if (invite.accepted_at) return res.status(410).json({ error: "This invitation has already been used." });

  const { rows: users } = await query("SELECT id FROM users WHERE lower(email) = lower($1)", [invite.email]);
  res.json({
    email: invite.email,
    role: invite.role,
    brandName: invite.brand_name,
    userExists: users.length > 0
  });
});

// Accept an invite (public). If the invitee is new, `name` + `password` create
// their account. If they already have an account, `password` logs them in.
// Either way they get added to the brand and a session token is returned.
router.post("/:token/accept", async (req, res) => {
  const { name, password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required" });

  const { rows } = await query(
    "SELECT * FROM invites WHERE token = $1",
    [req.params.token]
  );
  if (!rows.length) return res.status(404).json({ error: "This invitation link is invalid." });
  const invite = rows[0];
  if (invite.accepted_at) return res.status(410).json({ error: "This invitation has already been used." });

  const { rows: existing } = await query("SELECT * FROM users WHERE lower(email) = lower($1)", [invite.email]);
  let user;

  if (existing.length) {
    // Existing account: verify the password before joining them to the brand.
    const ok = await bcrypt.compare(password, existing[0].password_hash);
    if (!ok) return res.status(401).json({ error: "Wrong password for this email. Try logging in instead." });
    user = existing[0];
  } else {
    // New account: name is required.
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
    const password_hash = await bcrypt.hash(password, 10);
    const { rows: created } = await query(
      `INSERT INTO users (email, name, password_hash, is_super_admin)
       VALUES ($1, $2, $3, false)
       RETURNING id, email, name, is_super_admin`,
      [invite.email, name.trim(), password_hash]
    );
    user = created[0];
  }

  // Join the brand at the invited role, then mark the invite consumed.
  await query(
    `INSERT INTO user_brands (user_id, brand_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, brand_id) DO UPDATE SET role = $3`,
    [user.id, invite.brand_id, invite.role]
  );
  await query("UPDATE invites SET accepted_at = now() WHERE id = $1", [invite.id]);

  res.json({
    token: signToken(user),
    user: { id: user.id, email: user.email, name: user.name, is_super_admin: user.is_super_admin }
  });
});

export default router;
