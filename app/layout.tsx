import type { Metadata } from 'next'
import './globals.css'

// Root layout that wraps all pages in the app
// Metadata is used for SEO and browser tabs
export const metadata: Metadata = {
  title: 'Mini-Notion Clone',
  description: 'A lightweight Notion-like block editor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
