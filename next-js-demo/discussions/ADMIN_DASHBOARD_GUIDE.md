# Admin Dashboard Guide

## Overview
Your admin dashboard is now complete! It provides a secure, role-protected interface for managing users, products, and AI generations.

## Access
- **URL**: `/admin/dashboard`
- **Requirements**:
  - Must be signed in with Clerk
  - User must have `role: 'admin'` in Supabase `users` table

## Features Implemented

### 1. Protected Routes
- Middleware automatically checks admin role before allowing access
- Non-admin users are redirected to home page
- All routes under `/admin/*` are protected

### 2. Admin Layout
- Fixed sidebar navigation with links to:
  - Dashboard (overview)
  - Users
  - Products
  - Generations
- User profile button in header
- "Back to Site" link in sidebar

### 3. Dashboard Overview (`/admin/dashboard`)
Displays key metrics:
- Total users count
- Total products count
- Total generations (with success/failure breakdown)
- Total credits used and API costs
- Quick action links to other admin pages

### 4. User Management (`/admin/users`)
Features:
- List all users with email, role, credits, status, and join date
- View user stats: total users, active users, admin count
- Displays user avatars with initials
- Shows credit balance and purchase history
- Color-coded role badges (admin = purple, user = gray)
- Status indicators (active = green, inactive = red)

### 5. Products Page (`/admin/products`)
Features:
- List all products across all users
- View product images or placeholder icons
- See product owner information
- Filter by SKU, status, and user
- Display product statistics
- Show popular tags across all products

### 6. Generations History (`/admin/generations`)
Features:
- Complete AI generation history
- Status tracking (pending, processing, completed, failed)
- Credits used and API costs per generation
- Generation type breakdown
- User and product associations
- Timestamp with date and time

## API Routes Created

All API routes are protected with admin role check:

1. **GET `/api/admin/users`** - Fetch all users
2. **GET `/api/admin/products`** - Fetch all products
3. **GET `/api/admin/generations`** - Fetch all generations
4. **GET `/api/admin/stats`** - Fetch dashboard statistics

## Database Integration

Uses functions from `lib/supabase-admin.ts`:
- `isUserAdmin(userId)` - Check if user is admin
- `getAllUsers()` - Fetch all users
- `getAllProducts()` - Fetch all products with user info
- `getAllGeneratedAssets()` - Fetch all generations
- `getDashboardStats()` - Calculate statistics

## Setting Up Your First Admin User

Since you mentioned most users will be admins by default, you need to:

1. Sign up through Clerk (if not already done)
2. Get your Clerk user ID
3. In Supabase, either:
   - Manually insert a record in the `users` table with your Clerk ID and `role: 'admin'`
   - Or create a user with the default 'user' role, then update it to 'admin'

Example SQL to make a user an admin:
```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

## File Structure

```
app/
├── (admin)/                          # Admin route group
│   ├── layout.tsx                   # Admin layout with sidebar
│   ├── dashboard/
│   │   └── page.tsx                 # Overview stats
│   ├── users/
│   │   └── page.tsx                 # User management
│   ├── products/
│   │   └── page.tsx                 # Products listing
│   └── generations/
│       └── page.tsx                 # Generations history
├── api/admin/
│   ├── users/route.ts               # Users API
│   ├── products/route.ts            # Products API
│   ├── generations/route.ts         # Generations API
│   └── stats/route.ts               # Stats API
lib/
└── supabase-admin.ts                 # Admin helper functions
middleware.ts                         # Route protection
```

## Security Features

✅ Clerk authentication required
✅ Role-based access control via Supabase
✅ Middleware protection on all admin routes
✅ API route protection with admin checks
✅ Automatic redirects for unauthorized users
✅ Row-level security policies in Supabase

## Next Steps

1. **Create your first admin user** in Supabase
2. **Test the dashboard** by visiting `/admin/dashboard`
3. **Add more users** through the main app
4. **Future enhancements** (optional):
   - User editing capabilities (change role, add credits)
   - Product editing/deletion
   - Generation retry functionality
   - Export data to CSV
   - Webhook integration for auto user creation

## Styling

- Built with Tailwind CSS (matches your existing setup)
- Responsive design (mobile-friendly)
- Clean, professional UI with cards and tables
- Color-coded status badges
- Icon-based navigation

## Troubleshooting

**"Unauthorized" error:**
- Make sure you're signed in with Clerk
- Check that your user record exists in Supabase `users` table

**"Forbidden" error:**
- Your user exists but doesn't have admin role
- Update your role to 'admin' in Supabase

**No data showing:**
- Tables are empty (this is normal for new setup)
- Add users, products, and generations through the main app first

---

Enjoy your new admin dashboard! 🎉
