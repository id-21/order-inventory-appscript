# Order & Inventory Management System

A modern, full-stack order and inventory management application built with Next.js, Supabase, and Clerk authentication. Features QR code scanning for real-time stock tracking and a comprehensive admin dashboard.

## 🚀 Features

### Order Management
- **Create Orders**: Dynamic form with unlimited line items (Design, Quantity, Lot)
- **Auto-incrementing Order Numbers**: Sequential order tracking
- **Order Status Tracking**: PENDING → COMPLETED workflow
- **Customer Management**: Track orders by customer name
- **Real-time Updates**: Order status updates automatically based on fulfillment

### Stock Out / Inventory Tracking
- **QR Code Scanning**: Scan products using mobile camera
- **Order-based Fulfillment**: Select pending orders and scan items
- **Custom Stock Movements**: Manual inventory adjustments
- **Duplicate Prevention**: Automatic validation of scanned items
- **Quantity Validation**: Prevent over-scanning beyond order requirements
- **Image Proof**: Capture photos of shipments
- **Aggregated Tracking**: Automatic grouping by Design and Lot

### Admin Dashboard
- **User Management**: View and manage all users
- **Order Overview**: Monitor all orders across the system
- **Stock Reports**: Track inventory movements
- **Analytics**: Order completion rates and statistics

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: [Clerk](https://clerk.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **QR Scanning**: [html5-qrcode](https://github.com/mebjas/html5-qrcode)
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Clerk account and application
- Mobile device with camera (for QR scanning)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd next-js-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
   CLERK_SECRET_KEY=your-clerk-secret-key
   ```

4. **Set up the database**

   Run the SQL schema in your Supabase SQL Editor:
   ```bash
   # File location: discussions/setup-files/schema.sql
   ```

   This will create:
   - `users` table
   - `orders` table
   - `order_items` table
   - `stock_movements` table
   - `scanned_items` table
   - All necessary indexes, RLS policies, and triggers

5. **Configure Supabase Storage (for images)**

   In your Supabase dashboard:
   - Go to Storage
   - Create a new bucket named `stock-movement-images`
   - Set it to public or configure appropriate access policies

6. **Configure Clerk**

   - Create a Clerk application
   - Set up user metadata to sync with Supabase
   - Configure allowed redirect URLs
   - Enable email/password or social authentication

7. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
next-js-demo/
├── app/
│   ├── admin/              # Admin dashboard pages
│   │   ├── dashboard/      # Main admin overview
│   │   └── users/          # User management
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── admin/          # Admin API endpoints
│   │   ├── orders/         # Order management API
│   │   └── stock/          # Stock movement API
│   ├── components/         # Reusable components
│   ├── orders/             # Order management pages
│   └── stock/              # Stock tracking pages
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── supabase-admin.ts   # Supabase admin client
│   └── types.ts            # TypeScript types
├── discussions/            # Documentation
│   └── setup-files/
│       └── schema.sql      # Database schema
└── middleware.ts           # Route protection
```

## 🗄️ Database Schema

### Tables

1. **users** - User authentication and roles
2. **orders** - Order header information
3. **order_items** - Individual line items per order
4. **stock_movements** - Inventory movement tracking
5. **scanned_items** - Temporary QR scan session storage

### Key Features

- Row Level Security (RLS) enabled on all tables
- Automatic timestamp updates via triggers
- Auto-incrementing order numbers (SERIAL)
- Automatic order status updates based on fulfillment
- JSONB fields for audit trails

## 🔐 Authentication & Authorization

### User Roles

- **user**: Can create orders and track stock
- **admin**: Full access to all data and management features

### Row Level Security

- Users can only view/edit their own orders and stock movements
- Admins can view all data across the system
- Service role key used for admin operations (bypasses RLS)

## 📱 Usage

### Creating an Order

1. Navigate to **Orders** section
2. Click "Create New Order"
3. Order number auto-fills
4. Enter customer name
5. Add line items (Design, Quantity, Lot)
6. Submit order

### Stock Out Process

1. Navigate to **Stock Out** section
2. Select a pending order from the cards
3. Invoice number auto-fills
4. Scan QR codes on products
5. View aggregated items in table
6. Capture proof image
7. Submit stock movement
8. Order automatically marks as COMPLETED when fulfilled

### Admin Operations

1. Navigate to **Admin Dashboard**
2. View system statistics
3. Manage users
4. View all orders and stock movements
5. Generate reports

## 🔄 Data Flow

### Order Entry Flow
```
User → Create Order Form → Validate Input →
API Route → Supabase (orders + order_items) →
Success Response → Update UI
```

### Stock Out Flow
```
User → Select Order → Scan QR Codes →
Validate Each Scan → Store in scanned_items →
Aggregate Data → Capture Image →
Submit → Create stock_movements →
Update order status → Clear session
```

## 📦 QR Code Format

Expected QR code JSON structure:
```json
{
  "Design": "SKU-123",
  "Lot": "LOT-456",
  "Unique Identifier": "UID-789"
}
```

## 🧪 Testing

### Local Testing
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## 🚀 Deployment

### Recommended: Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Other Platforms

Compatible with any Next.js hosting platform (Netlify, Railway, etc.)

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for admin) | ✅ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | ✅ |
| `CLERK_SECRET_KEY` | Clerk secret key | ✅ |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC

## 🆘 Support

For issues and questions:
- Check the [discussions folder](./discussions/) for setup guides
- Review the [migration report](./MIGRATION_REPORT.md) for architecture details
- Check database schema at [schema.sql](./discussions/setup-files/schema.sql)

## 🎯 Roadmap

- [ ] Bulk order import (CSV/Excel)
- [ ] Advanced reporting and analytics
- [ ] Real-time notifications with Supabase Realtime
- [ ] Offline mode with PWA
- [ ] Barcode scanner support (in addition to QR)
- [ ] Mobile app (React Native)
- [ ] Export functionality (PDF/Excel)
- [ ] Multi-language support

## 📚 Documentation

- [Migration Report](./MIGRATION_REPORT.md) - Detailed architecture and planning
- [Database Schema](./discussions/setup-files/schema.sql) - Complete SQL schema
- [Admin Setup Guide](./app/admin/CLAUDE.md) - Admin client usage guide

---

**Built with ❤️ for efficient order and inventory management**
