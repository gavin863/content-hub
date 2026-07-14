-- Content Hub Database Schema
-- PostgreSQL. Works on Supabase / Railway / Render / self-hosted Postgres.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ BRANDS ============
-- Each brand = 1 company/entity you publish content for (Nimbus, Talentforce, ...)
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ USERS ============
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_super_admin BOOLEAN NOT NULL DEFAULT false, -- sees/manages all brands
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which brands a user belongs to, and their role within that brand
-- role: 'writer'   -> can draft content, submit for review
--       'approver' -> can review, approve/reject, publish
--       'admin'    -> approver + manage channels/users for that brand
CREATE TABLE user_brands (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('writer', 'approver', 'admin')),
  PRIMARY KEY (user_id, brand_id)
);

-- ============ CHANNELS ============
-- A publishing destination for a brand: a Facebook Page, a WordPress site, etc.
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('facebook', 'wordpress')),
  name TEXT NOT NULL, -- friendly label, e.g. "Nimbus Fanpage"
  -- config holds whatever credentials/ids that channel type needs (see README)
  -- facebook: { "pageId": "...", "pageAccessToken": "..." }
  -- wordpress: { "siteUrl": "...", "username": "...", "appPassword": "..." }
  config JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ CONTENT ITEMS ============
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  title TEXT, -- used as WordPress post title; optional for Facebook
  body TEXT NOT NULL,
  media_urls JSONB NOT NULL DEFAULT '[]', -- array of image/video URLs
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'changes_requested', 'approved',
    'scheduled', 'published', 'failed'
  )),
  scheduled_at TIMESTAMPTZ, -- null = publish immediately upon approval
  published_at TIMESTAMPTZ,
  external_post_id TEXT, -- id/url returned by Facebook or WordPress after publish
  reviewer_id UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_brand_status ON content_items(brand_id, status);
CREATE INDEX idx_content_scheduled ON content_items(status, scheduled_at)
  WHERE status = 'scheduled';

-- ============ COMMENTS (approval feedback thread) ============
CREATE TABLE content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PUBLISH LOGS (audit trail / debugging failed publishes) ============
CREATE TABLE publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'success' | 'error'
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Seed: two brands to start ============
INSERT INTO brands (name, slug) VALUES
  ('Nimbus Consulting', 'nimbus'),
  ('Talentforce', 'talentforce');
