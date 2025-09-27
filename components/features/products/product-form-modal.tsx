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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  createProduct,
  updateProduct,
} from '@/lib/actions/product.actions';
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from '@/lib/schemas/product.schemas';
import type { Product } from '@/lib/hooks/use-products';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null; // null for create, Product object for edit
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  product,
}: ProductFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = Boolean(product);

  // Form setup with conditional schema based on mode
  const form = useForm<CreateProductInput | UpdateProductInput>({
    resolver: zodResolver(isEditMode ? updateProductSchema : createProductSchema),
    mode: 'onChange', // Enable instant validation for all fields
    defaultValues: {
      productCode: '',
      name: '',
      specification: '',
      unit: '',
      category: '',
      basePrice: '',
      baseQuantity: '',
      status: 'active',
      ...(isEditMode && product && {
        id: product.id,
      }),
    },
  });

  // STANDARDIZED DATA LOSS PREVENTION: Use useFormState for real-time dirty checking
  const { isDirty } = useFormState({ control: form.control });

  // Reset form when modal opens/closes or product changes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && product) {
        // Populate form with product data for editing
        form.reset({
          id: product.id,
          productCode: product.productCode || '',
          name: product.name || '',
          specification: product.specification || '',
          unit: product.unit || '',
          category: product.category || '',
          basePrice: product.basePrice || '',
          baseQuantity: product.baseQuantity || '',
          status: product.status as 'active' | 'inactive',
        });
      } else {
        // Reset form for create mode
        form.reset({
          productCode: '',
          name: '',
          specification: '',
          unit: '',
          category: '',
          basePrice: '',
          baseQuantity: '',
          status: 'active',
        });
      }
    }
  }, [isOpen, isEditMode, product, form]);

  // Handle form submission
  const onSubmit = async (values: CreateProductInput | UpdateProductInput) => {
    setIsSubmitting(true);

    try {
      let result;

      if (isEditMode) {
        // Update existing product
        result = await updateProduct(values as UpdateProductInput);

        if (result.success) {
          toast.success(result.success);
          onSuccess();
          onClose();
        } else if (result.error) {
          // Handle update errors
          if (result.error.includes('Mã hàng đã tồn tại') || result.error.includes('product code already exists')) {
            form.setError('productCode', {
              type: 'server',
              message: 'Mã hàng này đã được sử dụng'
            });
          } else {
            toast.error(result.error);
          }
        }
      } else {
        // Create new product
        result = await createProduct(values as CreateProductInput);

        if (result.success) {
          toast.success(result.success);
          onSuccess();
          onClose();
        } else if (result.error) {
          // Handle create errors
          if (result.error.includes('Mã hàng đã tồn tại') || result.error.includes('product code already exists')) {
            form.setError('productCode', {
              type: 'server',
              message: 'Mã hàng này đã được sử dụng'
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
            {isEditMode ? 'Chỉnh sửa Hàng hóa' : 'Thêm Hàng hóa mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Cập nhật thông tin hàng hóa. Nhấn lưu khi hoàn tất.'
              : 'Điền thông tin để tạo hàng hóa mới. Các trường có dấu * là bắt buộc.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Code */}
              <FormField
                control={form.control}
                name="productCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã hàng *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: SP001"
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
                    <FormLabel>Tên hàng *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Gạo ST25"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit */}
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn vị tính *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: kg, lít, thùng"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nhóm hàng *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Thực phẩm, Gia vị"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Base Price */}
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá cơ sở</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="VD: 25000"
                        {...field}
                        disabled={isSubmitting}
                        min="0"
                        step="0.01"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Base Quantity */}
              <FormField
                control={form.control}
                name="baseQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số lượng cơ sở</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="VD: 1000"
                        {...field}
                        disabled={isSubmitting}
                        min="0"
                        step="0.01"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Specification - Full width */}
            <FormField
              control={form.control}
              name="specification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quy cách</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="VD: Gạo ST25 loại 1, bao 25kg, xuất xứ Đồng Tháp"
                      className="min-h-[80px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status - Full width */}
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
                      <SelectItem value="active">Hoạt Động</SelectItem>
                      <SelectItem value="inactive">Tạm Dừng</SelectItem>
                    </SelectContent>
                  </Select>
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