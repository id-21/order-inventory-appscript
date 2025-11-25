'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminHeaderLink() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await fetch('/api/auth/is-admin');
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, []);

  if (loading || !isAdmin) return null;

  return (
    <Link href="/admin/dashboard" className="mr-4">
      Admin Dashboard
    </Link>
  );
}
