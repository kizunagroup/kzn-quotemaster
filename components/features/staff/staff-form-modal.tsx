'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';

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
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  createStaff,
  updateStaff,
} from '@/lib/actions/staff.actions';
import {
  createStaffSchema,
  updateStaffSchema,
  type CreateStaffInput,
  type UpdateStaffInput,
} from '@/lib/schemas/staff.schemas';
import type { Staff } from '@/lib/hooks/use-staff';
import { DepartmentCombobox } from './department-combobox';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff?: Staff | null; // null for create, Staff object for edit
}

export function StaffFormModal({
  isOpen,
  onClose,
  onSuccess,
  staff,
}: StaffFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const isEditMode = Boolean(staff);

  // Form setup with conditional schema based on mode
  const form = useForm<CreateStaffInput | UpdateStaffInput>({
    resolver: zodResolver(isEditMode ? updateStaffSchema : createStaffSchema),
    mode: 'onChange', // Enable instant validation for all fields
    defaultValues: {
      employeeCode: '',
      name: '',
      email: '',
      phone: '',
      jobTitle: '',
      department: '',
      hireDate: '',
      ...(isEditMode && staff && {
        id: staff.id,
      }),
    },
  });

  // Reset form when modal opens/closes or staff changes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && staff) {
        // Populate form with staff data for editing
        const hireDateString = staff.hireDate
          ? new Date(staff.hireDate).toISOString().split('T')[0]
          : '';

        form.reset({
          id: staff.id,
          employeeCode: staff.employeeCode || '',
          name: staff.name || '',
          email: staff.email || '',
          phone: staff.phone || '',
          jobTitle: staff.jobTitle || '',
          department: staff.department || '',
          hireDate: hireDateString,
        });
      } else {
        // Reset form for create mode
        form.reset({
          employeeCode: '',
          name: '',
          email: '',
          phone: '',
          jobTitle: '',
          department: '',
          hireDate: '',
        });
      }
    }
  }, [isOpen, isEditMode, staff, form]);

  // Handle form submission
  const onSubmit = async (values: CreateStaffInput | UpdateStaffInput) => {
    setIsSubmitting(true);

    try {
      let result;

      if (isEditMode) {
        // Update existing staff
        result = await updateStaff(values as UpdateStaffInput);

        if (result.success) {
          toast.success(result.success);
          onSuccess();
          onClose();
        } else if (result.error) {
          // Handle update errors
          if (result.error.includes('Email đã tồn tại') || result.error.includes('email already exists')) {
            form.setError('email', {
              type: 'server',
              message: 'Email này đã được sử dụng'
            });
          } else if (result.error.includes('Mã nhân viên đã tồn tại') || result.error.includes('employee code already exists')) {
            form.setError('employeeCode', {
              type: 'server',
              message: 'Mã nhân viên này đã được sử dụng'
            });
          } else {
            toast.error(result.error);
          }
        }
      } else {
        // Create new staff
        result = await createStaff(values as CreateStaffInput);

        if (result.success && result.tempPassword) {
          // Set temporary password to trigger confirmation modal
          setTempPassword(result.tempPassword);
          onSuccess();
          // Don't close the modal yet - let user see the password first
        } else if (result.error) {
          // Handle create errors
          if (result.error.includes('Email đã tồn tại') || result.error.includes('email already exists')) {
            form.setError('email', {
              type: 'server',
              message: 'Email này đã được sử dụng'
            });
          } else if (result.error.includes('Mã nhân viên đã tồn tại') || result.error.includes('employee code already exists')) {
            form.setError('employeeCode', {
              type: 'server',
              message: 'Mã nhân viên này đã được sử dụng'
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

  // Handle copy to clipboard
  const handleCopyPassword = async () => {
    if (tempPassword) {
      try {
        await navigator.clipboard.writeText(tempPassword);
        setIsCopied(true);
        toast.success('Mật khẩu đã được sao chép');

        // Reset copy status after 2 seconds
        setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy password:', error);
        toast.error('Không thể sao chép mật khẩu');
      }
    }
  };

  // Handle confirmation modal close
  const handleConfirmationClose = () => {
    setTempPassword(null);
    setIsCopied(false);
    form.reset();
    onClose();
  };

  // Handle modal close with data loss prevention
  const handleClose = () => {
    if (!isSubmitting) {
      // Check if form has been modified
      const isDirty = form.formState.isDirty;

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
          // Prevent closing when clicking outside if form is dirty
          if (form.formState.isDirty) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Chỉnh sửa Nhân viên' : 'Thêm Nhân viên mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Cập nhật thông tin nhân viên. Nhấn lưu khi hoàn tất.'
              : 'Điền thông tin để tạo nhân viên mới. Các trường có dấu * là bắt buộc.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee Code */}
              <FormField
                control={form.control}
                name="employeeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã Nhân viên</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: NV001"
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
                    <FormLabel>Tên Nhân viên *</FormLabel>
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
                        placeholder="VD: nguyen.van.a@company.com"
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

              {/* Job Title */}
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chức danh</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Trưởng phòng"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Department */}
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phòng ban *</FormLabel>
                    <FormControl>
                      <DepartmentCombobox
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Chọn phòng ban..."
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hire Date */}
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày vào làm</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

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

      {/* Temporary Password Confirmation Modal */}
      <AlertDialog open={tempPassword !== null}>
        <AlertDialogContent className="sm:max-w-[450px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Tạo nhân viên thành công
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Nhân viên đã được tạo thành công. Mật khẩu tạm thời đã được tạo cho tài khoản này.
              </p>

              <div className="bg-muted p-4 rounded-lg border">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Mật khẩu tạm thời:
                </div>
                <div className="font-mono text-lg font-bold bg-background p-2 rounded border select-all">
                  {tempPassword}
                </div>
              </div>

              <p className="text-sm text-orange-600">
                <strong>Lưu ý quan trọng:</strong> Vui lòng sao chép mật khẩu này và gửi cho nhân viên.
                Họ cần sử dụng mật khẩu này để đăng nhập lần đầu và thay đổi mật khẩu mới.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCopyPassword}
              className="flex items-center gap-2"
            >
              {isCopied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Sao chép
                </>
              )}
            </Button>
            <Button onClick={handleConfirmationClose}>
              Đóng
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}