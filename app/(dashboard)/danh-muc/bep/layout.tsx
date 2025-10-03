import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý Bếp | Kizuna',
  description: 'Quản lý thông tin các bếp trong hệ thống'
};

export default function KitchensLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
