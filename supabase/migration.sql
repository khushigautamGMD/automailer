-- ============================================
-- Automailer: Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- 1. User Profiles (plan, limits, SMTP config)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'demo' CHECK (plan IN ('demo', 'pro', 'agency', 'lifetime')),
  emails_sent_this_month INTEGER NOT NULL DEFAULT 0,
  month_reset_at TIMESTAMPTZ DEFAULT now(),
  full_name TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  sender_name TEXT DEFAULT '',
  reply_to_email TEXT DEFAULT '',
  smtp_host TEXT DEFAULT 'smtp.gmail.com',
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT DEFAULT '',
  smtp_pass TEXT DEFAULT '',
  smtp_accounts JSONB DEFAULT '[]'::jsonb,
  enable_rotation BOOLEAN DEFAULT true,
  default_rate_limit INTEGER DEFAULT 50,
  email_signature TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/write their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email);

-- Allow service role (API routes) full access
CREATE POLICY "Service role full access" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Allow anon key to read/write for API routes (since we use anon key server-side)
-- This is needed because our Next.js API routes use the anon key
CREATE POLICY "Anon can manage profiles" ON profiles
  FOR ALL USING (true);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Contact Lists Table
-- ============================================
CREATE TABLE IF NOT EXISTS contact_lists (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  total_contacts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. Individual Contacts Table
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  list_id TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  company TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policies for API routes
CREATE POLICY "Anon can manage contact_lists" ON contact_lists FOR ALL USING (true);
CREATE POLICY "Anon can manage contacts" ON contacts FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_lists_user ON contact_lists (user_email);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts (user_email);
CREATE INDEX IF NOT EXISTS idx_contacts_list ON contacts (list_id);

-- Also add backup JSONB columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_contacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saved_lists JSONB DEFAULT '[]'::jsonb;

