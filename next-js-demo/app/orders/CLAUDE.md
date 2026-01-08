<system_context>
Order management pages for viewing, filtering, and creating customer orders. List view shows orders with fulfillment progress; creation form uses dynamic row-based item entry with auto-generated order numbers.
</system_context>

<file_map>
## FILE MAP
- `page.tsx` - Order list view with filtering (status, customer search) and fulfillment tracking
- `new/page.tsx` - Order creation form with dynamic line items and auto-generated order numbers
</file_map>

<patterns>
## PATTERNS

**Dual Filter Pattern**
Orders list uses two independent filters:
- Server-side filter: Status (ALL, PENDING, COMPLETED, CANCELLED) triggers API refetch
- Client-side filter: Customer name search filters already-loaded orders
Example: `page.tsx:28-29`, `page.tsx:85-92`

**Auto-Increment ID Pattern**
New order form fetches next order number on mount from `/api/orders/next-id`:
- Displays to user before form submission
- Server generates actual order number (don't trust client)
Example: `new/page.tsx:24-39`

**Dynamic Row Management Pattern**
Order items managed as array with add/remove/update operations:
- Initial state: single empty row
- handleAddRow: appends new row to array
- handleRemoveRow: filters out by index (min 1 row)
- handleItemChange: updates specific field at index
Example: `new/page.tsx:41-64`

**Status-Based Color Coding**
Both order status and item status use consistent color system:
- PENDING/PARTIALLY_FULFILLED: yellow-100/yellow-800
- COMPLETED/FULFILLED: green-100/green-800
- CANCELLED: red-100/red-800
Example: `page.tsx:61-72`, `page.tsx:227-236`

**Direct Stock-Out Link Pattern**
Order cards have "Process Stock Out" button linking to `/stock/out?order={order_number}`:
- Passes order number as URL param
- StockOutClient can auto-select this order
Example: `page.tsx:245-250`

**Field Naming Mismatch Pattern**
New order form uses capitalized field names (Design, Qty, Lot) matching QR code format:
- Frontend submission: `{ Design, Qty, Lot }`
- Backend transforms to: `{ design, quantity, lot_number }`
- Ensures consistency with QR validation logic
Example: `new/page.tsx:7-11`
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Filter Triggers** - Status filter change triggers useEffect → API refetch. Customer search is client-side only (no API call): `page.tsx:31-33`, `page.tsx:85-92`

- **Order Number Display** - Next order number shown to user is PREVIEW only. Actual order number generated server-side on submission. Don't rely on client-side value: `new/page.tsx:34`

- **Minimum Row Constraint** - Remove button disabled when orderItems.length === 1. Always require at least one order item: `new/page.tsx:45-50`, `new/page.tsx:259`

- **Fulfillment Progress Tracking** - Each OrderItem has both `quantity` and `fulfilled_quantity` fields. Item status derived from comparison (PENDING, PARTIALLY_FULFILLED, FULFILLED): `page.tsx:221-225`

- **Auto-Redirect After Submit** - Both create success and stock-out submit redirect after 1.5-2s delay. Uses setTimeout before router.push: `new/page.tsx:123-125`

- **Validation Ordering** - Form validation runs item-by-item, fails on first error. Reports specific item number in error message: `new/page.tsx:66-89`

- **Field Name Capitalization** - OrderItem interface in new/page.tsx uses capitalized names (Design, Qty, Lot) to match QR code schema. List view uses lowercase (design, quantity, lot_number) matching database schema: `new/page.tsx:7-11` vs `page.tsx:6-13`

- **Refresh Button** - Order list has per-order "Refresh" button that refetches ALL orders (not just the specific order). Consider adding optimistic update instead: `page.tsx:251-256`
</critical_notes>

<paved_path>
## PAVED PATH

**Adding New Filter to Order List**
1. Add state variable for filter value: `const [filterX, setFilterX] = useState("")`
2. If server-side: add to useEffect deps `[filterStatus, filterX]`, append to URLSearchParams
3. If client-side: add to filteredOrders logic using .filter()
4. Add UI control (select/input) in filters section: `page.tsx:119-151`

**Adding Fields to Order Creation**
1. Update OrderItem interface with new field: `new/page.tsx:7-11`
2. Add field to initial state: `new/page.tsx:19`
3. Add input column to grid: `new/page.tsx:202-267`
4. Add validation in validateForm(): `new/page.tsx:66-89`
5. Backend will receive field in orderDetails array

**Implementing Bulk Actions**
1. Add checkbox column to order cards: `page.tsx:171-260`
2. Add state: `const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])`
3. Add bulk action bar (fixed bottom) when selection > 0
4. Common actions: Bulk cancel, bulk status change, export CSV

**Deep-Linking to Specific Order**
Order list doesn't implement order detail page. To add:
1. Create `orders/[id]/page.tsx`
2. Make order card clickable: `<Link href={`/orders/${order.id}`}>`
3. Or add "View Details" button alongside "Process Stock Out"
4. Fetch single order: `GET /api/orders/${id}`

**Implementing Order Edit**
Currently no edit functionality. To add:
1. Create `orders/[id]/edit/page.tsx`
2. Copy new/page.tsx structure
3. Fetch existing order on mount
4. Pre-populate form fields
5. Change submit to PUT /api/orders/${id}
6. Handle partial fulfillment (warn if fulfilled_quantity > 0)
</paved_path>