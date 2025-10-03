'use client';

import { Suspense } from 'react';
import { KitchensDataTable } from '@/components/features/kitchens/kitchens-data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Main content component with kitchen data table
function KitchensContent() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý Bếp</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin các bếp trong hệ thống
          </p>
        </div>
      </div>

      {/* Main data table card */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Bếp</CardTitle>
        </CardHeader>
        <CardContent>
          <KitchensDataTable />
        </CardContent>
      </Card>
    </div>
  );
}

// Loading skeleton component
function KitchensLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
      </div>

      {/* Main card skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Toolbar skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-[250px]" />
                <Skeleton className="h-8 w-[120px]" />
                <Skeleton className="h-8 w-[100px]" />
              </div>
              <Skeleton className="h-8 w-[100px]" />
            </div>

            {/* Table skeleton */}
            <div className="rounded-md border">
              {/* Table header skeleton */}
              <div className="border-b p-4">
                <div className="flex space-x-4">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              </div>

              {/* Table rows skeleton */}
              <div className="divide-y">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="flex space-x-4">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[120px]" />
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[80px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-8 w-[70px]" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-8 w-[32px]" />
                <Skeleton className="h-8 w-[32px]" />
                <Skeleton className="h-8 w-[32px]" />
                <Skeleton className="h-8 w-[32px]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main page component with Suspense boundary
export default function KitchensPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <Suspense fallback={<KitchensLoading />}>
        <KitchensContent />
      </Suspense>
    </div>
  );
}