import { Metadata } from 'next';
import ClientLayout from './_client-layout';

export const metadata: Metadata = {
  title: 'Team Settings | Kizuna',
  description: 'Manage team subscription and team members'
};

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
