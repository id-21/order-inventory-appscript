-- ============================================================================
-- PWA Real-Time Notifications: Enable Realtime for orders table
-- ============================================================================
-- This enables Supabase Realtime subscriptions for the orders table,
-- allowing clients to receive instant notifications when new orders are created.
--
-- Run this in Supabase SQL Editor (or configure via Dashboard)
-- ============================================================================

-- Enable replication for the orders table
-- This allows Realtime to broadcast database changes via WebSocket
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================================================
-- Alternative: Dashboard Configuration
-- ============================================================================
-- You can also enable this via Supabase Dashboard:
-- 1. Go to Database → Replication
-- 2. Find "orders" table
-- 3. Toggle ON replication
-- 4. Select events: INSERT, UPDATE
--
-- Note: DELETE events are optional, enable if you need notifications
-- when orders are deleted
-- ============================================================================

-- ============================================================================
-- Verification
-- ============================================================================
-- To verify Realtime is enabled, run:
-- SELECT schemaname, tablename FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime' AND tablename = 'orders';
--
-- Should return one row showing orders table is in the publication
-- ============================================================================

-- ============================================================================
-- RLS Considerations for Realtime
-- ============================================================================
-- IMPORTANT: Realtime respects Row Level Security (RLS) policies.
--
-- Current orders table RLS should allow non-admin users to SELECT orders.
-- If users aren't receiving real-time updates, check RLS policies:
--
-- SELECT * FROM orders; -- Test if user can see orders
--
-- If RLS is too restrictive, you may need to adjust policies to allow
-- non-admin users to SELECT orders (they don't need INSERT/UPDATE/DELETE)
-- ============================================================================

COMMENT ON TABLE orders IS 'Order management table with Realtime enabled for instant notifications';
