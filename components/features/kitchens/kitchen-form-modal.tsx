"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createKitchenSchema, updateKitchenSchema, type CreateKitchenInput, type UpdateKitchenInput } from '@/types/quotemaster';
import { createKitchen, updateKitchen } from '@/lib/actions/kitchen.actions';

// Type for kitchen data (matches the getKitchens return type)
interface KitchenData {
  id: number;
  kitchenCode: string | null;
  name: string;
  region: string | null;
  address: string | null;
  managerName: string | null;
  phone: string | null;
  email: string | null;
  teamType: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface KitchenFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: KitchenData | null;
  onSuccess?: () => void;
}

export function KitchenFormModal({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: KitchenFormModalProps) {
  const { toast } = useToast();
  const isEdit = !!initialData;

  // Determine which schema to use based on mode
  const schema = isEdit ? updateKitchenSchema : createKitchenSchema;
  type FormData = typeof isEdit extends true ? UpdateKitchenInput : CreateKitchenInput;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      kitchenCode: '',
      name: '',
      region: '',
      address: '',
      managerName: '',
      phone: '',
      email: '',
      ...(isEdit && { id: initialData?.id }),
    } as FormData,
  });

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (open && initialData) {
      // Edit mode - populate form with existing data
      form.reset({
        id: initialData.id,
        kitchenCode: initialData.kitchenCode || '',
        name: initialData.name || '',
        region: initialData.region || '',
        address: initialData.address || '',
        managerName: initialData.managerName || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
      } as FormData);
    } else if (open && !initialData) {
      // Create mode - reset to empty form
      form.reset({
        kitchenCode: '',
        name: '',
        region: '',
        address: '',
        managerName: '',
        phone: '',
        email: '',
      } as FormData);
    }
  }, [open, initialData, form]);

  const onSubmit = async (values: FormData) => {
    try {
      const formData = new FormData();

      // Add all form fields to FormData
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      let result;
      if (isEdit) {
        result = await updateKitchen({}, formData);
      } else {
        result = await createKitchen({}, formData);
      }

      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(result.success);
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error submitting kitchen form:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Chỉnh sửa Bếp' : 'Thêm Bếp Mới'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mã bếp */}
              <FormField
                control={form.control}
                name="kitchenCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã bếp *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: BEP001"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tên bếp */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên bếp *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập tên bếp"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Khu vực */}
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khu vực *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập khu vực"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quản lý */}
              <FormField
                control={form.control}
                name="managerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quản lý *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Tên người quản lý"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0123456789"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Địa chỉ - Full width */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nhập địa chỉ đầy đủ"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEdit ? 'Đang cập nhật...' : 'Đang tạo...'}
                  </>
                ) : (
                  <>
                    {isEdit ? 'Cập nhật' : 'Tạo mới'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}