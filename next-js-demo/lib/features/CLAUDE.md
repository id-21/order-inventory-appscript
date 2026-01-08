<system_context>
Business logic layer for order management, stock movements, and QR validation. Provides database operations via Supabase and client-side validation utilities for instant scan feedback without network latency.
</system_context>

<file_map>
## FILE MAP
- `client-scan-validation.ts` - Client-side QR validation (no DB calls), instant feedback logic
- `supabase-orders.ts` - Order CRUD operations, auto-increment order numbers, fulfillment tracking
- `supabase-stock.ts` - Stock movement CRUD, scan session management, order fulfillment updates
- `supabase-storage.ts` - Image upload/delete to Supabase Storage, base64 handling

See: [../supabase-admin.ts](../supabase-admin.ts) for Supabase client initialization
</file_map>

<patterns>
## PATTERNS

**Client-Side Validation Pattern**
`client-scan-validation.ts` provides instant validation without API calls:
- Four-step validation: format → order match → duplicate check → quantity limit
- All validations use String() coercion for type safety
- Returns ValidationResult with detailed error messages
Example: `client-scan-validation.ts:172-194`, search:`validateScan`

**String Coercion Pattern**
All comparisons convert to strings to handle QR/database type mismatches:
- QR codes may have numeric fields (Design, Lot as numbers)
- Database stores as strings
- Solution: `String(qrData.Design) === String(item.design)`
Example: `client-scan-validation.ts:71-78`, `supabase-stock.ts:165-167`

**Aggregation Key Pattern**
Items grouped by Design + Lot using triple-pipe separator:
- Key format: `${design}|||${lot_number}`
- Avoids collisions (e.g., "AB" + "C" vs "A" + "BC")
- Used in Map for efficient grouping
Example: `client-scan-validation.ts:211`, `supabase-stock.ts:105`

**Auto-Increment Order Number Pattern**
Order numbers are sequential integers (not UUIDs):
1. Query max order_number with ORDER BY DESC LIMIT 1
2. Return max + 1, or 1 if no orders exist
3. Handle PGRST116 error (no rows) as first order
Example: `supabase-orders.ts:25-40`

**Transactional Rollback Pattern**
Order creation rolls back on item insert failure:
1. Insert order record
2. Try inserting order_items
3. If items fail, delete order before throwing error
Example: `supabase-orders.ts:92-97`

**Session-Based Scanning Pattern**
Scanned items stored in DB during session, processed on submit:
1. Session ID (uuid) generated client-side
2. Each scan saves to `scanned_items` with `is_processed: false`
3. On submit, batch create stock movements
4. Mark scanned_items as `is_processed: true`
Example: `supabase-stock.ts:56-84`, `supabase-stock.ts:329-334`

**Fulfillment Cascade Pattern**
Stock movement submission triggers order status updates:
1. Create stock movements for session
2. Aggregate movements by order_id + design + lot
3. Update order_item fulfilled_quantity and status
4. If all items FULFILLED, mark order COMPLETED
Example: `supabase-stock.ts:336-389`, search:`updateOrderAfterStock`

**Base64 Image Handling Pattern**
Images uploaded as base64, converted server-side:
1. Strip data URL prefix if present
2. Convert base64 → Buffer
3. Upload buffer to Supabase Storage
4. Return public URL
Example: `supabase-storage.ts:11-53`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Type Coercion Required** - ALWAYS use String() when comparing QR data to database values. QR codes may parse numeric fields as numbers, DB stores as strings: `client-scan-validation.ts:71-73`

- **PGRST116 Error Handling** - Supabase returns error code "PGRST116" for empty result sets (not an actual error). Check for this code and return null/default: `supabase-orders.ts:33-37`, `supabase-stock.ts:195`

- **Session Cleanup** - Starting new scan session clears user's incomplete sessions to prevent orphaned records. Only deletes `is_processed: false`: `supabase-stock.ts:45-51`

- **Order Number Race Condition** - getNextOrderNumber() has potential race condition if two requests execute simultaneously. Consider using database sequence/serial or transaction locking for production: `supabase-orders.ts:25-40`

- **Client vs Server Validation** - `client-scan-validation.ts` is duplicated logic with `supabase-stock.ts` validation functions. Client version for instant UI feedback, server version for security. Keep in sync: `client-scan-validation.ts:62-88` vs `supabase-stock.ts:142-178`

- **Soft Delete Pattern** - deleteOrder() doesn't actually delete, it sets status to CANCELLED. Preserves audit trail: `supabase-orders.ts:241-255`

- **Image Compression Placeholder** - compressBase64Image() is not implemented, just returns original. Client should compress before upload or implement server-side compression with sharp: `supabase-storage.ts:121-131`

- **Fulfilled Quantity Logic** - fulfilled_quantity tracks total across ALL stock movements (not just current session). Max scan allowed = quantity - fulfilled_quantity: `client-scan-validation.ts:150`

- **Movement Type Enum** - Stock movements support OUT, IN, ADJUSTMENT, CUSTOM. Currently only OUT and CUSTOM used in UI: `supabase-stock.ts:282`
</critical_notes>

<paved_path>
## PAVED PATH

**Adding New Validation Rule**
1. Add function to `client-scan-validation.ts` (e.g., `validateExpiration()`)
2. Add same function to `supabase-stock.ts` for server-side validation
3. Update `validateScan()` in both files to call new validator
4. Update ValidationResult interface with new error flags
5. Test with DebugScanModal to verify error messages

**Implementing Image Compression**
1. Install sharp: `npm install sharp`
2. Update `compressBase64Image()` in `supabase-storage.ts`:
   - Convert base64 → buffer
   - Use sharp to resize/compress
   - Convert back to base64
3. Call from `uploadStockImage()` before upload
4. Alternative: Compress client-side before sending to API

**Adding Pagination to Orders List**
Already implemented via filters parameter:
- `limit`: number of records
- `offset`: starting position
Example: `supabase-orders.ts:137-143`

**Implementing Stock IN Workflow**
1. Create new page `/stock/in/page.tsx` (similar to `/stock/out`)
2. Change movementType to "IN" when calling createStockMovement()
3. Update client validation to allow scanning without order
4. Consider adding source location field (where stock came from)
5. Stock IN doesn't affect order fulfillment status

**Adding Custom Validation Hooks**
1. Create new validation function in `client-scan-validation.ts`
2. Export ValidationResult with custom error flags
3. Update UI to handle new error types
4. Example: Location validation, batch validation, supplier validation

**Optimizing Order Number Generation**
Replace current implementation with database sequence:
1. Create Postgres sequence: `CREATE SEQUENCE order_number_seq START 1`
2. Use in insert: `order_number: nextval('order_number_seq')`
3. Or use Supabase function to generate atomically
4. Eliminates race conditions
</paved_path>