import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CompDesk',
  description: 'Internal operations app for composites distribution & manufacturing',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`} style={{ background: '#EEF3F9' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
