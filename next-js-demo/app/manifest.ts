import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Daga Wallpapers Order & Inventory',
    short_name: 'Daga Inventory',
    description: 'Real-time order management and inventory tracking for Daga Wallpapers with QR scanning',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
    ],
    categories: ['business', 'productivity'],
    shortcuts: [
      {
        name: 'Orders',
        short_name: 'Orders',
        description: 'View all orders',
        url: '/orders',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'Stock Out',
        short_name: 'Stock',
        description: 'Scan stock items',
        url: '/stock/out',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }]
      }
    ]
  }
}
