# Order & Inventory Management Migration Report
## From Google Apps Script to Next.js + Supabase

---

## Executive Summary

This report outlines the migration strategy for two Google Apps Script applications (**Order Management App** and **Stock Out App**) to a modern Next.js + Supabase stack. The current next-js-demo app already has a foundation with Clerk authentication, Supabase integration, and admin functionality that can be leveraged.

---

## Current State Analysis

### Existing next-js-demo Infrastructure

**✅ Already Implemented:**
- Next.js 16 with TypeScript
- Supabase client and admin setup
- Clerk authentication with admin role support
- Admin dashboard structure
- Basic CRUD API routes pattern
- Responsive styling with Tailwind CSS
- Service role key usage for admin operations

**⚠️ Current Purpose:**
- Virtual try-on app for eCommerce clothing (Gemini image generation)
- Schema: users, products, generated_assets
- Focus: AI-powered product visualization

**🎯 Migration Goal:**
- Extend the app to include Order Management and Inventory tracking
- Maintain existing virtual try-on features
- Add new order/inventory workflows

---

## Application Requirements Analysis

### 1. Order Management App (orderApp)

**Core Functionality:**
- Web form to collect order information
- Dynamic multi-row order line items (Design, Quantity, Lot)
- Auto-incrementing order numbers
- Customer name input
- Form validation and visual feedback
- Dual storage: JSON format + normalized rows

**Current Implementation:**
- Frontend: Single HTML file with inline JavaScript
- Backend: Google Apps Script (Code.gs)
- Storage: Google Sheets (2 sheets)
  - "Order JSON": One row per order with full JSON
  - "Order": One row per line item (normalized)
- No authentication required

**Data Model:**
```javascript
{
  express: 45,                    // Order number
  customerName: "John Doe",
  orderDetails: [
    {Design: "SKU-123", Qty: 5, Lot: "LOT-456"}
  ]
}
```

---

### 2. Stock Out App (stockOutApp)

**Core Functionality:**
- QR code scanning for inventory tracking
- Order-specific validation (scan only items from selected order)
- Pending order selection with card UI
- Custom order mode (manual entry without order)
- Image capture for proof of shipment
- Aggregated data storage by Design+Lot
- Auto-status updates (PENDING → COMPLETED)

**Current Implementation:**
- Frontend: Multiple HTML components (cards, scanner, table, js)
- Backend: Google Apps Script with session management
- Storage: Google Sheets (2 stock sheets + reads from Order sheets) + Google Drive (images)
- External Library: html5-qrcode v2.3.8
- Session: Script Properties for temporary storage

**Data Model:**
```javascript
// QR Code Format
{
  "Design": "SKU-123",
  "Lot": "LOT-456",
  "Unique Identifier": "UID-789"
}

// Aggregated Stock Entry
{
  date: "November 24, 2025",
  express: 45,
  status: "COMPLETED",
  design: "SKU-123",
  qty: 5,
  lot: "LOT-456",
  link: "https://drive.google.com/...",
  uid: ["UID-1", "UID-2", ...],
  timestamp: "..."
}
```

---

## Database Schema Design

### New Tables Required

#### 1. **orders** Table
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number INTEGER UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,

    -- Order status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- Options: 'PENDING', 'COMPLETED', 'CANCELLED'

    -- Store full order JSON for audit
    order_json JSONB NOT NULL,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Indexes
    INDEX idx_orders_order_number (order_number),
    INDEX idx_orders_status (status),
    INDEX idx_orders_customer_name (customer_name),
    INDEX idx_orders_created_at (created_at DESC)
);
```

#### 2. **order_items** Table (Normalized)
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    -- Line item details
    design VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    lot_number VARCHAR(255) NOT NULL,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    fulfilled_quantity INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    INDEX idx_order_items_order_id (order_id),
    INDEX idx_order_items_design (design),
    INDEX idx_order_items_lot (lot_number),

    CHECK (quantity > 0),
    CHECK (fulfilled_quantity >= 0),
    CHECK (fulfilled_quantity <= quantity)
);
```

#### 3. **stock_movements** Table
```sql
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Link to order (nullable for custom stock movements)
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,

    -- Movement details
    design VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    lot_number VARCHAR(255) NOT NULL,

    -- Unique identifiers from QR codes
    unique_identifiers JSONB DEFAULT '[]',
    -- Array: ["UID-1", "UID-2", ...]

    -- Image proof
    image_url TEXT,

    -- Type of movement
    movement_type VARCHAR(20) DEFAULT 'OUT',
    -- Options: 'OUT', 'IN', 'ADJUSTMENT'

    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',

    -- Store complete scan session JSON
    session_json JSONB,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    INDEX idx_stock_movements_order_id (order_id),
    INDEX idx_stock_movements_invoice (invoice_number),
    INDEX idx_stock_movements_design (design),
    INDEX idx_stock_movements_lot (lot_number),
    INDEX idx_stock_movements_created_at (created_at DESC)
);
```

#### 4. **scanned_items** Table (Session Storage)
```sql
CREATE TABLE scanned_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Session identification
    session_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),

    -- Scanned item details
    design VARCHAR(255) NOT NULL,
    lot_number VARCHAR(255) NOT NULL,
    unique_identifier VARCHAR(255) NOT NULL,

    -- Metadata
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_processed BOOLEAN DEFAULT false,

    -- Indexes
    INDEX idx_scanned_items_session (session_id),
    INDEX idx_scanned_items_user (user_id),
    INDEX idx_scanned_items_unique_id (unique_identifier),

    UNIQUE (session_id, unique_identifier)
);
```

### Relationships Overview
```
users
  │
  ├─► orders (1:N)
  │     │
  │     ├─► order_items (1:N)
  │     └─► stock_movements (1:N)
  │
  ├─► stock_movements (1:N)
  └─► scanned_items (1:N)
```

---

## File Structure & Implementation Plan

### Phase 1: Database Setup ✅ FOUNDATIONAL

**Files to Create:**
```
next-js-demo/
├── discussions/
│   └── order-inventory-schema.sql    [NEW - Migration SQL]
```

**Actions:**
1. Create SQL migration file with all 4 new tables
2. Add indexes and constraints
3. Set up RLS policies for user data isolation
4. Configure foreign key relationships

---

### Phase 2: Order Management Module

#### A. Backend API Routes

**Files to Create:**
```
app/api/
├── orders/
│   ├── route.ts                      [NEW - GET all orders, POST new order]
│   ├── [id]/
│   │   ├── route.ts                  [NEW - GET/PUT/DELETE specific order]
│   │   └── items/
│   │       └── route.ts              [NEW - GET order items]
│   └── next-id/
│       └── route.ts                  [NEW - GET next order number]
```

**Key API Endpoints:**
- `POST /api/orders` - Create new order
- `GET /api/orders` - List orders (with filters: status, customer, date)
- `GET /api/orders/[id]` - Get order details
- `PUT /api/orders/[id]` - Update order
- `DELETE /api/orders/[id]` - Cancel order
- `GET /api/orders/next-id` - Get next order number
- `GET /api/orders/[id]/items` - Get order line items

#### B. Supabase Helper Functions

**Files to Create/Modify:**
```
lib/
├── supabase-orders.ts                [NEW - Order CRUD functions]
```

**Functions Needed:**
```typescript
// Order operations
export async function createOrder(orderData, userId)
export async function getOrders(filters)
export async function getOrderById(orderId)
export async function updateOrderStatus(orderId, status)
export async function getNextOrderNumber()
export async function deleteOrder(orderId)

// Order items
export async function getOrderItems(orderId)
export async function updateOrderItemStatus(itemId, status, fulfilledQty)
```

#### C. Frontend Pages & Components

**Files to Create:**
```
app/
├── orders/
│   ├── page.tsx                      [NEW - Order list view]
│   ├── new/
│   │   └── page.tsx                  [NEW - Create order form]
│   └── [id]/
│       └── page.tsx                  [NEW - Order detail view]
├── components/
│   ├── orders/
│   │   ├── OrderForm.tsx             [NEW - Dynamic order form]
│   │   ├── OrderList.tsx             [NEW - Orders table]
│   │   ├── OrderCard.tsx             [NEW - Order card for mobile]
│   │   └── OrderItemRow.tsx          [NEW - Dynamic line item row]
```

**Component Features:**
- `OrderForm`:
  - Auto-fetch next order number
  - Dynamic add/remove rows
  - Client-side validation
  - Success/error feedback
- `OrderList`:
  - Status filters (PENDING, COMPLETED)
  - Search by customer name
  - Pagination
  - Responsive table/cards
- `OrderCard`:
  - Mobile-optimized display
  - Status badges
  - Quick actions

---

### Phase 3: Stock Out / Inventory Module

#### A. Backend API Routes

**Files to Create:**
```
app/api/
├── stock/
│   ├── movements/
│   │   ├── route.ts                  [NEW - GET/POST stock movements]
│   │   └── [id]/
│   │       └── route.ts              [NEW - GET specific movement]
│   ├── scan-session/
│   │   ├── start/
│   │   │   └── route.ts              [NEW - Initialize scan session]
│   │   ├── scan/
│   │   │   └── route.ts              [NEW - Process QR code scan]
│   │   ├── items/
│   │   │   └── route.ts              [NEW - Get scanned items]
│   │   ├── submit/
│   │   │   └── route.ts              [NEW - Finalize stock movement]
│   │   └── clear/
│   │       └── route.ts              [NEW - Clear session]
```

**Key API Endpoints:**
- `POST /api/stock/scan-session/start` - Start scan session with order
- `POST /api/stock/scan-session/scan` - Validate and store QR scan
- `GET /api/stock/scan-session/items` - Get aggregated scanned items
- `POST /api/stock/scan-session/submit` - Submit with image
- `DELETE /api/stock/scan-session/clear` - Clear session data
- `GET /api/stock/movements` - List stock movements
- `POST /api/stock/movements` - Create custom movement

#### B. Image Upload Handling

**Files to Create:**
```
app/api/
├── upload/
│   └── image/
│       └── route.ts                  [NEW - Handle image upload]
```

**Implementation Options:**
1. **Supabase Storage** (Recommended):
   - Create bucket: `stock-movement-images`
   - Upload base64 images
   - Return public URL

2. **Alternative**: External service (Cloudinary, AWS S3)

#### C. Supabase Helper Functions

**Files to Create:**
```
lib/
├── supabase-stock.ts                 [NEW - Stock operations]
├── supabase-storage.ts               [NEW - Image upload helpers]
```

**Functions Needed:**
```typescript
// Session management
export async function startScanSession(userId, orderId, sessionId)
export async function addScannedItem(sessionId, qrData)
export async function getScannedItems(sessionId)
export async function clearScanSession(sessionId)

// Validation
export async function validateQRCode(qrData, orderId)
export async function checkDuplicateScan(sessionId, uniqueId)
export async function checkQuantityLimit(orderId, design, lot, currentQty)

// Stock movements
export async function createStockMovement(movementData, userId)
export async function getStockMovements(filters)
export async function updateOrderStatusAfterStock(orderId)

// Image handling
export async function uploadStockImage(base64Image, filename)
```

#### D. Frontend Pages & Components

**Files to Create:**
```
app/
├── stock/
│   ├── out/
│   │   └── page.tsx                  [NEW - Stock out page]
│   ├── history/
│   │   └── page.tsx                  [NEW - Movement history]
├── components/
│   ├── stock/
│   │   ├── OrderCardSelector.tsx     [NEW - Pending order cards]
│   │   ├── QRScanner.tsx             [NEW - QR scanning component]
│   │   ├── ScannedItemsTable.tsx     [NEW - Live scan table]
│   │   ├── ImageCapture.tsx          [NEW - Camera/upload component]
│   │   ├── StockSubmitForm.tsx       [NEW - Final submission form]
│   │   └── MovementHistory.tsx       [NEW - History table]
```

**Component Features:**
- `OrderCardSelector`:
  - Fetch pending orders
  - Horizontal scrolling cards
  - Custom order option
  - Auto-fill invoice number
- `QRScanner`:
  - Integrate html5-qrcode library
  - Real-time scan feedback
  - Duplicate prevention
  - Error alerts
- `ScannedItemsTable`:
  - Aggregate by Design+Lot
  - Show quantities
  - Real-time updates
- `ImageCapture`:
  - Camera access
  - Image preview
  - Base64 conversion
- `StockSubmitForm`:
  - Invoice number validation
  - Loading states
  - Success feedback

---

### Phase 4: Admin Dashboard Extensions

**Files to Modify:**
```
app/admin/
├── orders/
│   └── page.tsx                      [NEW - Admin order management]
├── stock/
│   └── page.tsx                      [NEW - Admin stock overview]
└── dashboard/
    └── page.tsx                      [MODIFY - Add order/stock stats]
```

**Features:**
- View all orders (all users)
- View all stock movements
- Order analytics (completion rate, avg items per order)
- Inventory reports
- User activity tracking

---

## Required NPM Packages

### Already Installed ✅
- `@supabase/supabase-js`: Database client
- `@clerk/nextjs`: Authentication
- `next`, `react`, `react-dom`: Core framework
- `tailwindcss`: Styling

### Need to Install 📦
```bash
npm install html5-qrcode          # QR code scanning
npm install react-webcam          # Alternative for camera access
npm install date-fns              # Date formatting utilities
npm install uuid                  # Session ID generation
```

---

## Configuration Files Needed

### Environment Variables (.env.local)
```bash
# Existing
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-key
CLERK_SECRET_KEY=your-secret

# New (if using external image storage)
# CLOUDINARY_CLOUD_NAME=your-cloud-name
# CLOUDINARY_API_KEY=your-api-key
# CLOUDINARY_API_SECRET=your-api-secret
```

### Supabase Configuration
1. **Storage Bucket**: Create `stock-movement-images` bucket
2. **RLS Policies**: Configure policies for all new tables
3. **Sequence**: Create sequence for order_number auto-increment

---

## What Can Be Removed (Not Needed)

### From Current next-js-demo App

**❌ Keep Everything - Nothing to Remove**

The current virtual try-on functionality should be maintained:
- Gemini image generation features
- Existing products/generated_assets tables
- Admin dashboard for products/generations
- User management

**Why?**
- The apps serve different purposes
- Order/inventory is a separate module
- Existing features may be useful for future integration
- Clean separation of concerns

### From Apps Script Migration

**❌ Won't Need in Next.js:**
1. **Google Sheets Integration**: Replaced by Supabase
2. **Script Properties**: Replaced by database session storage
3. **Google Drive API**: Replaced by Supabase Storage
4. **Apps Script doGet()**: Replaced by Next.js routing
5. **Template includes (include())**: Replaced by React components
6. **Inline event handlers**: Replaced by React event handling
7. **google.script.run**: Replaced by fetch API calls

**✅ Will Port Over:**
1. Business logic (validation, aggregation)
2. UI/UX patterns (cards, dynamic rows, scanning flow)
3. Data models and relationships
4. Status workflows (PENDING → COMPLETED)
5. Mobile-first responsive design

---

## Migration Priorities & Phasing

### 🏗️ Foundation (Week 1)
**Priority: CRITICAL**
1. Create database schema migration
2. Run migration on Supabase
3. Set up RLS policies
4. Create storage bucket for images
5. Test database connections

**Files:**
- `discussions/order-inventory-schema.sql`
- Supabase dashboard configuration

---

### 📦 Order Management (Week 2)
**Priority: HIGH**
1. Create order API routes
2. Build Supabase helper functions
3. Create order form page
4. Build order list/detail pages
5. Test order creation flow end-to-end

**Files:**
- `lib/supabase-orders.ts`
- `app/api/orders/**`
- `app/orders/**`
- `app/components/orders/**`

---

### 📱 Stock Out Module (Week 3-4)
**Priority: HIGH**
1. Install QR scanning library
2. Create stock API routes
3. Build scan session management
4. Create QR scanner component
5. Build order card selector
6. Implement image upload
7. Create scanned items table
8. Build submission flow
9. Test with real QR codes

**Files:**
- `lib/supabase-stock.ts`
- `lib/supabase-storage.ts`
- `app/api/stock/**`
- `app/stock/**`
- `app/components/stock/**`

---

### 👨‍💼 Admin Features (Week 5)
**Priority: MEDIUM**
1. Add order management to admin
2. Add stock movement reports
3. Update dashboard with new stats
4. Add analytics queries

**Files:**
- `app/admin/orders/page.tsx`
- `app/admin/stock/page.tsx`
- `app/api/admin/orders/**`
- `app/api/admin/stock/**`

---

### 🎨 Polish & Testing (Week 6)
**Priority: LOW**
1. Mobile optimization
2. Error handling improvements
3. Loading states
4. Success feedback animations
5. Comprehensive testing
6. Documentation

---

## Key Technical Decisions

### 1. Authentication Strategy
**Decision:** Use Clerk (already integrated)
- Warehouse staff will need user accounts
- Role-based access (user vs admin)
- Clerk provides user metadata storage

**Implementation:**
- Sync Clerk users to Supabase `users` table
- Use webhook or manual sync
- Store Clerk user ID in `users.id`

---

### 2. Session Management (QR Scanning)
**Decision:** Database-backed sessions (not Script Properties)

**Options:**
a. **Database Table (Recommended)**: `scanned_items` table
   - ✅ Survives page refresh
   - ✅ Can resume interrupted sessions
   - ✅ Audit trail
   - ❌ Requires cleanup logic

b. **Client-side (localStorage/React state)**:
   - ✅ Fast, no API calls
   - ❌ Lost on page refresh
   - ❌ No server validation

**Choice:** Option A (database) for reliability

---

### 3. Image Storage
**Decision:** Supabase Storage

**Reasoning:**
- Already using Supabase
- No additional service costs
- Easy integration
- Direct CDN URLs
- RLS policies available

**Alternative:** Cloudinary (if advanced image processing needed)

---

### 4. Real-time Updates
**Decision:** Manual refresh initially, add Supabase Realtime later

**Phase 1:**
- Manual refresh button after submission
- Optimistic UI updates

**Phase 2 (Future):**
- Supabase Realtime subscriptions
- Live order status updates
- Live scan notifications for team

---

### 5. Mobile vs Desktop
**Decision:** Mobile-first, responsive design

**Reasoning:**
- Original apps were mobile-focused (40px root font)
- Warehouse operations are mobile-centric
- QR scanning requires mobile camera
- Touch-friendly UI critical

**Implementation:**
- Tailwind responsive breakpoints
- Touch-optimized buttons (min 44x44px)
- Camera-first image capture
- Horizontal card scrolling

---

## Data Migration Strategy

### From Google Sheets to Supabase

**Option 1: Manual CSV Export/Import** (Recommended for one-time)
1. Export "Order JSON" sheet as CSV
2. Parse JSON column
3. Insert into `orders` and `order_items` tables
4. Export "Stock" sheet as CSV
5. Insert into `stock_movements` table

**Option 2: Apps Script Migration Tool**
```javascript
// Write a one-time script to read from Sheets
// and POST to Next.js API endpoints
function migrateOrders() {
  const orders = // read from sheet
  orders.forEach(order => {
    UrlFetchApp.fetch('https://your-app.com/api/orders', {
      method: 'POST',
      payload: JSON.stringify(order)
    });
  });
}
```

**Recommendation:** Option 1 with data validation script

---

## Testing Strategy

### Unit Tests
- API route handlers
- Validation functions
- Data aggregation logic
- QR code parsing

### Integration Tests
- Order creation flow
- QR scanning session lifecycle
- Image upload and storage
- Order status updates

### E2E Tests
- Complete order entry workflow
- Complete stock out workflow
- Admin dashboard interactions

### Manual Testing Checklist
- [ ] Create order with multiple items
- [ ] Scan QR codes for order
- [ ] Upload image
- [ ] Verify order status changes to COMPLETED
- [ ] Check data appears correctly in admin
- [ ] Test custom order flow (no order selected)
- [ ] Test duplicate QR scan prevention
- [ ] Test quantity limit validation
- [ ] Test mobile responsiveness
- [ ] Test camera access on mobile

---

## Performance Considerations

### Database Optimization
1. **Indexes**: Already included in schema
   - Order number (unique, indexed)
   - Status fields (for filtering)
   - Created_at (for sorting)
   - Foreign keys (automatic in Postgres)

2. **Query Optimization**:
   - Use `select()` with specific columns
   - Implement pagination (limit/offset)
   - Use `count()` for totals
   - Cache dashboard stats

3. **Connection Pooling**:
   - Supabase handles automatically
   - Use supabaseAdmin for admin routes

### Image Optimization
1. **Client-side**:
   - Compress before upload (canvas resize)
   - Max resolution: 1920x1080
   - JPEG quality: 80%

2. **Storage**:
   - Use Supabase's built-in CDN
   - Consider thumbnails for list views
   - Set up bucket lifecycle policies

### API Response Times
- Order list: < 500ms
- QR scan validation: < 200ms
- Image upload: < 3s
- Stock submission: < 2s

---

## Security Considerations

### Row Level Security (RLS)
```sql
-- Orders: Users see only their orders
CREATE POLICY "Users view own orders"
ON orders FOR SELECT
USING (created_by = auth.uid());

-- Orders: Users insert own orders
CREATE POLICY "Users create orders"
ON orders FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Stock movements: Users view own movements
CREATE POLICY "Users view own stock movements"
ON stock_movements FOR SELECT
USING (created_by = auth.uid());

-- Admin bypass: Service role bypasses all policies
-- (using supabaseAdmin client)
```

### API Route Protection
```typescript
// Protect user routes
import { auth } from "@clerk/nextjs";

export async function GET(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}

// Protect admin routes
import { isUserAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { userId } = auth();
  const isAdmin = await isUserAdmin(userId);
  if (!isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  // ...
}
```

### Input Validation
- Validate QR code JSON structure
- Sanitize customer names (prevent SQL injection)
- Validate quantity values (positive integers)
- Validate order numbers (unique, sequential)
- Validate image format and size

### Image Upload Security
- Validate file type (JPEG/PNG only)
- Limit file size (5MB max)
- Generate random filenames (prevent overwrites)
- Scan for malware (optional: VirusTotal API)
- Set Content-Security-Policy headers

---

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database migration executed
- [ ] RLS policies tested
- [ ] Storage bucket created and configured
- [ ] Test data populated
- [ ] Admin user created
- [ ] All API routes tested

### Deployment
- [ ] Deploy to Vercel/Netlify
- [ ] Configure custom domain
- [ ] Set up SSL/TLS
- [ ] Configure CORS if needed
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure error alerting

### Post-deployment
- [ ] Smoke test all critical flows
- [ ] Load test with expected traffic
- [ ] Monitor API response times
- [ ] Check error logs
- [ ] Verify image uploads working
- [ ] Test mobile camera access
- [ ] User acceptance testing with warehouse staff

---

## Documentation Needs

### For Developers
1. API documentation (endpoints, request/response formats)
2. Database schema documentation
3. Component library documentation
4. Setup and installation guide
5. Deployment guide

### For Users
1. Order entry tutorial (with screenshots)
2. Stock out scanning guide
3. QR code format specification
4. Troubleshooting guide
5. FAQ

### For Admins
1. Admin dashboard guide
2. User management instructions
3. Report generation guide
4. Data export procedures

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
1. **Bulk Operations**:
   - Bulk order import (CSV/Excel)
   - Bulk status updates
   - Batch printing

2. **Advanced Reporting**:
   - Inventory level tracking
   - Order fulfillment analytics
   - Customer order history
   - Export to Excel/PDF

3. **Real-time Collaboration**:
   - Live order status updates
   - Team notifications
   - Multi-user scanning sessions

4. **Offline Mode**:
   - PWA with service worker
   - IndexedDB for offline storage
   - Sync when back online

5. **Barcode Support**:
   - Support 1D barcodes (in addition to QR)
   - Print barcode labels
   - Barcode scanner hardware integration

6. **Mobile App**:
   - React Native wrapper
   - Native camera access
   - Push notifications
   - Background scanning

7. **Integrations**:
   - Connect to ERP systems
   - Shopify/WooCommerce integration
   - Shipping carrier APIs
   - Email notifications

8. **Advanced Features**:
   - Predictive inventory alerts
   - Order priority management
   - Route optimization for picking
   - Voice commands for hands-free operation

---

## Cost Estimation

### Supabase (Free Tier)
- 500MB database storage
- 1GB file storage
- 2GB bandwidth
- 50k monthly active users
- **Cost: $0/month** (MVP should fit)

### Supabase (Pro Tier - if needed)
- 8GB database
- 100GB file storage
- 250GB bandwidth
- **Cost: $25/month**

### Clerk Authentication
- Free: 10,000 monthly active users
- **Cost: $0/month** (warehouse staff << 10k)

### Vercel Hosting
- Free: Hobby plan
- Pro: $20/month (if needed for team features)

### Total Estimated Cost (MVP)
- **$0-25/month** depending on usage

---

## Risk Assessment

### High Risk ⚠️
1. **Mobile Camera Access**:
   - **Risk**: Browser compatibility issues
   - **Mitigation**: Test on multiple devices, provide fallback to file upload

2. **QR Scanning Accuracy**:
   - **Risk**: Poor lighting, damaged codes
   - **Mitigation**: Manual entry fallback, validation feedback

3. **Image Upload Size**:
   - **Risk**: Large images causing timeouts
   - **Mitigation**: Client-side compression, progress indicators

### Medium Risk ⚡
1. **Concurrent Session Conflicts**:
   - **Risk**: Multiple users scanning same order
   - **Mitigation**: Lock mechanism, validation on submit

2. **Network Issues**:
   - **Risk**: Lost connection during scanning
   - **Mitigation**: Session recovery, clear error messages

3. **Data Migration Errors**:
   - **Risk**: Lost or corrupted data from Sheets
   - **Mitigation**: Backup before migration, validation scripts

### Low Risk ✅
1. **Learning Curve**:
   - **Risk**: Staff unfamiliar with new interface
   - **Mitigation**: Training, documentation, gradual rollout

2. **Performance Issues**:
   - **Risk**: Slow response times
   - **Mitigation**: Proper indexing, caching, load testing

---

## Success Metrics

### Technical Metrics
- API response time < 500ms (95th percentile)
- Image upload success rate > 98%
- QR scan success rate > 95%
- Zero data loss incidents
- 99.9% uptime

### Business Metrics
- Order entry time reduced by 50% vs. manual
- Stock out processing time < 5 min per order
- Error rate < 1% (incorrect orders/stock movements)
- User satisfaction score > 4/5
- Admin reporting time reduced by 80%

---

## Conclusion

### Summary
The migration from Google Apps Script to Next.js + Supabase is feasible and beneficial:

**✅ Advantages:**
- Better performance and scalability
- Modern development experience
- Advanced features (real-time, offline, etc.)
- Better mobile experience
- Easier maintenance and testing
- Professional UI/UX
- Robust authentication and authorization

**⚠️ Challenges:**
- Initial development time (6 weeks estimated)
- Data migration complexity
- User training required
- QR scanning library integration
- Image storage configuration

**🎯 Recommendation:**
**Proceed with migration** - The long-term benefits outweigh the initial investment. The existing next-js-demo foundation provides a significant head start.

### Next Steps
1. **Review and approve** this migration plan
2. **Set up development environment** (clone repo, install dependencies)
3. **Create database schema** and run migration
4. **Begin Phase 1** (Order Management) development
5. **Conduct weekly reviews** to track progress
6. **Plan user training** during Phase 3
7. **Schedule migration date** after Phase 4 completion

---

## Appendix

### A. Quick Start Commands
```bash
# Clone and setup
cd next-js-demo
npm install
npm install html5-qrcode date-fns uuid

# Create schema file
touch discussions/order-inventory-schema.sql

# Run dev server
npm run dev

# Create first order API route
mkdir -p app/api/orders
touch app/api/orders/route.ts
```

### B. Useful Queries
See [Database Schema Design](#database-schema-design) section

### C. Component Tree
```
App
├── Layout
│   ├── Header
│   │   ├── AuthHeader (with user menu)
│   │   └── AdminHeaderLink (if admin)
│   └── Main Content
│       ├── Orders Module
│       │   ├── OrderList
│       │   ├── OrderForm
│       │   └── OrderDetail
│       ├── Stock Module
│       │   ├── OrderCardSelector
│       │   ├── QRScanner
│       │   ├── ScannedItemsTable
│       │   └── ImageCapture
│       └── Admin Module
│           ├── Dashboard
│           ├── Orders Management
│           └── Stock Reports
```

### D. References
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [html5-qrcode Library](https://github.com/mebjas/html5-qrcode)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Report Generated:** November 24, 2025
**Version:** 1.0
**Author:** Migration Planning Team
