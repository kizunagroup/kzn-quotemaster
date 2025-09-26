'use client';

import { useState, useEffect } from 'react';
import { useForm, useFormState } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';

import {
  createSupplier,
  updateSupplier,
} from '@/lib/actions/supplier.actions';
import {
  createSupplierSchema,
  updateSupplierSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
} from '@/lib/schemas/supplier.schemas';
import type { Supplier } from '@/lib/hooks/use-suppliers';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null; // null for create, Supplier object for edit
}

export function SupplierFormModal({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}: SupplierFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = Boolean(supplier);

  // Form setup with conditional schema based on mode
  const form = useForm<CreateSupplierInput | UpdateSupplierInput>({
    resolver: zodResolver(isEditMode ? updateSupplierSchema : createSupplierSchema),
    mode: 'onChange', // Enable instant validation for all fields
    defaultValues: {
      supplierCode: '',
      name: '',
      taxId: '',
      address: '',
      contactPerson: '',
      phone: '',
      email: '',
      ...(isEditMode && supplier && {
        id: supplier.id,
      }),
    },
  });

  // STANDARDIZED DATA LOSS PREVENTION: Use useFormState for real-time dirty checking
  const { isDirty } = useFormState({ control: form.control });

  // Reset form when modal opens/closes or supplier changes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && supplier) {
        // Populate form with supplier data for editing
        form.reset({
          id: supplier.id,
          supplierCode: supplier.supplierCode || '',
          name: supplier.name || '',
          taxId: supplier.taxId || '',
          address: supplier.address || '',
          contactPerson: supplier.contactPerson || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
        });
      } else {
        // Reset form for create mode
        form.reset({
          supplierCode: '',
          name: '',
          taxId: '',
          address: '',
          contactPerson: '',
          phone: '',
          email: '',
        });
      }
    }
  }, [isOpen, isEditMode, supplier, form]);

  // Handle form submission
  const onSubmit = async (values: CreateSupplierInput | UpdateSupplierInput) => {
    setIsSubmitting(true);

    try {
      let result;

      if (isEditMode) {
        // Update existing supplier
        result = await updateSupplier(values as UpdateSupplierInput);

        if (result.success) {
          toast.success(result.success);
          onSuccess();
          onClose();
        } else if (result.error) {
          // Handle update errors
          if (result.error.includes('Mã nhà cung cấp đã tồn tại') || result.error.includes('supplier code already exists')) {
            form.setError('supplierCode', {
              type: 'server',
              message: 'Mã nhà cung cấp này đã được sử dụng'
            });
          } else if (result.error.includes('Email đã tồn tại') || result.error.includes('email already exists')) {
            form.setError('email', {
              type: 'server',
              message: 'Email này đã được sử dụng'
            });
          } else {
            toast.error(result.error);
          }
        }
      } else {
        // Create new supplier
        result = await createSupplier(values as CreateSupplierInput);

        if (result.success) {
          toast.success(result.success);
          onSuccess();
          onClose();
        } else if (result.error) {
          // Handle create errors
          if (result.error.includes('Mã nhà cung cấp đã tồn tại') || result.error.includes('supplier code already exists')) {
            form.setError('supplierCode', {
              type: 'server',
              message: 'Mã nhà cung cấp này đã được sử dụng'
            });
          } else if (result.error.includes('Email đã tồn tại') || result.error.includes('email already exists')) {
            form.setError('email', {
              type: 'server',
              message: 'Email này đã được sử dụng'
            });
          } else {
            toast.error(result.error);
          }
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // STANDARDIZED DATA LOSS PREVENTION: Handle modal close with real-time dirty checking
  const handleClose = () => {
    if (!isSubmitting) {
      // Check if form has been modified using real-time isDirty from useFormState
      if (isDirty) {
        const shouldClose = window.confirm(
          'Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng?'
        );
        if (!shouldClose) {
          return;
        }
      }

      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          // STANDARDIZED DATA LOSS PREVENTION: Prevent closing when clicking outside if form is dirty
          if (isDirty) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Chỉnh sửa Nhà cung cấp' : 'Thêm Nhà cung cấp mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Cập nhật thông tin nhà cung cấp. Nhấn lưu khi hoàn tất.'
              : 'Điền thông tin để tạo nhà cung cấp mới. Các trường có dấu * là bắt buộc.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier Code */}
              <FormField
                control={form.control}
                name="supplierCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã Nhà cung cấp</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: NCC001"
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

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên Nhà cung cấp *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Công ty TNHH ABC"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tax ID */}
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã số thuế</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: 0123456789"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Person */}
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Người liên hệ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Nguyễn Văn A"
                        {...field}
                        disabled={isSubmitting}
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
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: 0123456789"
                        {...field}
                        disabled={isSubmitting}
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="VD: contact@company.com"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address - Full width */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="VD: 123 Đường ABC, Phường XYZ, Quận DEF, TP HCM"
                      className="min-h-[100px]"
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