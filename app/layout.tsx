import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MySGC - App for SGC Members',
  description: 'Created by Team SGC'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
