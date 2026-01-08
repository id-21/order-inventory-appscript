<system_context>
Next.js 15 App Router application for order fulfillment and inventory tracking. Uses Clerk authentication, Supabase backend, and mobile-optimized QR scanning workflow for warehouse operations. Root layout wraps entire app with ClerkProvider and persistent AuthHeader.
</system_context>

<file_map>
## FILE MAP
- `layout.tsx` - Root layout with ClerkProvider wrapper, AuthHeader navigation, Tailwind globals
- `page.tsx` - Home page with navigation cards (Orders, Stock Out, Admin Dashboard)
- `globals.css` - Tailwind CSS imports only
- `api/` - API routes organized by domain (orders, stock, auth, admin)
  - See: [api/CLAUDE.md](api/CLAUDE.md) for comprehensive API patterns and endpoints
- `orders/` - Order management pages (list, create)
  - See: [orders/CLAUDE.md](orders/CLAUDE.md) for order workflow patterns
- `stock/` - Stock movement pages (scan-based fulfillment, history)
  - See: [stock/CLAUDE.md](stock/CLAUDE.md) for multi-step scanning workflow
- `components/` - React components (auth UI, stock scanning, UI primitives)
  - See: [components/CLAUDE.md](components/CLAUDE.md) for reusable component patterns
</file_map>

<patterns>
## PATTERNS

**App Router Architecture**
Next.js 15 App Router with server/client component split:
- Server components by default (page.tsx, layout.tsx)
- Client components marked with `"use client"` directive
- API routes in app/api/ using Route Handlers
Example: `page.tsx` (server), `stock/out/StockOutClient.tsx` (client)

**Clerk Authentication Flow**
Root layout wraps with ClerkProvider, all protected routes verify auth:
- Layout: `<ClerkProvider>` wraps entire app
- Server pages: `const { userId } = await auth()` from @clerk/nextjs/server
- API routes: Same auth() pattern, return 401 if no userId
- No route protection needed - handled by middleware.ts in root
Example: `layout.tsx:17`, `page.tsx:6`, `api/orders/route.ts:11-15`

**Role-Based Navigation Pattern**
Home page conditionally shows admin dashboard link:
- Fetches user profile from Supabase
- Checks `role === "admin" && is_active === true`
- Admin link only visible to authorized users
Example: `page.tsx:10-13`, `page.tsx:41-49`

**Domain Organization Pattern**
App organized by business domain, each with pages + API routes:
- `/orders` pages + `/api/orders` routes
- `/stock` pages + `/api/stock` routes
- Each domain has dedicated CLAUDE.md for patterns
Example: Directory structure matches REST resource paths

**Mobile-First UI Pattern**
Entire app optimized for warehouse/mobile scanning:
- Large touch targets (py-5, py-6 padding)
- Text sizes: text-xl, text-2xl, text-5xl
- Card-based navigation with color-coded sections
Example: `page.tsx:25-39`, `stock/out/StockOutClient.tsx`

**Child CLAUDE.md Structure**
Each major directory has detailed CLAUDE.md:
- Parent (this file): High-level overview, points to children
- Children: Detailed patterns, gotchas, paved paths
- Avoid duplication, use cross-references
</patterns>

<critical_notes>
## CRITICAL NOTES

- **ClerkProvider Required** - Root layout wraps entire app. All auth depends on this provider. Don't remove or move outside html tag: `layout.tsx:17`

- **Metadata Mismatch** - Layout metadata says "Virtual Try-On" but app is order/inventory system. Update metadata for correct branding: `layout.tsx:7-9`

- **No Middleware Protection** - App assumes middleware.ts exists in root to protect routes. Verify /api/* and protected pages are guarded by middleware: all routes

- **Admin Check is Manual** - Admin role stored in Supabase profiles table (not Clerk). Must query getUserById() to check admin status. No automatic role enforcement: `page.tsx:11-12`

- **AuthHeader Always Visible** - Header rendered on all pages including home. Consider conditional rendering for landing pages or public marketing pages: `layout.tsx:20`

- **No Loading States on Home** - Home page fetches user data but shows no loading indicator. Users see flash of "Please sign in" before auth resolves: `page.tsx:5-58`

- **Deep Link Support** - /admin/dashboard link shown but admin pages not implemented in this directory. Verify admin dashboard exists elsewhere: `page.tsx:42-48`

- **Single Global CSS** - Only Tailwind imports in globals.css. All styling via utility classes. No custom CSS variables or themes defined: `globals.css:1`

- **Supabase Admin Check** - Home page uses supabase-admin.ts getUserById() which bypasses RLS. Ensure this only runs server-side: `page.tsx:11`
</critical_notes>

<paved_path>
## PAVED PATH

**Adding New Feature Domain**
1. Create parallel directories: `app/{domain}/` and `app/api/{domain}/`
2. Add pages to app/{domain}/ with appropriate server/client split
3. Add API routes to app/api/{domain}/ with auth guards
4. Create business logic in `lib/features/supabase-{domain}.ts`
5. Generate CLAUDE.md for both directories
6. Add navigation card to home page: `page.tsx:24-39`
7. Update this file's file_map section

**Implementing Custom Layout for Domain**
To override root layout for specific section:
1. Create `app/{domain}/layout.tsx`
2. Import root layout if you want to extend it
3. Or create fully custom layout (still needs ClerkProvider from root)
4. Use for domain-specific navigation, sidebar, etc.
5. Example: Admin section with different header/sidebar

**Adding Public Pages**
To create pages without auth requirement:
1. Create page outside protected sections
2. Don't call auth() in server component
3. Update middleware.ts to exclude route from protection
4. Add conditional nav (show login button vs user profile)
5. Example: Marketing landing page, pricing page

**Fixing Metadata**
To correct app branding:
1. Update layout.tsx metadata object
2. Change title from "Virtual Try-On" to "Order & Inventory Management"
3. Update description to match actual functionality
4. Consider adding OpenGraph metadata for sharing
5. Add favicon and app icons in app/icon.tsx

**Implementing Loading States**
To prevent flash of unauthenticated content:
1. Use Suspense boundaries around async components
2. Create loading.tsx in route directories
3. Or use skeleton components in client components
4. Example: `<Suspense fallback={<Spinner />}>{children}</Suspense>`
5. Consider Clerk's <SignedIn> / <SignedOut> components

**Adding Error Boundaries**
To handle runtime errors gracefully:
1. Create error.tsx in route directories
2. Implement error boundary with retry button
3. Log errors to monitoring service (Sentry, etc.)
4. Show user-friendly messages
5. Provide fallback UI for broken components

**Internationalization (i18n)**
If supporting multiple languages:
1. Use next-intl or next-i18next
2. Create [locale] folder: `app/[locale]/page.tsx`
3. Update root layout to accept locale param
4. Store translations in public/locales/
5. Add language switcher to AuthHeader
</paved_path>