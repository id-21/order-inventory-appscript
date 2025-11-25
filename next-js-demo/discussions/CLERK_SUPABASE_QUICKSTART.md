# Integrate Clerk Authentication with Supabase Database

**Purpose:** Enforce the **current** and **correct** instructions for integrating [Clerk](https://clerk.com/) authentication with [Supabase](https://supabase.com/) database for role-based authorization in a Next.js (App Router) application.

**Scope:** All AI-generated advice or code related to Clerk + Supabase integration must follow these guardrails.

**Use Case:** Clerk handles user authentication (login/signup), Supabase stores user data (including roles) for authorization checks.

---

## **1. Official Integration Overview**

This integration uses:
- **Clerk** for authentication (who the user is)
- **Supabase** as a database (user profiles, roles, app data)
- **Your middleware** for authorization (what the user can access)

### **Architecture**
```
User Signs Up/In (Clerk)
    ↓
Middleware Auto-Syncs to Supabase
    ↓
App Queries Supabase for Role
    ↓
Grants/Denies Access Based on Role
```

### **Prerequisites**
- Next.js 13+ with App Router
- Clerk account and API keys
- Supabase project and API keys
- `@clerk/nextjs` installed
- `@supabase/supabase-js` installed

---

## **2. Correct Setup Steps**

### Step 1: Install Dependencies

```bash
npm install @clerk/nextjs @supabase/supabase-js
```

### Step 2: Set Up Environment Variables

Create `.env.local` with ALL of these keys:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # CRITICAL - Get from Supabase Dashboard → Settings → API
```

**IMPORTANT:** The `SUPABASE_SERVICE_ROLE_KEY` is **required** for bypassing Row Level Security. Get it from Supabase Dashboard → Settings → API.

### Step 3: Create Supabase Database Schema

Your `users` table MUST use **TEXT** for IDs (not UUID) to support Clerk user IDs:

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,  -- ← TEXT, not UUID (Clerk IDs are strings)
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'user' or 'admin'
    credits_remaining INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CHECK (role IN ('user', 'admin'))
);
```

**Key Requirements:**
- ✅ `id` is TEXT (not UUID)
- ✅ `role` column for authorization
- ✅ No password_hash (Clerk handles auth)

### Step 4: Create Supabase Admin Client

Create `lib/supabase-admin.ts`:

```typescript
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client (Service Role)
 * Bypasses Row Level Security for administrative operations
 * IMPORTANT: Only use on server-side (never expose service role key to client)
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Regular client (for non-admin operations - optional)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * User type matching database schema
 */
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "admin";
  credits_remaining: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new user in Supabase
 * Uses service role to bypass RLS
 */
export async function createUser(
  clerkUserId: string,
  email: string,
  fullName?: string
) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      id: clerkUserId,
      email,
      full_name: fullName || null,
      role: "user",
      credits_remaining: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

/**
 * Get user by Clerk ID
 * Uses service role to bypass RLS (CRITICAL)
 * Cached to prevent duplicate queries
 */
export const getUserById = cache(async (clerkUserId: string) => {
  const { data, error } = await supabaseAdmin  // ← Must use supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", clerkUserId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return data as User;
});

/**
 * Check if user is an admin
 * Cached to prevent duplicate queries
 */
export const isUserAdmin = cache(async (clerkUserId: string): Promise<boolean> => {
  const user = await getUserById(clerkUserId);
  return user?.role === "admin" && user?.is_active === true;
});
```

### Step 5: Set Up Clerk Middleware with Auto-Sync

Create `middleware.ts`:

```typescript
import {
  clerkMiddleware,
  createRouteMatcher,
  clerkClient,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isUserAdmin, getUserById, createUser } from "./lib/supabase-admin";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Auto-create user in Supabase if authenticated and doesn't exist
  if (userId) {
    try {
      const existingUser = await getUserById(userId);

      if (!existingUser) {
        // User doesn't exist in Supabase, create them
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);

        const email =
          clerkUser.emailAddresses.find(
            (e) => e.id === clerkUser.primaryEmailAddressId
          )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

        const fullName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();

        if (email) {
          await createUser(userId, email, fullName || undefined);
          console.log(`Created Supabase user for: ${email}`);
        }
      }
    } catch (error) {
      console.error("Error syncing user to Supabase:", error);
      // Don't block the request if user creation fails
    }
  }

  // Check if this is an admin route
  if (isAdminRoute(req)) {
    // Require authentication
    if (!userId) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(userId);
    if (!isAdmin) {
      // Redirect non-admins to home page
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### Step 6: Use in Server Components

Example `app/page.tsx`:

```typescript
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/supabase-admin";

export default async function Home() {
  const { userId } = await auth();
  let isAdmin = false;

  if (userId) {
    const user = await getUserById(userId);
    isAdmin = user?.role === "admin" && user?.is_active === true;
  }

  return (
    <>
      {isAdmin && <h1>Admin</h1>}
      {/* Your page content */}
    </>
  );
}
```

---

## **3. CRITICAL INSTRUCTIONS**

### **3.1 – ALWAYS DO THE FOLLOWING**

1. **Use `supabaseAdmin` for all user queries** (never regular `supabase` client)
2. **Use TEXT for ID columns** in database schema (not UUID)
3. **Auto-sync users in middleware** on first authenticated request
4. **Check roles server-side** (in server components or API routes)
5. **Use React `cache()`** for getUserById and isUserAdmin
6. **Store service role key in `.env.local`** (never commit to git)
7. **Use service role only on server** (never expose to client)

### **3.2 – NEVER DO THE FOLLOWING**

1. **Do not use regular `supabase` client for getUserById** - causes infinite recursion
2. **Do not rely on Supabase `auth.uid()`** - returns NULL with Clerk auth
3. **Do not use UUID column type for user IDs** - Clerk IDs are strings
4. **Do not query user data in client components** - use server components
5. **Do not expose service role key to client** - server-side only
6. **Do not rely on RLS policies with Clerk** - they won't work (auth.uid() is NULL)

---

## **4. ANTI-PATTERNS TO AVOID**

### ❌ WRONG: Using Regular Supabase Client

```typescript
// ❌ DO NOT DO THIS
export const getUserById = cache(async (clerkUserId: string) => {
  const { data, error } = await supabase  // ← Regular client
    .from("users")
    .select("*")
    .eq("id", clerkUserId)
    .single();
});
```

**Why it fails:**
- Regular client respects RLS policies
- RLS policies check `auth.uid()` (Supabase Auth)
- Clerk auth doesn't set `auth.uid()` → returns NULL
- Policy fails, query returns nothing
- Admin policies cause infinite recursion

**Correct approach:**
```typescript
// ✅ CORRECT
export const getUserById = cache(async (clerkUserId: string) => {
  const { data, error } = await supabaseAdmin  // ← Service role client
    .from("users")
    .select("*")
    .eq("id", clerkUserId)
    .single();
});
```

---

### ❌ WRONG: UUID Column Type

```sql
-- ❌ DO NOT DO THIS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4()  -- ← UUID type
);
```

**Why it fails:**
- Clerk user IDs are strings: `"user_35ng9OgRkcQG1SYRRGtpmdhFQmb"`
- PostgreSQL UUID expects: `"123e4567-e89b-12d3-a456-426614174000"`
- Type mismatch error: `invalid input syntax for type uuid`

**Correct approach:**
```sql
-- ✅ CORRECT
CREATE TABLE users (
    id TEXT PRIMARY KEY  -- ← TEXT type accepts Clerk IDs
);
```

---

### ❌ WRONG: Relying on RLS Policies

```sql
-- ❌ DO NOT RELY ON THIS WITH CLERK
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);  -- ← auth.uid() is NULL
```

**Why it fails:**
- `auth.uid()` is Supabase Auth function
- Returns NULL when using Clerk authentication
- Policy always fails

**Correct approach:**
```typescript
// ✅ CORRECT - Use service role to bypass RLS
const { data } = await supabaseAdmin
  .from("users")
  .select("*");  // No RLS check, works correctly
```

**Note:** Keep RLS policies for future-proofing, but bypass them with service role.

---

### ❌ WRONG: Client-Side Role Checks

```typescript
// ❌ DO NOT DO THIS
"use client";

export default function Page() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/user/role").then(res => {
      // Client-side check - slow, security risk
    });
  }, []);
}
```

**Why it's wrong:**
- Extra API call (slower)
- Loading flicker
- Not SEO-friendly
- Client can bypass checks (security risk)

**Correct approach:**
```typescript
// ✅ CORRECT - Server component
export default async function Page() {
  const { userId } = await auth();
  const user = await getUserById(userId);
  const isAdmin = user?.role === "admin";

  return <>{isAdmin && <AdminContent />}</>;  // No loading, SEO-friendly
}
```

---

### ❌ WRONG: Missing Auto-Sync

```typescript
// ❌ DO NOT DO THIS - No user sync
export default clerkMiddleware(async (auth, req) => {
  // Only checking admin routes, no user creation
  if (isAdminRoute(req)) {
    const isAdmin = await isUserAdmin(userId);  // User doesn't exist!
  }
});
```

**Why it fails:**
- User exists in Clerk but not Supabase
- `getUserById()` returns null
- Admin checks fail
- Duplicate key errors if you try to create later

**Correct approach:**
```typescript
// ✅ CORRECT - Auto-sync first
export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (userId) {
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      await createUser(...);  // Create if doesn't exist
    }
  }

  // Then check admin routes
  if (isAdminRoute(req)) { /* ... */ }
});
```

---

## **5. VERIFICATION CHECKLIST**

Before deploying, verify:

### Environment Variables
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set
- [ ] `CLERK_SECRET_KEY` is set
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (CRITICAL)
- [ ] `.env.local` is in `.gitignore`

### Database Schema
- [ ] `users` table exists
- [ ] `id` column is TEXT (not UUID)
- [ ] `role` column exists with CHECK constraint
- [ ] `email` column is UNIQUE
- [ ] RLS policies have `::TEXT` casts (if using `auth.uid()`)

### Code Implementation
- [ ] `supabaseAdmin` client is created with service role key
- [ ] `getUserById()` uses `supabaseAdmin` (not `supabase`)
- [ ] `createUser()` uses `supabaseAdmin`
- [ ] Middleware auto-syncs users on first request
- [ ] Middleware protects admin routes
- [ ] `getUserById()` and `isUserAdmin()` use `cache()`

### Testing
- [ ] New user signup creates Supabase record
- [ ] Admin user can access `/admin/*` routes
- [ ] Regular user is redirected from `/admin/*` routes
- [ ] No infinite recursion errors in console
- [ ] No duplicate key errors in console
- [ ] No UUID type mismatch errors

---

## **6. COMMON ERRORS AND SOLUTIONS**

### Error: "infinite recursion detected in policy"

**Cause:** Using regular `supabase` client instead of `supabaseAdmin`

**Solution:**
```typescript
// Change this:
const { data } = await supabase.from("users")...

// To this:
const { data } = await supabaseAdmin.from("users")...
```

---

### Error: "invalid input syntax for type uuid"

**Cause:** Database uses UUID column type, Clerk IDs are strings

**Solution:** Change schema from UUID to TEXT:
```sql
ALTER TABLE users ALTER COLUMN id TYPE TEXT;
```

---

### Error: "duplicate key value violates unique constraint"

**Cause:** `getUserById()` returns null (due to RLS), middleware tries to recreate user

**Solution:** Use `supabaseAdmin` in `getUserById()`

---

### Error: User role not detected / No "Admin" badge

**Cause:** One of:
1. `getUserById()` using wrong client
2. User doesn't exist in Supabase
3. Role not set to 'admin' in database

**Solution:**
1. Check `getUserById()` uses `supabaseAdmin`
2. Check user exists: `SELECT * FROM users WHERE id = 'clerk_user_id'`
3. Update role: `UPDATE users SET role = 'admin' WHERE email = 'user@example.com'`

---

## **7. ARCHITECTURE RATIONALE**

### Why Service Role Instead of RLS?

**Your architecture:**
```
Clerk (Authentication) → Middleware (Authorization) → Supabase (Data)
```

**Security layers:**
1. ✅ **Clerk** - Who can access the app?
2. ✅ **Middleware** - What routes can they access?
3. ❌ **Supabase RLS** - Doesn't work (auth.uid() is NULL)

Since Clerk handles auth and your middleware handles authorization, Supabase RLS is **redundant** and **incompatible**.

**Service role is secure because:**
- Key is server-side only (never exposed to client)
- Middleware controls who can query
- Your code decides what data to return
- No security is lost by bypassing RLS

---

### Why TEXT Instead of UUID?

**Clerk user IDs:** `user_2a1b3c4d5e6f7g8h9i0j`

**PostgreSQL UUID:** `123e4567-e89b-12d3-a456-426614174000`

These are incompatible. TEXT accepts any string, including Clerk IDs.

**Performance impact:** Negligible for apps under 1M users

---

### Why Auto-Sync in Middleware?

**Alternatives:**
1. **Webhooks** - More robust but requires Clerk Dashboard config
2. **Manual sync** - User has to visit specific page
3. **Client-side** - Slow, unreliable

**Middleware auto-sync:**
- ✅ Works on first authenticated request
- ✅ No external config needed
- ✅ Catches all users automatically
- ✅ Non-blocking (errors don't break app)

---

## **8. SECURITY CONSIDERATIONS**

### Is Service Role Safe?

**YES**, because:
- Service role key is **server-side only** (in `.env.local`)
- Users **cannot access** the service role key
- Users **cannot call** `getUserById()` directly (server functions only)
- **Your middleware** controls what queries run
- **Your code** decides what data is returned

**Example - User cannot bypass:**
```typescript
// This runs on SERVER, not client
export default async function AdminPage() {
  const { userId } = await auth();  // Clerk verifies user
  const user = await getUserById(userId);  // YOUR code queries

  if (user?.role !== 'admin') {
    redirect('/');  // YOU control access
  }

  return <AdminContent />;
}
```

User **cannot:**
- Access service role key
- Call `getUserById()` from browser
- Modify server code
- Bypass your authorization checks

---

## **9. NEXT STEPS**

After setup:

1. **Create your first admin:**
   ```sql
   UPDATE users
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```

2. **Test admin access:**
   - Sign in with admin account
   - Visit `/admin/dashboard`
   - Should see admin content (not redirected)

3. **Test regular user:**
   - Sign in with non-admin account
   - Visit `/admin/dashboard`
   - Should be redirected to home page

4. **Add more role checks:**
   ```typescript
   // In any server component
   const { userId } = await auth();
   const user = await getUserById(userId);

   if (user?.credits_remaining < 10) {
     return <UpgradePrompt />;
   }
   ```

---

## **10. COMPLETE WORKING EXAMPLE**

See your project files for working implementation:
- `lib/supabase-admin.ts` - Database helpers
- `middleware.ts` - Auto-sync and route protection
- `app/page.tsx` - Server component with role check
- `app/(admin)/layout.tsx` - Admin-only layout
- `discussions/setup-files/schema.sql` - Database schema

**All errors resolved:**
- ✅ No infinite recursion
- ✅ No UUID mismatches
- ✅ No duplicate keys
- ✅ Admin detection works
- ✅ Auto-sync working

---

**This is the ONLY correct approach for Clerk + Supabase integration with role-based authorization.**
