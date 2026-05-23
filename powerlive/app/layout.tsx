import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/app/context/AuthContext'

export const metadata: Metadata = {
  title: 'Where is My Power? — Tamil Nadu Live',
  description: 'Community-powered real-time electricity outage tracker for Tamil Nadu — Where is My Power?',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
