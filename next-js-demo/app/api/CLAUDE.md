<system_context>
Next.js App Router API routes for the order-inventory system. Organized by domain (orders, stock, auth, admin) with Clerk authentication and Supabase backend. All routes follow REST conventions with standardized error handling.
</system_context>

<file_map>
## FILE MAP
- `orders/` - Order management APIs (CRUD, filtering, next-id preview)
  - See: [orders/CLAUDE.md](orders/CLAUDE.md) for details
- `stock/` - Stock movement and scan session APIs (batch scanning, movements history, image upload)
  - See: [stock/CLAUDE.md](stock/CLAUDE.md) for details
- `auth/` - Authentication helper endpoints
  - `is-admin/route.ts` - GET check if current user has admin role
- `admin/` - Admin-only endpoints (require isUserAdmin check)
  - `users/route.ts` - GET all users (admin only)
  - `stats/route.ts` - GET dashboard statistics (admin only)

See: [../../lib/features/CLAUDE.md](../../lib/features/CLAUDE.md) for business logic layer patterns
See: [../../lib/supabase-admin.ts](../../lib/supabase-admin.ts) for admin utilities
</file_map>

<patterns>
## PATTERNS

**Universal Auth Guard Pattern**
All routes verify Clerk authentication first:
- `const { userId } = await auth()`
- Return 401 if userId missing
- Pass userId to business logic for audit trail
Example: `orders/route.ts:11-15`, `stock/movements/route.ts:11-15`

**Admin Authorization Pattern**
Admin routes add second check after auth:
- Call `isUserAdmin(userId)`
- Return 403 Forbidden if not admin
- Only then execute admin operations
Example: `admin/users/route.ts:14-17`, `admin/stats/route.ts:14-17`

**Non-Blocking Admin Check Pattern**
auth/is-admin returns false instead of 401 for unauthenticated:
- Used for conditional UI rendering (show/hide admin links)
- Returns `{ isAdmin: false }` when no userId
- Never blocks or errors
Example: `auth/is-admin/route.ts:8-10`

**Error Response Standardization**
All routes follow consistent error format:
- 401: `{ error: "Unauthorized" }` - No valid session
- 403: `{ error: "Forbidden" }` - Valid user, insufficient permissions
- 400: `{ error: "descriptive message" }` - Validation failure
- 500: `{ error: "Failed to..." }` - Server/database error
Example: `admin/users/route.ts:10`, `admin/users/route.ts:16`, `stock/scan-session/batch/route.ts:57`

**Success Response Pattern**
Successful responses include metadata:
- 200: `{ data, metadata }` for GET
- 201: `{ success: true, resource, message }` for POST
- Include counts, pagination info, formatted messages
Example: `orders/route.ts:102-109`, `stock/scan-session/submit/route.ts:59-64`

**Child CLAUDE.md Organization**
Domain directories have detailed CLAUDE.md files:
- Parent (this file) provides high-level overview
- Children document patterns, gotchas, paved paths
- Avoid duplication, point to children for details
</patterns>

<critical_notes>
## CRITICAL NOTES

- **Clerk Authentication Required** - All routes depend on Clerk middleware. Ensure `middleware.ts` protects `/api/*` routes. Unauthenticated requests to protected routes return 401: `*/route.ts:*`

- **Admin Role Implementation** - Admin check uses `isUserAdmin()` from supabase-admin.ts. Admin status stored in profiles table. No built-in Clerk role system: `admin/users/route.ts:14`

- **No Rate Limiting** - API routes have no rate limiting. Consider adding middleware or Vercel Edge Config for production: all routes

- **CORS Not Configured** - Routes don't set CORS headers. If adding external API consumers, configure CORS middleware: all routes

- **No API Versioning** - Routes at `/api/{domain}` with no version prefix. Breaking changes would break all clients. Consider `/api/v1/` for future compatibility: all routes

- **Business Logic in Feature Layer** - API routes are thin wrappers. All validation/logic in `lib/features/` (see [../../lib/features/CLAUDE.md](../../lib/features/CLAUDE.md) for patterns). Keep routes focused on HTTP concerns only: `orders/route.ts`, `stock/scan-session/submit/route.ts`

- **Timezone Handling Inconsistent** - stock/batch endpoint converts to IST, other endpoints use server/DB timezone. Consider standardizing timezone strategy across all APIs: `stock/scan-session/batch/route.ts:10-31`

- **Admin Endpoints Not Grouped** - Admin routes split across /admin/* and /auth/is-admin. Consider moving all admin routes under /admin/ for consistency
</critical_notes>

<paved_path>
## PAVED PATH

**Adding New API Endpoint**
1. Create `route.ts` in appropriate domain directory
2. Import and call `auth()` from @clerk/nextjs/server
3. Return 401 if no userId
4. If admin-only, call `isUserAdmin()` and return 403
5. Extract params/body, validate inputs
6. Call business logic from `lib/features/`
7. Return standardized response with proper status code
8. Add error handling with try/catch

**Adding New Domain**
1. Create new directory: `app/api/{domain}/`
2. Add route.ts files for each endpoint
3. Create `lib/features/supabase-{domain}.ts` for business logic (see [../../lib/features/CLAUDE.md](../../lib/features/CLAUDE.md) for patterns)
4. Generate CLAUDE.md for new domain directory
5. Update this file's file_map section

**Implementing Rate Limiting**
1. Add middleware in `app/api/middleware.ts`
2. Use library like `@upstash/ratelimit` with Redis
3. Check IP or userId for rate limits
4. Return 429 Too Many Requests when exceeded
5. Add Retry-After header with seconds to wait

**Adding API Versioning**
1. Create `app/api/v1/` directory
2. Move existing routes to v1/
3. Update all frontend API calls to include /v1/
4. Keep v1 stable, create v2/ for breaking changes
5. Add deprecation warnings to old versions

**Implementing Request Logging**
1. Add middleware to log all requests
2. Capture: timestamp, userId, route, method, duration
3. Store in separate logging table or service
4. Use for debugging, analytics, audit trail
5. Exclude sensitive data (passwords, tokens)
</paved_path>