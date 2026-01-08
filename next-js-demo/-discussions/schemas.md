# Database Schema for Product Model Shot Generation App

## Schema Overview

Three main tables with flexible JSON fields for extensibility and clear relationships for tracking generations.

---

## 1. Users Table

Stores user authentication, role, and credit information.

```sql
CREATE TABLE users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    -- Note: If using Supabase Auth, password is handled separately
    
    -- User Info
    full_name VARCHAR(255),
    
    -- Role & Permissions
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    -- Options: 'user', 'admin'
    
    -- Credits System
    credits_remaining INTEGER NOT NULL DEFAULT 0,
    total_credits_purchased INTEGER DEFAULT 0,
    
    -- Account Status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    
    -- Constraints
    CHECK (role IN ('user', 'admin')),
    CHECK (credits_remaining >= 0)
);
```

### Users Table - Notes

**Credits System:**
- Track remaining credits for generation limits
- Can be topped up through purchases
- Decremented on successful generations
- Admins can have unlimited credits (set to large number or handle in app logic)

**Role-Based Access:**
- `user`: Standard access to own products and generations
- `admin`: Full access to all data, user management, system settings

---

## 2. Products Table

Stores all product information and user-defined metadata.

```sql
CREATE TABLE products (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User Association
    user_id UUID NOT NULL,
    
    -- Core Product Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    
    -- Product Images (URLs or paths)
    images JSONB NOT NULL DEFAULT '[]',
    -- Structure: [{"url": "...", "filename": "...", "uploaded_at": "...", "is_primary": true}]
    
    -- Flexible User-Defined Fields
    custom_fields JSONB DEFAULT '{}',
    -- Structure: {"color": "red", "material": "cotton", "size": "M", ...}
    
    tags TEXT[] DEFAULT '{}',
    -- Array of tags: ["summer", "promotional", "bestseller"]
    
    -- System Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Indexes
    INDEX idx_products_user_id (user_id),
    INDEX idx_products_sku (sku),
    INDEX idx_products_tags USING GIN (tags)
);
```

### Products Table - JSON Examples

**images field:**
```json
[
    {
        "url": "https://storage.example.com/products/abc123/front.jpg",
        "filename": "product_front.jpg",
        "uploaded_at": "2024-11-21T10:30:00Z",
        "is_primary": true,
        "size_bytes": 245678
    },
    {
        "url": "https://storage.example.com/products/abc123/side.jpg",
        "filename": "product_side.jpg",
        "uploaded_at": "2024-11-21T10:31:00Z",
        "is_primary": false,
        "size_bytes": 198432
    }
]
```

**custom_fields example:**
```json
{
    "brand": "Daga Wallpapers",
    "collection": "European Heritage",
    "pattern_repeat": "64cm",
    "material": "Non-woven",
    "dimensions": {
        "width": "53cm",
        "length": "10m"
    },
    "color_family": ["blue", "gold"],
    "room_type": ["living room", "bedroom"],
    "price": 2500,
    "currency": "INR"
}
```

---

## 3. Generated Assets Table

Tracks all generation attempts and their outputs.

```sql
CREATE TABLE generated_assets (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key to Products
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- User Association
    user_id UUID NOT NULL,
    
    -- Generation Details
    generation_type VARCHAR(50) NOT NULL,
    -- e.g., "model_shot", "lifestyle", "room_scene"
    
    prompt TEXT,
    -- The prompt used for generation
    
    generation_params JSONB DEFAULT '{}',
    -- Model settings: {"model": "gemini-1.5-pro", "temperature": 0.7, ...}
    
    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Options: 'pending', 'processing', 'completed', 'failed'
    
    is_successful BOOLEAN,
    error_message TEXT,
    
    -- Generated Files
    output_assets JSONB DEFAULT '[]',
    -- Structure: [{"url": "...", "filename": "...", "type": "image", "is_selected": true}]
    
    -- Metadata
    generation_duration_ms INTEGER,
    api_cost DECIMAL(10, 4),
    credits_used INTEGER DEFAULT 1,
    -- Number of credits deducted for this generation
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- User Selection
    is_favorited BOOLEAN DEFAULT false,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_notes TEXT,
    
    -- Indexes
    INDEX idx_generated_assets_product_id (product_id),
    INDEX idx_generated_assets_user_id (user_id),
    INDEX idx_generated_assets_status (status),
    INDEX idx_generated_assets_created_at (created_at DESC)
);
```

### Generated Assets Table - JSON Examples

**generation_params example:**
```json
{
    "model": "gemini-1.5-pro",
    "temperature": 0.8,
    "aspect_ratio": "16:9",
    "scene_type": "modern_living_room",
    "lighting": "natural_daylight",
    "camera_angle": "eye_level",
    "style": "minimalist",
    "num_outputs": 4
}
```

**output_assets example:**
```json
[
    {
        "url": "https://storage.example.com/generated/xyz789/output_1.jpg",
        "filename": "model_shot_1.jpg",
        "type": "image",
        "format": "jpeg",
        "resolution": "1920x1080",
        "size_bytes": 456789,
        "generated_at": "2024-11-21T14:22:35Z",
        "is_selected": true,
        "thumbnail_url": "https://storage.example.com/generated/xyz789/thumb_1.jpg"
    },
    {
        "url": "https://storage.example.com/generated/xyz789/output_2.jpg",
        "filename": "model_shot_2.jpg",
        "type": "image",
        "format": "jpeg",
        "resolution": "1920x1080",
        "size_bytes": 423156,
        "generated_at": "2024-11-21T14:22:36Z",
        "is_selected": false,
        "thumbnail_url": "https://storage.example.com/generated/xyz789/thumb_2.jpg"
    }
]
```

---

## 4. Usage Statistics Table (Optional)

Track API usage and costs per user.

```sql
CREATE TABLE usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    
    total_generations INTEGER DEFAULT 0,
    successful_generations INTEGER DEFAULT 0,
    failed_generations INTEGER DEFAULT 0,
    
    total_cost DECIMAL(10, 4) DEFAULT 0,
    total_duration_ms BIGINT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (user_id, date),
    INDEX idx_usage_stats_user_date (user_id, date DESC)
);
```

---

## Relationships

```
users
  │
  ├─► products (1:N)
  │     │
  │     └─► generated_assets (1:N)
  │
  └─► generated_assets (1:N)
       └─► usage_stats (aggregated)
```

### Foreign Key Relationships
- `products.user_id` → `users.id`
- `generated_assets.user_id` → `users.id`
- `generated_assets.product_id` → `products.id`
- `usage_stats.user_id` → `users.id`

---

## Key Features

### Flexibility
- **JSONB fields** allow unlimited custom attributes without schema changes
- **TEXT arrays** for tagging support multiple classifications
- **Custom fields** can store any product-specific data structure

### Tracking
- **Complete generation history** linked to products
- **Status tracking** for async operations
- **Timestamps** for every stage of generation
- **Error logging** for failed generations

### Performance
- **Indexed** on common query patterns
- **Cascading deletes** maintain referential integrity
- **GIN indexes** on JSONB and array fields for fast searches

---

## Sample Queries

### Get user with credit balance
```sql
SELECT id, email, full_name, role, credits_remaining 
FROM users 
WHERE email = 'user@example.com';
```

### Check if user has enough credits
```sql
SELECT credits_remaining >= 5 as has_credits
FROM users 
WHERE id = 'user-uuid';
```

### Deduct credits after successful generation
```sql
UPDATE users 
SET credits_remaining = credits_remaining - 1,
    updated_at = NOW()
WHERE id = 'user-uuid' 
  AND credits_remaining > 0
RETURNING credits_remaining;
```

### Get all admins
```sql
SELECT * FROM users 
WHERE role = 'admin' 
  AND is_active = true;
```

### Get all generations for a product
```sql
SELECT * FROM generated_assets 
WHERE product_id = 'abc-123' 
ORDER BY created_at DESC;
```

### Get successful generations in last 7 days
```sql
SELECT p.name, ga.* 
FROM generated_assets ga
JOIN products p ON ga.product_id = p.id
WHERE ga.is_successful = true 
  AND ga.created_at > NOW() - INTERVAL '7 days'
ORDER BY ga.created_at DESC;
```

### Get products with specific tag
```sql
SELECT * FROM products 
WHERE 'promotional' = ANY(tags);
```

### Get total cost per product
```sql
SELECT 
    p.name,
    COUNT(ga.id) as total_generations,
    SUM(ga.api_cost) as total_cost,
    SUM(ga.credits_used) as total_credits_used
FROM products p
LEFT JOIN generated_assets ga ON p.id = ga.product_id
GROUP BY p.id, p.name;
```

### Get user's credit usage history
```sql
SELECT 
    DATE(ga.created_at) as date,
    COUNT(*) as generations,
    SUM(ga.credits_used) as credits_used
FROM generated_assets ga
WHERE ga.user_id = 'user-uuid'
  AND ga.is_successful = true
GROUP BY DATE(ga.created_at)
ORDER BY date DESC;
```

---

## Migration Considerations

If using Supabase:
- Enable UUID extension: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- Set up Row Level Security (RLS) policies per user
- Configure storage buckets for images and generated assets
- Set up real-time subscriptions for generation status updates