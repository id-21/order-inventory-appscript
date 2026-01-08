# Server vs Client Components Guide

## Quick Reference

### Default Behavior
In Next.js App Router, **all components are Server Components by default** unless you add `'use client'` directive.

---

## When to Use Server Components

Use Server Components (default) when you need:

- **Data fetching** - Direct database queries, API calls on the server
- **Backend resources** - Access to file system, environment variables, secrets
- **Heavy dependencies** - Large libraries that should stay on the server
- **Sensitive operations** - Authentication checks, authorization logic
- **SEO content** - Content that must be rendered for search engines

### Examples:
```tsx
// ✅ Server Component (default)
export default async function ProductPage() {
  const products = await db.query.products.findMany();
  return <ProductList products={products} />;
}

// ✅ Server Component with auth
export default async function AdminLayout({ children }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const isAdmin = await isUserAdmin(userId);
  if (!isAdmin) redirect('/');

  return <div>{children}</div>;
}
```

---

## When to Use Client Components

Use Client Components (`'use client'`) when you need:

- **Interactivity** - onClick, onChange, form submissions
- **React hooks** - useState, useEffect, useContext, custom hooks
- **Browser APIs** - localStorage, window, document, geolocation
- **Event listeners** - keyboard, mouse, scroll events
- **React Context** - Providers and consumers
- **Third-party libraries** - That rely on browser or React hooks

### Examples:
```tsx
// ✅ Client Component
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// ✅ Client Component with Clerk
'use client';

import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function AuthHeader() {
  return (
    <header>
      <SignedOut><SignInButton /></SignedOut>
      <SignedIn><UserButton /></SignedIn>
    </header>
  );
}
```

---

## Decision Tree

```
Does the component need interactivity or state?
├─ YES → Use Client Component ('use client')
└─ NO
   └─ Does it fetch data or access server resources?
      ├─ YES → Use Server Component (default)
      └─ NO
         └─ Does it use third-party components with hooks/context?
            ├─ YES → Use Client Component ('use client')
            └─ NO → Use Server Component (default)
```

---

## Common Patterns

### Pattern 1: Isolate Client Components

**❌ Bad:** Entire layout is client-side
```tsx
'use client';

export default function Layout({ children }) {
  return (
    <div>
      <SignedIn><UserButton /></SignedIn>
      {children}
    </div>
  );
}
```

**✅ Good:** Extract client logic to separate component
```tsx
// layout.tsx (Server Component)
export default function Layout({ children }) {
  return (
    <div>
      <AuthHeader />  {/* Client component */}
      {children}
    </div>
  );
}

// AuthHeader.tsx
'use client';
export default function AuthHeader() {
  return <SignedIn><UserButton /></SignedIn>;
}
```

### Pattern 2: Server Component with Client Islands

```tsx
// page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData(); // Server-side

  return (
    <div>
      <StaticContent data={data} />  {/* Server */}
      <InteractiveWidget />          {/* Client */}
    </div>
  );
}
```

### Pattern 3: Passing Server Data to Client Components

```tsx
// Server Component
export default async function Page() {
  const user = await getUser();
  return <ClientComponent user={user} />; // Pass as props
}

// Client Component
'use client';
export default function ClientComponent({ user }) {
  const [expanded, setExpanded] = useState(false);
  return <div onClick={() => setExpanded(!expanded)}>{user.name}</div>;
}
```

---

## Real-World Example: The Fix We Made

### Problem:
```tsx
// ❌ This caused Turbopack module instantiation error
import { SignedIn } from '@clerk/nextjs';

export default async function AdminLayout({ children }) {
  await auth(); // Server-side
  return (
    <SignedIn>  {/* Client component in Server Component! */}
      <div>{children}</div>
    </SignedIn>
  );
}
```

### Solution:
```tsx
// ✅ Fixed: Isolated client components
// AdminLayout.tsx - Server Component
export default async function AdminLayout({ children }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <div>{children}</div>; // No client components mixed in
}

// AuthHeader.tsx - Separate Client Component
'use client';
export default function AuthHeader() {
  return (
    <SignedIn>
      <UserButton />
    </SignedIn>
  );
}
```

---

## Performance Tips

1. **Minimize Client Components** - Keep them small and focused
2. **Server by Default** - Only add `'use client'` when necessary
3. **Compose Wisely** - Server Components can import Client Components, but not vice versa
4. **Data Fetching** - Always fetch on the server when possible
5. **Bundle Size** - Server Components don't add to client JS bundle

---

## Common Mistakes

### ❌ Using `'use client'` unnecessarily
```tsx
'use client'; // Not needed!

export default function StaticCard({ title }) {
  return <div>{title}</div>;
}
```

### ❌ Importing Server-only code in Client Components
```tsx
'use client';
import { db } from '@/lib/database'; // Error! Can't use server code

export default function Component() {
  const data = db.query(); // Won't work
}
```

### ❌ Using hooks without `'use client'`
```tsx
// Missing 'use client'!
import { useState } from 'react';

export default function Component() {
  const [state, setState] = useState(0); // Error!
}
```

---

## Quick Checklist

Before adding `'use client'`, ask:
- [ ] Does it use useState, useEffect, or other hooks?
- [ ] Does it have onClick, onChange, or event handlers?
- [ ] Does it use browser APIs (window, localStorage)?
- [ ] Does it import third-party components requiring client-side?

If **none of these** apply → Keep it as a Server Component!
