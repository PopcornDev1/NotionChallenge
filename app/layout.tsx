import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || !theme) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
