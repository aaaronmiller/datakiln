import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Research Workflow Builder',
  description: 'Visual workflow builder for research tasks',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-screen">{children}</body>
    </html>
  )
}