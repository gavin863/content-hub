import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, is_super_admin: user.is_super_admin },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

// Only a super admin can create new users. The very first user in an empty
// database is allowed to self-register as super admin (bootstrap).
router.post("/register", async (req, res) => {
  // NOTE: this route is intentionally unauthenticated so you can bootstrap
  // the first admin account. After that, lock it down (see README "Securing
  // registration") or create users manually via SQL.
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: "email, name, password are required" });
  }

  const { rows: existing } = await query("SELECT id FROM users LIMIT 1");
  const isFirstUser = existing.length === 0;

  const password_hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query(
      `INSERT INTO users (email, name, password_hash, is_super_admin)
       VALUES ($1, $2, $3, $4) RETURNING id, email, name, is_super_admin`,
      [email, name, password_hash, isFirstUser]
    );
    const user = rows[0];
    res.json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await query("SELECT * FROM users WHERE email = $1", [email]);
  if (!rows.length) return res.status(401).json({ error: "Invalid email or password" });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  res.json({
    token: signToken(user),
    user: { id: user.id, email: user.email, name: user.name, is_super_admin: user.is_super_admin }
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT b.id, b.name, b.slug, ub.role
     FROM user_brands ub JOIN brands b ON b.id = ub.brand_id
     WHERE ub.user_id = $1`,
    [req.user.id]
  );
  let brands = rows;
  if (req.user.is_super_admin) {
    const all = await query("SELECT id, name, slug FROM brands");
    brands = all.rows.map((b) => ({ ...b, role: "admin" }));
  }
  res.json({ user: req.user, brands });
});

export default router;
