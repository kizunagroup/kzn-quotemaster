import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Next.js SaaS Starter',
  description: 'Get started quickly with Next.js, Postgres, and Stripe.'
};

export const viewport: Viewport = {
  maximumScale: 1
};

const manrope = Manrope({ subsets: ['latin'] });
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700'],
});

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className} ${jakarta.variable}`}
    >
      <body className="min-h-[100dvh] bg-gray-50">
        <SWRConfig
          value={{
            fallback: {
              // We do NOT await here
              // Only components that read this data will suspend
              '/api/user': getUser(),
              '/api/team': getTeamForUser()
            }
          }}
        >
          {children}
          <Toaster richColors position="top-right" />
        </SWRConfig>
      </body>
    </html>
  );
}
