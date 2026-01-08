<system_context>
API routes for order management operations. Handles order creation with validation, order list retrieval with filtering, and next order number preview for order creation form.
</system_context>

<file_map>
## FILE MAP
- `route.ts` - GET orders with filters (status, customerName, pagination), POST to create new order
- `next-id/route.ts` - GET preview of next auto-generated order number

See: [../../../lib/features/supabase-orders.ts](../../../lib/features/supabase-orders.ts) for business logic
</file_map>

<patterns>
## PATTERNS

**Auth Guard Pattern**
Both routes verify Clerk authentication:
- Extract userId from auth()
- Return 401 Unauthorized if missing
- Pass userId to feature layer for created_by tracking
Example: `route.ts:11-15`, `next-id/route.ts:11-15`

**Query String Filtering Pattern**
GET /api/orders extracts optional filters from searchParams:
- status: Cast to enum type union
- customerName: Direct string extraction
- limit/offset: parseInt for pagination
- Convert null to undefined for optional params
Example: `route.ts:17-30`

**Server-Side Validation Pattern**
POST validates request body before DB operation:
1. Customer name required and non-empty
2. At least one order item required
3. Per-item validation (Design, Qty, Lot all required)
4. Quantity must be > 0
Example: `route.ts:57-92`

**Capitalized Field Names Pattern**
API expects capitalized field names matching QR code schema:
- Frontend sends: `{ Design, Qty, Lot }`
- Feature layer transforms to: `{ design, quantity, lot_number }`
- Maintains consistency with QR validation
Example: `route.ts:74`, `route.ts:80`, `route.ts:86`

**201 Created Response Pattern**
POST returns 201 status code with created resource:
- Includes success flag
- Returns full order object with items
- Includes formatted success message with order number
Example: `route.ts:102-109`

**Preview-Only Order Number Pattern**
next-id endpoint returns preview for UI display:
- Shows user what order number will be generated
- Actual order number generated server-side on POST
- Don't trust client-provided order number
Example: `next-id/route.ts:17-19`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Order Number Race Condition** - next-id preview can become stale if another order created before POST. Server generates actual number, so preview is informational only: `next-id/route.ts:17`

- **Capitalized Field Requirement** - POST expects `Design`, `Qty`, `Lot` (capitalized). This matches QR code schema but differs from database schema (lowercase). Feature layer handles transformation: `route.ts:74-91`

- **No Per-Item Validation Details** - Validation loop returns generic error without specifying which item failed. Consider adding item index to error message: `route.ts:73-92`

- **userId Filter on GET** - Orders endpoint filters by userId (only shows user's orders). No org-wide view available: `route.ts:24-30`

- **No Pagination Defaults** - Limit/offset are optional without defaults. Query could return all orders (potentially expensive). Consider default limit: `route.ts:28-29`

- **Customer Name Uniqueness** - No validation for duplicate customer names. Multiple orders can have identical customer_name: `route.ts:58-63`

- **Validation Duplication** - Server-side validation duplicates client-side validation in new order form. Keep in sync or extract to shared schema (e.g., Zod): `route.ts:57-92` vs `app/orders/new/page.tsx:66-89`

- **Order Number Not in Response** - GET returns orders but order_number is in database schema. Ensure it's included in response for UI display: `route.ts:32`
</critical_notes>

<paved_path>
## PAVED PATH

**Adding Shared Validation Schema**
To avoid duplication between client and server:
1. Install Zod: `npm install zod`
2. Create `lib/schemas/order-schema.ts`
3. Define schema: `z.object({ customerName: z.string().min(1), orderDetails: z.array(...) })`
4. Use schema.parse() in API route
5. Use same schema with react-hook-form on frontend
6. Single source of truth for validation rules

**Implementing Order Search**
To add full-text search beyond customerName:
1. Add search param: `?search=term`
2. Use Supabase .textSearch() or .or() filters
3. Search across: customer_name, design, lot_number, order_number
4. Consider adding GIN index on searchable fields
5. Return highlighted matches in response

**Adding Pagination Defaults**
To prevent unbounded queries:
1. Add default limit (e.g., 50) if not provided
2. Add max limit validation (e.g., 500)
3. Return pagination metadata: `{ orders, total, page, limit }`
4. Use .range() for offset-based pagination
5. Consider cursor-based pagination for large datasets

**Implementing Order Edit**
To add PUT endpoint:
1. Create `/api/orders/[id]/route.ts`
2. Add PUT handler: validate orderId, check ownership
3. Prevent edit if any items partially fulfilled
4. Update order_json with edit history
5. Return updated order with audit trail

**Adding Bulk Operations**
To handle multiple orders:
1. Add POST `/api/orders/bulk`
2. Accept array of order creation requests
3. Use Promise.all() for parallel creation
4. Return array of results with success/failure per order
5. Consider transaction wrapper for all-or-nothing

**Optimizing next-id Preview**
To reduce race condition window:
1. Fetch next-id immediately before form submission (not on mount)
2. Or remove preview entirely, show after creation
3. Or use optimistic UI with placeholder "Generating..."
4. Server-generated number is source of truth regardless
</paved_path>