-- ============================================================
-- KomTek Ticketing System — Supabase Schema
-- ============================================================
-- Run this entire file in your Supabase project's SQL Editor:
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin','agent')),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile row when a new user signs up / is invited
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TICKETS TABLE
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

CREATE TABLE IF NOT EXISTS tickets (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number  TEXT UNIQUE NOT NULL DEFAULT (
    'KT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('ticket_seq')::TEXT, 5, '0')
  ),
  company_name   TEXT NOT NULL,
  contact_name   TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  category       TEXT NOT NULL CHECK (category IN ('voip','it-support','digital-marketing','web-design')),
  subject        TEXT NOT NULL,
  description    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','awaiting-client','resolved','closed')),
  priority       TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to    UUID REFERENCES profiles(id),
  assigned_name  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on ticket changes
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_updated_at ON tickets;
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_timestamp();

-- ============================================================
-- TICKET UPDATES TABLE (replies, internal notes, activity)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_updates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id   UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  author_id   UUID REFERENCES profiles(id),
  author_name TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow re-running this script
DROP POLICY IF EXISTS "public can submit tickets"        ON tickets;
DROP POLICY IF EXISTS "auth users can view all tickets"  ON tickets;
DROP POLICY IF EXISTS "auth users can update tickets"    ON tickets;
DROP POLICY IF EXISTS "auth users manage updates"        ON ticket_updates;
DROP POLICY IF EXISTS "public can insert updates"        ON ticket_updates;
DROP POLICY IF EXISTS "auth users can view profiles"     ON profiles;
DROP POLICY IF EXISTS "users can update own profile"     ON profiles;
DROP POLICY IF EXISTS "admins can update any profile"    ON profiles;
DROP POLICY IF EXISTS "admins can insert profiles"       ON profiles;

-- Tickets: anyone can INSERT (public form submission)
-- Authenticated users can view and update all tickets
CREATE POLICY "public can submit tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "auth users can view all tickets"
  ON tickets FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth users can update tickets"
  ON tickets FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Ticket updates: authenticated users manage all; public can insert (system updates)
CREATE POLICY "auth users manage updates"
  ON ticket_updates FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "public can insert updates"
  ON ticket_updates FOR INSERT
  WITH CHECK (true);

-- Profiles: authenticated users can view all profiles
-- Users can update their own; admins can update any
CREATE POLICY "auth users can view profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- PUBLIC RPC FUNCTIONS (for client ticket lookup)
-- These run as SECURITY DEFINER to bypass RLS safely.
-- They require BOTH email AND ticket number to match.
-- ============================================================

-- Get ticket details for the client tracker (my-ticket.html)
CREATE OR REPLACE FUNCTION get_my_ticket(
  p_email         TEXT,
  p_ticket_number TEXT
)
RETURNS TABLE (
  ticket_number  TEXT,
  company_name   TEXT,
  contact_name   TEXT,
  category       TEXT,
  subject        TEXT,
  description    TEXT,
  status         TEXT,
  priority       TEXT,
  assigned_name  TEXT,
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.ticket_number,
    t.company_name,
    t.contact_name,
    t.category,
    t.subject,
    t.description,
    t.status,
    t.priority,
    t.assigned_name,
    t.created_at,
    t.updated_at
  FROM tickets t
  WHERE LOWER(t.email)          = LOWER(p_email)
    AND UPPER(t.ticket_number)  = UPPER(p_ticket_number);
END;
$$ LANGUAGE plpgsql;

-- Get public (non-internal) updates for a ticket (client tracker)
CREATE OR REPLACE FUNCTION get_ticket_updates_public(
  p_ticket_number TEXT,
  p_email         TEXT
)
RETURNS TABLE (
  author_name TEXT,
  message     TEXT,
  created_at  TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.author_name,
    u.message,
    u.created_at
  FROM ticket_updates u
  JOIN tickets t ON t.id = u.ticket_id
  WHERE UPPER(t.ticket_number) = UPPER(p_ticket_number)
    AND LOWER(t.email)         = LOWER(p_email)
    AND u.is_internal          = false
  ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- USEFUL INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tickets_email         ON tickets (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets (UPPER(ticket_number));
CREATE INDEX IF NOT EXISTS idx_tickets_status        ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_category      ON tickets (category);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at    ON tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_updates_ticket ON ticket_updates (ticket_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email        ON profiles (LOWER(email));
