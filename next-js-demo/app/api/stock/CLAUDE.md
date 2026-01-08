<system_context>
API routes for stock management operations. Handles scan session lifecycle (start, scan, batch, submit, clear), stock movement history retrieval, and image upload for proof of shipment.
</system_context>

<file_map>
## FILE MAP
- `movements/route.ts` - GET stock movements with filters (userId, orderId, status, pagination)
- `scan-session/` - Scan session management endpoints
  - `start/route.ts` - POST to initialize new scan session (clears incomplete sessions)
  - `scan/route.ts` - POST to validate and add single scan (server-side validation, legacy endpoint)
  - `batch/route.ts` - POST to bulk insert scanned items after client-side validation
  - `submit/route.ts` - POST to finalize session (upload image, create movements, update orders)
  - `clear/route.ts` - DELETE to clear session data
  - `items/route.ts` - GET aggregated session items

See: [../../../lib/features/supabase-stock.ts](../../../lib/features/supabase-stock.ts) for business logic
See: [../../../lib/features/supabase-storage.ts](../../../lib/features/supabase-storage.ts) for image handling
</file_map>

<patterns>
## PATTERNS

**Auth Guard Pattern**
Every route checks Clerk authentication first:
- `const { userId } = await auth()`
- Return 401 if no userId
- Pass userId to feature functions for audit trail
Example: `movements/route.ts:11-15`, `scan-session/submit/route.ts:12-16`

**Query Param Extraction Pattern**
GET routes extract typed params from searchParams:
- Parse integers with parseInt() for limit/offset
- Cast status enums with `as Type | null`
- Convert null strings to undefined for optional filters
Example: `movements/route.ts:17-21`

**Validation Chain Pattern**
scan/route.ts implements four-step server-side validation:
1. Format validation (required fields exist)
2. Order validation (item matches order)
3. Duplicate check (unique identifier not scanned)
4. Quantity limit check (within remaining quantity)
Example: `scan-session/scan/route.ts:52-97`

**Batch vs Single Scan Pattern**
Two scan endpoints for different workflows:
- `scan/route.ts`: Server-side validation per scan (legacy, higher latency)
- `batch/route.ts`: Client validates, server bulk inserts (current workflow)
Example: `scan-session/scan/route.ts:15-120` vs `batch/route.ts:37-108`

**Retry-Safe Batch Insert Pattern**
Batch endpoint clears existing session items before insert:
- Prevents duplicates on retry/refresh
- Only deletes `is_processed: false` items
- Uses sessionId + userId for safety
Example: `scan-session/batch/route.ts:62-68`

**IST Timezone Conversion Pattern**
Batch route converts scannedAt timestamps to IST (UTC+5:30):
- Uses toLocaleString with Asia/Kolkata timezone
- Parses and reformats to PostgreSQL ISO format
- Ensures consistent server timezone handling
Example: `scan-session/batch/route.ts:10-31`, `batch/route.ts:79`

**Submit Pipeline Pattern**
Submit route performs three operations sequentially:
1. Upload image to Supabase Storage (if provided)
2. Create stock movements from scanned items
3. Update order fulfillment status (automatic in createStockMovement)
Example: `scan-session/submit/route.ts:35-57`

**Error Propagation Pattern**
Routes return detailed errors from business logic:
- Catch errors from feature layer
- Extract error.message if Error instance
- Return generic fallback message otherwise
Example: `scan-session/submit/route.ts:66-73`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Scan Endpoint is Legacy** - `scan-session/scan/route.ts` does server-side validation per scan causing latency. Current app uses client-side validation + `batch/route.ts` for instant feedback: `scan-session/scan/route.ts:51-97`

- **Batch Clears Before Insert** - `batch/route.ts` deletes existing session items to handle retries. This means calling batch twice with same sessionId will replace items, not append: `batch/route.ts:62-68`

- **IST Timezone Hardcoded** - Batch route converts timestamps to Asia/Kolkata timezone. If deploying in other regions, consider making timezone configurable: `batch/route.ts:10-31`

- **Image Upload Blocking** - Submit route uploads image synchronously before creating movements. Large images can timeout. Consider async processing or client-side compression: `submit/route.ts:35-47`

- **No Transaction Wrapper** - Submit route does image upload → stock movement creation separately. Image upload failure before movement creation can orphan images. Consider cleanup or transactions: `submit/route.ts:35-57`

- **Clear Uses DELETE** - `clear/route.ts` only deletes unprocessed items (`is_processed: false`). Processed items remain for audit trail: `clear/route.ts:27`

- **Movements GET Filters by userId** - Movements endpoint always filters by authenticated userId. Users can only see their own movements (not all org movements): `movements/route.ts:23-29`

- **Start Endpoint Returns Immediately** - `start/route.ts` just clears incomplete sessions, doesn't create session record. Session exists implicitly when items are inserted: `start/route.ts:27`
</critical_notes>

<paved_path>
## PAVED PATH

**Migrating to Batch-Only Workflow**
Current app uses batch/submit pattern. To fully migrate:
1. Remove `scan-session/scan/route.ts` (legacy endpoint)
2. Update any remaining server-side validation calls
3. Rely on client-side validation + batch insert
4. Keep scan endpoint only for backward compatibility if needed

**Adding Async Image Processing**
To prevent timeout on large images:
1. Add message queue (e.g., Supabase Edge Functions, AWS SQS)
2. Submit route immediately returns success with placeholder image
3. Background worker uploads image and updates stock_movement record
4. Frontend polls for image URL or uses webhook

**Implementing Organization-Wide Movements**
Currently movements filtered by userId. To add org-wide view:
1. Add organization_id to stock_movements table
2. Fetch org_id from Clerk metadata
3. Add query param `scope=org` to movements route
4. Filter by org_id instead of user_id when scope=org
5. Add role-based access control (only admins see org-wide)

**Adding Movement Cancellation**
To cancel completed movements:
1. Add PUT `/api/stock/movements/[id]/cancel` route
2. Update movement status to CANCELLED
3. Reverse order fulfillment (decrement fulfilled_quantity)
4. Add reason field for audit trail
5. Prevent cancellation after X hours (business rule)

**Optimizing Batch Insert**
For large sessions (100+ scans):
1. Use PostgreSQL COPY instead of INSERT for bulk operations
2. Add batch size limit (e.g., max 500 items per request)
3. Implement pagination for client to batch in chunks
4. Add progress indicator for multi-batch submissions
</paved_path>