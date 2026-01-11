import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/supabase-admin";
import Link from "next/link";
import { NotificationWrapper } from "./components/NotificationWrapper";

export default async function Home() {
  const { userId } = await auth();
  let user = null;
  let isAdmin = false;

  if (userId) {
    user = await getUserById(userId);
    isAdmin = user?.role === "admin" && user?.is_active === true;
  }

  return (
    <main className="min-h-screen p-24">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold mb-6">Order & Inventory Management</h1>
        <p className="text-xl text-gray-600 mb-12">
          Modern order entry and stock tracking system
        </p>

        {userId ? (
          <>
            {/* Notification features for non-admin users */}
            <NotificationWrapper isAdmin={isAdmin} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href="/orders"
                className="block p-8 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <h2 className="text-2xl font-bold mb-2">📦 Orders</h2>
                <p className="text-gray-600">Create and manage customer orders</p>
              </Link>

            <Link
              href="/stock/out"
              className="block p-8 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <h2 className="text-2xl font-bold mb-2">📤 Stock Out</h2>
              <p className="text-gray-600">Scan and track inventory outflow</p>
            </Link>

              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="block p-8 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-colors md:col-span-2"
                >
                  <h2 className="text-2xl font-bold mb-2">👨‍💼 Admin Dashboard</h2>
                  <p className="text-gray-600">Manage users, orders, and view reports</p>
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 mb-6">Please sign in to access the system</p>
          </div>
        )}
      </div>
    </main>
  );
}
