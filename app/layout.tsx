import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionGuard } from '@/components/auth/SessionGuard'
import { Toaster } from "@/components/ui/toaster"
import { RemoveServiceWorker } from '@/components/remove-service-worker'

export const metadata: Metadata = {
  title: 'MySGC - App for SGC Members',
  description: 'Created by Team SGC',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    title: 'MySGC',
    statusBarStyle: 'default',
  },
  applicationName: 'MySGC',
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body>
        <SessionGuard>
          {children}
        </SessionGuard>
        <RemoveServiceWorker />
        <Toaster />
      </body>
    </html>
  )
}
