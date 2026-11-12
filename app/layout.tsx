import type { Metadata } from 'next';
import './globals.css';
import { SchedulerHeartbeat } from '@/components/layout/SchedulerHeartbeat';

export const metadata: Metadata = {
  title: 'Automailer | Multi-Sender Bulk Email Outreach Platform',
  description: 'Production cloud SaaS for bulk email campaigns. Features multi-sender pool rotation, real-time spam keyword checking, and persistent CSV contact storage.',
  keywords: [
    'bulk email platform',
    'multi-sender email rotation',
    'cold email outreach',
    'affiliate email marketing',
    'primary inbox deliverability',
    'spam detector tool',
    'email campaign SaaS',
  ],
  authors: [{ name: 'Automailer Inc.' }],
  creator: 'Automailer',
  publisher: 'Automailer',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Automailer | Multi-Sender Bulk Email Outreach SaaS',
    description: 'Rotate sender pools, analyze spam keywords in real-time, and dispatch recipient CSV lists with cloud deliverability control.',
    url: 'https://automailer.io',
    siteName: 'Automailer SaaS',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Automailer | Multi-Sender Bulk Email Outreach SaaS',
    description: 'Rotate sender pools, analyze spam keywords in real-time, and dispatch recipient CSV lists.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-blue-500 selection:text-white" suppressHydrationWarning>
        <SchedulerHeartbeat />
        {children}
      </body>
    </html>
  );
}
