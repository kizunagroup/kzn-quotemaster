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
import { Textarea } from '@/components/ui/textarea';
import { createSupplier, updateSupplier } from '@/lib/actions/supplier.actions';
import { createSupplierSchema, type CreateSupplierInput } from '@/lib/schemas/supplier.schemas';
import type { Supplier } from '@/lib/hooks/use-suppliers';

// Form schema with Vietnamese error messages (client-side version)
const formSchema = z.object({
  supplierCode: z
    .string()
    .min(1, 'Mã nhà cung cấp là bắt buộc')
    .max(20, 'Mã nhà cung cấp không được vượt quá 20 ký tự')
    .regex(/^[A-Z0-9_-]*$/, 'Mã nhà cung cấp chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới')
    .optional()
    .or(z.literal('')),
  name: z
    .string()
    .min(1, 'Tên nhà cung cấp là bắt buộc')
    .max(255, 'Tên nhà cung cấp không được vượt quá 255 ký tự'),
  taxId: z
    .string()
    .max(50, 'Mã số thuế không được vượt quá 50 ký tự')
    .optional()
    .or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  contactPerson: z
    .string()
    .max(255, 'Tên người liên hệ không được vượt quá 255 ký tự')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Số điện thoại không được vượt quá 20 ký tự')
    .regex(/^[0-9\s\-\+\(\)]*$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Email không hợp lệ')
    .max(255, 'Email không được vượt quá 255 ký tự')
    .optional()
    .or(z.literal('')),
});

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
}

export function SupplierFormModal({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}: SupplierFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = Boolean(supplier);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      supplierCode: '',
      name: '',
      taxId: '',
      address: '',
      contactPerson: '',
      phone: '',
      email: '',
    },
  });

  // Reset form when modal opens/closes or supplier changes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && supplier) {
        form.reset({
          supplierCode: supplier.supplierCode || '',
          name: supplier.name || '',
          taxId: supplier.taxId || '',
          address: supplier.address || '',
          contactPerson: supplier.contactPerson || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
        });
      } else {
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      // Convert empty strings to undefined for optional fields
      const sanitizedValues: CreateSupplierInput = {
        ...values,
        supplierCode: values.supplierCode || undefined,
        taxId: values.taxId || undefined,
        address: values.address || undefined,
        contactPerson: values.contactPerson || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
      };

      let result;

      if (isEditMode && supplier) {
        result = await updateSupplier({
          id: supplier.id,
          ...sanitizedValues
        });
      } else {
        result = await createSupplier(sanitizedValues);
      }

      if (result.success) {
        toast.success(result.success);
        onSuccess();
        onClose();
      } else if (result.error) {
        // Handle specific field errors
        if (result.error.includes('Mã nhà cung cấp đã tồn tại')) {
          form.setError('supplierCode', {
            type: 'server',
            message: result.error
          });
        } else if (result.error.includes('email')) {
          form.setError('email', {
            type: 'server',
            message: result.error
          });
        } else {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ROBUST MODAL CLOSING LOGIC like Staff pattern
  const handleClose = () => {
    if (!isSubmitting) {
      const isDirty = form.formState.isDirty;
      if (isDirty) {
        const shouldClose = window.confirm(
          'Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng?'
        );
        if (!shouldClose) return;
      }
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
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
              <FormField
                control={form.control}
                name="supplierCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã nhà cung cấp</FormLabel>
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

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên nhà cung cấp *</FormLabel>
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
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