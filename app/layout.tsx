import type { Metadata } from 'next'
import './globals.css'
import { SessionGuard } from '@/components/auth/SessionGuard'
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'MySGC - App for SGC Members',
  description: 'Created by Team SGC',
  manifest: '/manifest.json',
  themeColor: '#f0f0f0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MySGC',
  },
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
        <Toaster />
      </body>
    </html>
  )
}
