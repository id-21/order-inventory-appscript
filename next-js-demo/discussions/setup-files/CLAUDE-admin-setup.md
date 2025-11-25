# Admin Section - Supabase Client Usage Guide

## ⚠️ CRITICAL: Always Use `supabaseAdmin`

When working with **any file in the `app/admin` directory**, you MUST use the `supabaseAdmin` client (service role) instead of the regular `supabase` client.

## Quick Reference

```typescript
// ✅ CORRECT - Use this
import { supabaseAdmin } from "@/lib/supabase-admin";

const { data } = await supabaseAdmin
  .from("users")
  .select("*");
```

```typescript
// ❌ WRONG - Never use this in admin files
import { supabase } from "@/lib/supabase";

const { data } = await supabase  // This will cause infinite recursion!
  .from("users")
  .select("*");
```

## Why?

- **Service Role Key**: `supabaseAdmin` uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses Row Level Security (RLS)
- **Clerk Integration**: Since Clerk doesn't set Supabase's `auth.uid()`, RLS policies would fail or cause infinite recursion
- **Admin Operations**: Admin functions need unrestricted database access to view/manage all users and data

## Available Admin Functions

All admin database functions in `lib/supabase-admin.ts` already use `supabaseAdmin`:

- `getAllUsers()`
- `getAllProducts()`
- `getAllGeneratedAssets()`
- `getDashboardStats()`
- `updateUserCredits()`
- `getUserById()` (used for auth checks)
- `isUserAdmin()` (used in middleware and layouts)

## When Adding New Admin Features

1. Import from `@/lib/supabase-admin`
2. Use `supabaseAdmin` client for all database queries
3. Never import or use the regular `supabase` client
4. Test thoroughly to ensure no RLS errors

---

**Remember**: Service role bypasses ALL security - only use in protected admin routes!
