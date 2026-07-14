import jwt from "jsonwebtoken";
import { query } from "../db.js";

// Verifies the JWT and attaches { id, email, name, is_super_admin } to req.user
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Loads the caller's role for req.params.brandId (or req.body.brandId) into req.brandRole
// Super admins get 'admin' automatically on every brand.
export async function requireBrandRole(minRole) {
  const rank = { writer: 1, approver: 2, admin: 3 };
  return async (req, res, next) => {
    const brandId = req.params.brandId || req.body.brandId || req.query.brandId;
    if (!brandId) return res.status(400).json({ error: "brandId is required" });

    if (req.user.is_super_admin) {
      req.brandRole = "admin";
      return next();
    }

    const { rows } = await query(
      "SELECT role FROM user_brands WHERE user_id = $1 AND brand_id = $2",
      [req.user.id, brandId]
    );
    if (!rows.length) return res.status(403).json({ error: "No access to this brand" });

    req.brandRole = rows[0].role;
    if (rank[req.brandRole] < rank[minRole]) {
      return res.status(403).json({ error: `Requires ${minRole} role or higher` });
    }
    next();
  };
}
