import './globals.css';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'QuoteMaster - Hệ thống quản lý báo giá',
  description: 'Hệ thống quản lý báo giá chuyên nghiệp cho chuỗi nhà hàng'
};

export const viewport: Viewport = {
  maximumScale: 1
};

const aptos_display = localFont({
  src: [
    {
      path: '../public/fonts/Aptos-Display.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Aptos-Display-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../public/fonts/Aptos-Display-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Aptos-Display-Bold-Italic.ttf',
      weight: '700',
      style: 'italic',
    },
  ],
  variable: '--font-aptos-display',
});

const aptos_narrow = localFont({
  src: [
    {
      path: '../public/fonts/Aptos-Narrow.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Aptos-Narrow-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../public/fonts/Aptos-Narrow-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Aptos-Narrow-Bold-Italic.ttf',
      weight: '700',
      style: 'italic',
    },
  ],
  variable: '--font-aptos-narrow',
});

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${aptos_display.variable} ${aptos_narrow.variable}`}
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
