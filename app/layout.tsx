import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionGuard } from '@/components/auth/SessionGuard'
import { Toaster } from "@/components/ui/toaster"
import { PwaServiceWorker } from '@/components/pwa-service-worker'

export const metadata: Metadata = {
  title: 'MySGC - App for SGC Members',
  description: 'Created by Team SGC',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MySGC',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
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
        <PwaServiceWorker />
        <Toaster />
      </body>
    </html>
  )
}
