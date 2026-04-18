import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MySGC - App for SGC Members',
    short_name: 'MySGC',
    description: 'Created by Team SGC',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f0f0f0',
    theme_color: '#000000',
    orientation: 'portrait',
    icons: [
      {
        src: '/logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
