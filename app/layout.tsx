import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustFolio — Verified portfolios, trusted everywhere',
  description:
    'Upload your portfolio to 0G decentralized storage, get AI-verified quality scores, and showcase work the world can trust.',
  icons: { icon: '/logo.png' },
  openGraph: {
    title: 'TrustFolio',
    description: 'Verified portfolios, trusted everywhere',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg-primary text-gray-100 antialiased">
        <Providers>
          <Navbar />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
