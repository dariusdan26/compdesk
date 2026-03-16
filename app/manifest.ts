import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CompDesk',
    short_name: 'CompDesk',
    description: 'Internal operations app for composites distribution & manufacturing',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#1B3A5C',
    theme_color: '#1B3A5C',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
