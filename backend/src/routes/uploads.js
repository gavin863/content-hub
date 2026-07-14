import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { extname } from "path";
import { requireAuth } from "../middleware/auth.js";

// Directory where uploaded images live. In production this is a Railway volume
// mount (persists across deploys) so image URLs stay valid for scheduled posts
// and for WordPress posts that reference the URL directly.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Chỉ chấp nhận file ảnh"));
  }
});

const router = Router();

// POST /uploads  (multipart form-data, field "file") -> { url }
router.post("/", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Không có file được tải lên" });
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  res.json({ url: `${base}/uploads/${req.file.filename}` });
});

export default router;
