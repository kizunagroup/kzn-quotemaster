import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thông tin tài khoản | Kizuna',
  description: 'Quản lý thông tin tài khoản và cài đặt hệ thống'
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
