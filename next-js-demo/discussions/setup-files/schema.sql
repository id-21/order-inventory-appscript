-- =====================================================
-- ORDER & INVENTORY MANAGEMENT SYSTEM - DATABASE SCHEMA
-- =====================================================
-- This schema supports order entry and stock tracking
-- with QR code scanning capabilities
-- Uses TEXT IDs for Clerk authentication compatibility
-- =====================================================

-- Note: UUID extension not needed - using TEXT IDs for Clerk compatibility
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
-- Stores user authentication and role information
-- Synced from Clerk authentication service

CREATE TABLE users (
    -- Primary Key (TEXT to support Clerk user IDs like "user_...")
    id TEXT PRIMARY KEY,

    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,

    -- User Info
    full_name VARCHAR(255),

    -- Role & Permissions
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    -- Options: 'user', 'admin'

    -- Account Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CHECK (role IN ('user', 'admin'))
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- 2. ORDERS TABLE
-- =====================================================
-- Stores order header information
-- Each order can have multiple line items (in order_items table)

CREATE TABLE orders (
    -- Primary Key (TEXT with generated UUID string)
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Order Number (auto-incrementing, unique identifier shown to users)
    order_number SERIAL UNIQUE NOT NULL,

    -- Customer Information
    customer_name VARCHAR(255) NOT NULL,

    -- Order Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- Options: 'PENDING', 'COMPLETED', 'CANCELLED'

    -- Store complete order JSON for audit trail
    order_json JSONB NOT NULL,
    -- Structure: {"express": 45, "customerName": "John", "orderDetails": [...]}

    -- User who created the order
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'))
);

-- Indexes for orders table
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_name ON orders(customer_name);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- =====================================================
-- 3. ORDER ITEMS TABLE (Normalized)
-- =====================================================
-- Stores individual line items for each order
-- One row per Design/Quantity/Lot combination

CREATE TABLE order_items (
    -- Primary Key (TEXT with generated UUID string)
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Foreign Key to Orders
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    -- Line Item Details
    design VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    lot_number VARCHAR(255) NOT NULL,

    -- Fulfillment Tracking
    fulfilled_quantity INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- Options: 'PENDING', 'PARTIALLY_FULFILLED', 'FULFILLED'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (quantity > 0),
    CHECK (fulfilled_quantity >= 0),
    CHECK (fulfilled_quantity <= quantity),
    CHECK (status IN ('PENDING', 'PARTIALLY_FULFILLED', 'FULFILLED'))
);

-- Indexes for order_items table
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_design ON order_items(design);
CREATE INDEX idx_order_items_lot ON order_items(lot_number);
CREATE INDEX idx_order_items_status ON order_items(status);

-- =====================================================
-- 4. STOCK MOVEMENTS TABLE
-- =====================================================
-- Tracks all inventory movements (primarily stock-out operations)
-- Each row represents an aggregated movement by Design+Lot

CREATE TABLE stock_movements (
    -- Primary Key (TEXT with generated UUID string)
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Link to Order (nullable for custom/manual movements)
    order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,

    -- Invoice/Reference Number
    invoice_number VARCHAR(100) NOT NULL,

    -- Movement Details
    design VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    lot_number VARCHAR(255) NOT NULL,

    -- Unique Identifiers from QR codes (for traceability)
    unique_identifiers JSONB DEFAULT '[]',
    -- Array: ["UID-1", "UID-2", "UID-3", ...]

    -- Proof Image
    image_url TEXT,
    -- URL to uploaded image (Supabase Storage or external)

    -- Movement Type
    movement_type VARCHAR(20) DEFAULT 'OUT',
    -- Options: 'OUT', 'IN', 'ADJUSTMENT', 'CUSTOM'

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    -- Options: 'COMPLETED', 'CANCELLED'

    -- Store complete scan session data for audit
    session_json JSONB,
    -- Complete array of all scanned items with full details

    -- User who created the movement
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (quantity > 0),
    CHECK (movement_type IN ('OUT', 'IN', 'ADJUSTMENT', 'CUSTOM')),
    CHECK (status IN ('COMPLETED', 'CANCELLED'))
);

-- Indexes for stock_movements table
CREATE INDEX idx_stock_movements_order_id ON stock_movements(order_id);
CREATE INDEX idx_stock_movements_invoice ON stock_movements(invoice_number);
CREATE INDEX idx_stock_movements_design ON stock_movements(design);
CREATE INDEX idx_stock_movements_lot ON stock_movements(lot_number);
CREATE INDEX idx_stock_movements_created_by ON stock_movements(created_by);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);

-- =====================================================
-- 5. SCANNED ITEMS TABLE (Session Storage)
-- =====================================================
-- Temporary storage for items scanned during a stock-out session
-- Cleared after submission or session timeout

CREATE TABLE scanned_items (
    -- Primary Key (TEXT with generated UUID string)
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Session Identification
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,

    -- Scanned Item Details (from QR code JSON)
    design VARCHAR(255) NOT NULL,
    lot_number VARCHAR(255) NOT NULL,
    unique_identifier VARCHAR(255) NOT NULL,

    -- Processing Status
    is_processed BOOLEAN DEFAULT false,

    -- Timestamp
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE (session_id, unique_identifier)
);

-- Indexes for scanned_items table
CREATE INDEX idx_scanned_items_session ON scanned_items(session_id);
CREATE INDEX idx_scanned_items_user ON scanned_items(user_id);
CREATE INDEX idx_scanned_items_order ON scanned_items(order_id);
CREATE INDEX idx_scanned_items_unique_id ON scanned_items(unique_identifier);
CREATE INDEX idx_scanned_items_processed ON scanned_items(is_processed);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanned_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6.1 USERS TABLE POLICIES
-- =====================================================

-- Users can view own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::TEXT = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::TEXT = id);

-- Allow authenticated users to insert their own record
CREATE POLICY "Users can create own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::TEXT = id);

-- =====================================================
-- 6.2 ORDERS TABLE POLICIES
-- =====================================================

-- Users can view own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid()::TEXT = created_by);

-- Users can create own orders
CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid()::TEXT = created_by);

-- Users can update own orders
CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (auth.uid()::TEXT = created_by);

-- Users can delete own orders (if not completed)
CREATE POLICY "Users can delete own orders" ON orders
    FOR DELETE USING (
        auth.uid()::TEXT = created_by
        AND status != 'COMPLETED'
    );

-- =====================================================
-- 6.3 ORDER ITEMS TABLE POLICIES
-- =====================================================

-- Users can view items for their orders
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.created_by = auth.uid()::TEXT
        )
    );

-- Users can insert items for their orders
CREATE POLICY "Users can insert own order items" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.created_by = auth.uid()::TEXT
        )
    );

-- Users can update items for their orders
CREATE POLICY "Users can update own order items" ON order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.created_by = auth.uid()::TEXT
        )
    );

-- =====================================================
-- 6.4 STOCK MOVEMENTS TABLE POLICIES
-- =====================================================

-- Users can view own stock movements
CREATE POLICY "Users can view own stock movements" ON stock_movements
    FOR SELECT USING (auth.uid()::TEXT = created_by);

-- Users can insert own stock movements
CREATE POLICY "Users can insert own stock movements" ON stock_movements
    FOR INSERT WITH CHECK (auth.uid()::TEXT = created_by);

-- =====================================================
-- 6.5 SCANNED ITEMS TABLE POLICIES
-- =====================================================

-- Users can view own scanned items
CREATE POLICY "Users can view own scanned items" ON scanned_items
    FOR SELECT USING (auth.uid()::TEXT = user_id);

-- Users can insert own scanned items
CREATE POLICY "Users can insert own scanned items" ON scanned_items
    FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id);

-- Users can delete own scanned items (for session cleanup)
CREATE POLICY "Users can delete own scanned items" ON scanned_items
    FOR DELETE USING (auth.uid()::TEXT = user_id);

-- =====================================================
-- 7. ADMIN POLICIES (Full access for admin role)
-- =====================================================

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::TEXT
            AND users.role = 'admin'
        )
    );

-- Admins can view all orders
CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::TEXT
            AND users.role = 'admin'
        )
    );

-- Admins can update any order
CREATE POLICY "Admins can update all orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::TEXT
            AND users.role = 'admin'
        )
    );

-- Admins can view all order items
CREATE POLICY "Admins can view all order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::TEXT
            AND users.role = 'admin'
        )
    );

-- Admins can view all stock movements
CREATE POLICY "Admins can view all stock movements" ON stock_movements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::TEXT
            AND users.role = 'admin'
        )
    );

-- Admins can view all scanned items
CREATE POLICY "Admins can view all scanned items" ON scanned_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::TEXT
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- 8. FUNCTIONS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Function to get next order number (for display purposes)
-- Note: The SERIAL column handles actual auto-increment
CREATE OR REPLACE FUNCTION get_next_order_number()
RETURNS INTEGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(order_number), 0) + 1 INTO next_num FROM orders;
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update order status based on fulfillment
CREATE OR REPLACE FUNCTION update_order_status_on_fulfillment()
RETURNS TRIGGER AS $$
DECLARE
    total_items INTEGER;
    fulfilled_items INTEGER;
    order_status TEXT;
BEGIN
    -- Get counts for the order
    SELECT COUNT(*), COUNT(CASE WHEN status = 'FULFILLED' THEN 1 END)
    INTO total_items, fulfilled_items
    FROM order_items
    WHERE order_id = NEW.order_id;

    -- Determine status
    IF fulfilled_items = total_items THEN
        order_status := 'COMPLETED';
    ELSE
        order_status := 'PENDING';
    END IF;

    -- Update order status
    UPDATE orders
    SET status = order_status,
        completed_at = CASE WHEN order_status = 'COMPLETED' THEN NOW() ELSE NULL END
    WHERE id = NEW.order_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update order status when order items are fulfilled
CREATE TRIGGER trigger_update_order_status
AFTER UPDATE OF status ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_status_on_fulfillment();

-- =====================================================
-- 10. SAMPLE QUERIES (FOR REFERENCE)
-- =====================================================

-- Get all pending orders
-- SELECT * FROM orders WHERE status = 'PENDING' ORDER BY created_at DESC;

-- Get order with all line items
-- SELECT o.*, json_agg(oi.*) as items
-- FROM orders o
-- LEFT JOIN order_items oi ON o.id = oi.order_id
-- WHERE o.id = 'your-order-id'
-- GROUP BY o.id;

-- Get stock movements for a specific order
-- SELECT * FROM stock_movements WHERE order_id = 'your-order-id';

-- Get aggregated stock movements by design and lot
-- SELECT design, lot_number, SUM(quantity) as total_quantity, COUNT(*) as movement_count
-- FROM stock_movements
-- WHERE movement_type = 'OUT'
-- GROUP BY design, lot_number
-- ORDER BY design, lot_number;

-- Get user's order statistics
-- SELECT
--     created_by,
--     COUNT(*) as total_orders,
--     SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_orders,
--     SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_orders
-- FROM orders
-- GROUP BY created_by;

-- Clean up old scanned items (older than 24 hours)
-- DELETE FROM scanned_items WHERE scanned_at < NOW() - INTERVAL '24 hours';
