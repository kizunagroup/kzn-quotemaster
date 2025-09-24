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
  createTeam,
  updateTeam,
} from '@/lib/actions/team.actions';
import {
  createTeamSchema,
  updateTeamSchema,
} from '@/lib/schemas/team.schemas';
import type { Team } from '@/lib/hooks/use-teams';
import { TeamManagerCombobox } from './team-manager-combobox';
import { TeamRegionCombobox } from './team-region-combobox';

// Form validation schemas
const createFormSchema = createTeamSchema;
const updateFormSchema = updateTeamSchema;

// Team type options
const teamTypeOptions = [
  { value: 'KITCHEN', label: 'Nhóm Bếp' },
  { value: 'OFFICE', label: 'Văn Phòng' },
] as const;

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  team?: Team | null; // null for create, Team object for edit
}

export function TeamFormModal({
  isOpen,
  onClose,
  onSuccess,
  team,
}: TeamFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = Boolean(team);

  // Form setup with conditional schema based on mode - INSTANT VALIDATION ENABLED
  const form = useForm<z.infer<typeof createFormSchema> | z.infer<typeof updateFormSchema>>({
    resolver: zodResolver(isEditMode ? updateFormSchema : createFormSchema),
    mode: 'onChange', // Enable instant validation for all fields
    defaultValues: {
      teamCode: '',
      name: '',
      region: '',
      address: '',
      managerId: undefined,
      teamType: 'KITCHEN' as const,
      ...(isEditMode && team && { id: team.id }),
    },
  });

  // Watch teamType to conditionally show/hide teamCode field
  const watchedTeamType = form.watch('teamType');

  // Reset form when modal opens/closes or team changes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && team) {
        // Populate form with team data for editing
        form.reset({
          id: team.id,
          teamCode: team.teamCode || '',
          name: team.name || '',
          region: team.region || '',
          address: team.address || '',
          managerId: team.managerId || undefined,
          teamType: team.teamType as 'KITCHEN' | 'OFFICE',
        });
      } else {
        // Reset form for create mode
        form.reset({
          teamCode: '',
          name: '',
          region: '',
          address: '',
          managerId: undefined,
          teamType: 'KITCHEN' as const,
        });
      }
    }
  }, [isOpen, isEditMode, team, form]);

  // Handle form submission
  const onSubmit = async (values: any) => {
    console.log('🔥 FRONTEND - Form submission started');
    console.log('🔥 FRONTEND - Raw form values:', JSON.stringify(values, null, 2));
    console.log('🔥 FRONTEND - Team type:', values.teamType);
    console.log('🔥 FRONTEND - Is edit mode:', isEditMode);

    setIsSubmitting(true);

    try {
      // Clean up the data for submission
      const submitData = { ...values };
      console.log('🔥 FRONTEND - Initial submitData:', JSON.stringify(submitData, null, 2));

      // Handle teamCode based on team type
      if (submitData.teamType === 'OFFICE') {
        // For OFFICE teams, teamCode should be null/undefined
        console.log('🔥 FRONTEND - OFFICE team detected, setting teamCode to null');
        submitData.teamCode = null;
      } else if (submitData.teamType === 'KITCHEN') {
        console.log('🔥 FRONTEND - KITCHEN team detected, validating teamCode');
        // For KITCHEN teams, teamCode is required and must not be empty
        if (!submitData.teamCode || !submitData.teamCode.trim()) {
          console.log('🔥 FRONTEND - KITCHEN team validation failed: empty teamCode');
          form.setError('teamCode', {
            type: 'manual',
            message: 'Mã nhóm là bắt buộc cho nhóm bếp'
          });
          setIsSubmitting(false);
          return;
        }
        // Ensure teamCode is properly formatted
        console.log('🔥 FRONTEND - KITCHEN team teamCode before formatting:', submitData.teamCode);
        submitData.teamCode = submitData.teamCode.trim().toUpperCase();
        console.log('🔥 FRONTEND - KITCHEN team teamCode after formatting:', submitData.teamCode);
      }

      // Validate required fields
      if (!submitData.name || !submitData.name.trim()) {
        form.setError('name', {
          type: 'manual',
          message: 'Tên nhóm là bắt buộc'
        });
        setIsSubmitting(false);
        return;
      }

      if (!submitData.region || !submitData.region.trim()) {
        form.setError('region', {
          type: 'manual',
          message: 'Khu vực là bắt buộc'
        });
        setIsSubmitting(false);
        return;
      }

      if (!submitData.managerId) {
        form.setError('managerId', {
          type: 'manual',
          message: 'Quản lý là bắt buộc'
        });
        setIsSubmitting(false);
        return;
      }

      console.log('🔥 FRONTEND - Final submitData before API call:', JSON.stringify(submitData, null, 2));
      console.log('🔥 FRONTEND - About to call server action...');

      let result;

      if (isEditMode) {
        // Update existing team
        console.log('🔥 FRONTEND - Calling updateTeam server action');
        result = await updateTeam(submitData);
      } else {
        // Create new team
        console.log('🔥 FRONTEND - Calling createTeam server action');
        result = await createTeam(submitData);
      }

      console.log('🔥 FRONTEND - Server action result:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('🔥 FRONTEND - Success result:', result.success);
        toast.success(result.success);
        onSuccess();
        onClose();
      } else if (result.error) {
        console.log('🔥 FRONTEND - Error result:', result.error);
        // Check for specific field errors and display under respective fields
        if (result.error.includes('Mã nhóm đã tồn tại')) {
          console.log('🔥 FRONTEND - Showing teamCode error');
          form.setError('teamCode', {
            type: 'server',
            message: result.error
          });
        } else {
          // Show general error for other cases
          console.log('🔥 FRONTEND - Showing general error toast');
          toast.error(result.error);
        }
      } else {
        console.log('🔥 FRONTEND - WARNING: No success or error in result!');
        console.log('🔥 FRONTEND - Full result object:', result);
      }
    } catch (error) {
      console.log('🔥 FRONTEND - Catch block - Form submission error:', error);
      console.error('Form submission error:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      console.log('🔥 FRONTEND - Finally block - Setting isSubmitting to false');
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
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Chỉnh sửa Nhóm' : 'Thêm Nhóm mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Cập nhật thông tin nhóm. Nhấn lưu khi hoàn tất.'
              : 'Điền thông tin để tạo nhóm mới. Các trường có dấu * là bắt buộc.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Type Selection */}
              <FormField
                control={form.control}
                name="teamType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại Hình *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting || isEditMode} // Disable in edit mode for data integrity
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại hình nhóm" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teamTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Team Code - Only show for KITCHEN teams */}
              {watchedTeamType === 'KITCHEN' && (
                <FormField
                  control={form.control}
                  name="teamCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã Nhóm *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="VD: BEP001"
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
              )}

              {/* Team Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className={watchedTeamType === 'OFFICE' ? 'md:col-span-1' : ''}>
                    <FormLabel>Tên Nhóm *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          watchedTeamType === 'KITCHEN'
                            ? "VD: Bếp Trung tâm Hà Nội"
                            : "VD: Văn Phòng Trung Tâm"
                        }
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Region Combobox */}
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khu vực *</FormLabel>
                    <FormControl>
                      <TeamRegionCombobox
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Chọn hoặc nhập khu vực..."
                        disabled={isSubmitting}
                      />
                    </FormControl>
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
                    <TeamManagerCombobox
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