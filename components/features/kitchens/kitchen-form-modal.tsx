'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  createKitchen,
  updateKitchen,
} from '@/lib/actions/kitchen.actions';
import {
  createKitchenSchema,
  updateKitchenSchema,
} from '@/lib/schemas/kitchen.schemas';
import type { Kitchen } from '@/lib/hooks/use-kitchens';
import { ManagerCombobox } from './manager-combobox';

// Form validation schemas
const createFormSchema = createKitchenSchema;
const updateFormSchema = updateKitchenSchema;

interface KitchenFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  kitchen?: Kitchen | null; // null for create, Kitchen object for edit
}

export function KitchenFormModal({
  isOpen,
  onClose,
  onSuccess,
  kitchen,
}: KitchenFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = Boolean(kitchen);

  // Form setup with conditional schema based on mode
  const form = useForm<z.infer<typeof createFormSchema> | z.infer<typeof updateFormSchema>>({
    resolver: zodResolver(isEditMode ? updateFormSchema : createFormSchema),
    defaultValues: {
      kitchenCode: '',
      name: '',
      region: '',
      address: '',
      managerId: undefined,
      status: 'active',
      ...(isEditMode && kitchen && { id: kitchen.id }),
    },
  });

  // Reset form when modal opens/closes or kitchen changes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && kitchen) {
        // Populate form with kitchen data for editing
        form.reset({
          id: kitchen.id,
          kitchenCode: kitchen.kitchenCode || '',
          name: kitchen.name || '',
          region: kitchen.region || '',
          address: kitchen.address || '',
          managerId: kitchen.managerId || undefined,
          status: kitchen.status === 'active' ? 'active' : 'inactive',
        });
      } else {
        // Reset form for create mode
        form.reset({
          kitchenCode: '',
          name: '',
          region: '',
          address: '',
          managerId: undefined,
          status: 'active',
        });
      }
    }
  }, [isOpen, isEditMode, kitchen, form]);

  // Handle form submission
  const onSubmit = async (values: any) => {
    setIsSubmitting(true);

    try {
      let result;

      if (isEditMode) {
        // Update existing kitchen
        result = await updateKitchen(values);
      } else {
        // Create new kitchen
        result = await createKitchen(values);
      }

      if (result.success) {
        toast.success(result.success);
        onSuccess();
        onClose();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Chỉnh sửa Bếp' : 'Thêm Bếp mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Cập nhật thông tin bếp. Nhấn lưu khi hoàn tất.'
              : 'Điền thông tin để tạo bếp mới. Các trường có dấu * là bắt buộc.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kitchen Code */}
              <FormField
                control={form.control}
                name="kitchenCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã Bếp *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: KT001"
                        {...field}
                        disabled={isSubmitting}
                        className="uppercase"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Kitchen Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên Bếp *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Bếp Trung tâm Hà Nội"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Region */}
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khu vực *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Hà Nội"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Hoạt động</SelectItem>
                        <SelectItem value="inactive">Tạm dừng</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            {/* Manager Selection */}
            <FormField
              control={form.control}
              name="managerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quản lý *</FormLabel>
                  <FormControl>
                    <ManagerCombobox
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Chọn quản lý..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VD: 123 Đường ABC, Quận XYZ, Thành phố..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}