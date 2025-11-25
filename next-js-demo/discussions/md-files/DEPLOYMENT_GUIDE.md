# Deployment Guide - Vercel

This guide will help you deploy the Order & Inventory Management System to Vercel.

## Prerequisites

- Node.js 18+ installed
- Git repository initialized
- Clerk account with API keys
- Supabase account with database setup
- Vercel account (free tier works)

## Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

Or use npx (no installation needed):
```bash
npx vercel
```

## Step 2: Prepare Environment Variables

You'll need to configure these environment variables in Vercel:

### Required Environment Variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Optional: Gemini AI (if using AI features)
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash-image
GEMINI_TEXT_MODEL=gemini-2.5-flash-lite
```

**IMPORTANT:** Get these from your `.env.local` file but NEVER commit them to git!

## Step 3: Configure Clerk for Production

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to your application
3. Go to **Domains** section
4. Add your Vercel domain (you'll get this after first deployment)
5. Update redirect URLs to include your production domain

## Step 4: Configure Supabase Storage Bucket

Before deployment, ensure the storage bucket exists:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Storage**
3. Create a new bucket named: `stock-movement-images`
4. Make it **Public** (so images can be viewed)
5. Set file size limit: **5MB**
6. Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`

Or run this SQL in Supabase SQL Editor:
```sql
-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('stock-movement-images', 'stock-movement-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'stock-movement-images');

CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stock-movement-images' AND auth.role() = 'authenticated');
```

## Step 5: Deploy to Vercel

### Option A: Deploy via CLI (Recommended)

```bash
# Navigate to your project
cd next-js-demo

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

The CLI will:
1. Ask you to link to existing project or create new one
2. Detect it's a Next.js project automatically
3. Ask for project name
4. Deploy your application

### Option B: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your Git repository
4. Select **"next-js-demo"** as root directory
5. Add environment variables (see Step 2)
6. Click **"Deploy"**

## Step 6: Add Environment Variables to Vercel

### Via CLI:
```bash
# Add each environment variable
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### Via Dashboard:
1. Go to your project on Vercel
2. Click **Settings** → **Environment Variables**
3. Add each variable from your `.env.local`
4. Select **Production**, **Preview**, and **Development** environments
5. Click **Save**

## Step 7: Update Clerk Redirect URLs

After first deployment, you'll get a URL like: `https://your-app.vercel.app`

1. Go to Clerk Dashboard
2. Navigate to **Domains**
3. Add: `https://your-app.vercel.app`
4. Update **Redirect URLs**:
   - Sign-in: `https://your-app.vercel.app/sign-in`
   - Sign-up: `https://your-app.vercel.app/sign-up`
   - After sign-in: `https://your-app.vercel.app/`

## Step 8: Test Your Deployment

1. Visit your Vercel URL
2. Test sign-in/sign-up flow
3. Create a test order
4. Test QR code scanning (use mobile device)
5. Test image upload
6. Check stock movement history

## Common Issues & Solutions

### Issue: "Authentication Error"
**Solution:** Check Clerk environment variables and domain configuration

### Issue: "Database Connection Error"
**Solution:** Verify Supabase URL and keys are correct

### Issue: "Image Upload Fails"
**Solution:** Ensure storage bucket exists and is public

### Issue: "QR Scanner Not Working"
**Solution:**
- HTTPS is required for camera access
- Grant camera permissions in browser
- Test on mobile device

### Issue: "Build Fails"
**Solution:**
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npm run lint
```

## Continuous Deployment

Once set up, Vercel will automatically:
- Deploy on every push to main branch
- Create preview deployments for PRs
- Run builds and tests

## Monitoring & Analytics

1. **Vercel Dashboard:**
   - View deployment logs
   - Monitor performance
   - Check error rates

2. **Supabase Dashboard:**
   - Monitor database queries
   - Check API usage
   - View storage usage

## Rollback

If something goes wrong:
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback
```

## Custom Domain (Optional)

1. Purchase a domain
2. Go to Vercel Dashboard → **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions
5. Update Clerk redirect URLs with new domain

## Performance Optimization

Already configured:
- ✅ Next.js Image Optimization
- ✅ Automatic Static Optimization
- ✅ API Routes at Edge
- ✅ Incremental Static Regeneration

## Security Checklist

- ✅ Environment variables not in git
- ✅ `.env.local` in `.gitignore`
- ✅ Supabase RLS policies enabled
- ✅ Clerk authentication required
- ✅ HTTPS enforced by Vercel
- ✅ API routes protected with auth

## Cost Estimation

**Free Tier Includes:**
- Vercel: 100GB bandwidth/month
- Supabase: 500MB database + 1GB storage
- Clerk: 10,000 MAU (Monthly Active Users)

This should be sufficient for small to medium deployments!

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Clerk Docs:** https://clerk.com/docs
- **Supabase Docs:** https://supabase.com/docs

---

**Ready to deploy?** Run `vercel --prod` from the `next-js-demo` directory!
