import { Suspense } from 'react';
import { Metadata } from 'next';
import { StaffDataTable } from '@/components/features/staff/staff-data-table';

export const metadata: Metadata = {
  title: 'Quản lý Nhân viên | Kizuna',
  description: 'Quản lý thông tin nhân viên, phòng ban, và nhóm làm việc trong hệ thống'
};

export default function StaffPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý Nhân viên</h1>
      </div>

      <Suspense fallback={<div>Đang tải...</div>}>
        <StaffDataTable />
      </Suspense>
    </div>
  );
}