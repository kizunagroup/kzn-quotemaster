import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đăng nhập | Kizuna',
  description: 'Đăng nhập vào hệ thống quản lý báo giá QuoteMaster'
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
