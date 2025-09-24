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
  getTeamById,
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
  const [isLoadingTeamData, setIsLoadingTeamData] = useState(false);
  const [managerData, setManagerData] = useState<{ id: number; name: string; email: string } | null>(null);
  const isEditMode = Boolean(team);

  // Form setup with conditional schema based on mode - CONSISTENT VALIDATION STANDARD
  const form = useForm<z.infer<typeof createFormSchema> | z.infer<typeof updateFormSchema>>({
    resolver: zodResolver(isEditMode ? updateFormSchema : createFormSchema),
    mode: 'onChange', // ARCHITECTURAL STANDARD: instant validation for all forms
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
        // Load complete team data including manager details for editing
        loadCompleteTeamData();
      } else {
        // Reset form for create mode
        setManagerData(null);
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
  }, [isOpen, isEditMode, team]);

  // Load complete team data with manager details
  const loadCompleteTeamData = async () => {
    if (!team?.id) return;

    setIsLoadingTeamData(true);
    try {
      const result = await getTeamById(team.id);

      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      // Set manager data for the combobox initialValue
      setManagerData(result.manager);

      // Populate form with complete team data
      form.reset({
        id: result.id,
        teamCode: result.teamCode || '',
        name: result.name || '',
        region: result.region || '',
        address: result.address || '',
        managerId: result.managerId || undefined,
        teamType: result.teamType as 'KITCHEN' | 'OFFICE',
      });
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Có lỗi xảy ra khi tải thông tin nhóm');
    } finally {
      setIsLoadingTeamData(false);
    }
  };

  // Handle form submission - SIMPLIFIED with discriminatedUnion validation
  const onSubmit = async (values: any) => {
    setIsSubmitting(true);

    try {
      // Clean up the data for submission - discriminatedUnion handles validation
      const submitData = { ...values };

      // For OFFICE teams, ensure teamCode is undefined (not empty string)
      if (submitData.teamType === 'OFFICE') {
        submitData.teamCode = undefined;
      }

      let result;

      if (isEditMode) {
        result = await updateTeam(submitData);
      } else {
        result = await createTeam(submitData);
      }

      if (result.success) {
        toast.success(result.success);
        onSuccess();
        onClose();
      } else if (result.error) {
        // Check for specific field errors and display under respective fields
        if (result.error.includes('Mã nhóm đã tồn tại') || result.error.includes('teamCode')) {
          form.setError('teamCode', {
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

        {isLoadingTeamData ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Đang tải thông tin nhóm...</span>
          </div>
        ) : (
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
                      disabled={isSubmitting || isLoadingTeamData}
                      initialValue={managerData}
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
        )}
      </DialogContent>
    </Dialog>
  );
}