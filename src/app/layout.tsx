import type { Metadata, Viewport } from 'next'
import './globals.css'
import SwRegistration from '@/components/SwRegistration'
import Toaster from '@/components/ui/Toaster'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

export const metadata: Metadata = {
  title: 'Familytool – Flessing Labs',
  description: 'Das Familien-Dashboard von Flessing Labs für Termine, Einkauf, Schule und mehr',
  manifest: '/familytool/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Familytool',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#4f46e5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="apple-touch-icon" href="/familytool/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <SwRegistration />
        {children}
        <Toaster />
        <ConfirmDialog />
      </body>
    </html>
  )
}
