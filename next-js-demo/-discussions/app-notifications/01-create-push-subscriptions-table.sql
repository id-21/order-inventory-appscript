-- ============================================================================
-- PWA Push Notifications: Create push_subscriptions table
-- ============================================================================
-- This migration creates the table to store browser push notification
-- subscriptions for each user device.
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  -- Primary key
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- User association (references Clerk user ID from users table)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Push subscription credentials (from browser PushSubscription API)
  endpoint TEXT NOT NULL UNIQUE,  -- Unique push server URL
  p256dh TEXT NOT NULL,            -- Client public key (encryption)
  auth TEXT NOT NULL,              -- Authentication secret (encryption)

  -- Device metadata for user's reference
  user_agent TEXT,                 -- Browser/OS information
  device_name TEXT,                -- Optional: "Chrome on MacBook Pro"

  -- Lifecycle management
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ           -- Optional: subscription expiry
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Index for querying all subscriptions for a specific user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

-- Index for querying only active subscriptions (most common query)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active
  ON push_subscriptions(is_active)
  WHERE is_active = true;

-- Index for checking if endpoint already exists
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON push_subscriptions(endpoint);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions
  FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions
  FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE push_subscriptions IS 'Stores browser push notification subscriptions for PWA';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Unique browser push server URL';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Client public key for message encryption';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret for encryption';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'Browser and OS information';
COMMENT ON COLUMN push_subscriptions.is_active IS 'Whether subscription is currently active';
COMMENT ON COLUMN push_subscriptions.last_used_at IS 'Last time notification was sent to this subscription';

-- ============================================================================
-- Verification query
-- ============================================================================
-- Run this to verify the table was created successfully:
-- SELECT * FROM push_subscriptions LIMIT 1;
