'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';

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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import {
  createKitchen,
  updateKitchen,
  getRegions,
} from '@/lib/actions/kitchen.actions';
import {
  createKitchenSchema,
  updateKitchenSchema,
} from '@/lib/schemas/kitchen.schemas';
import type { Kitchen } from '@/lib/hooks/use-kitchens';
import { ManagerCombobox } from './manager-combobox';
import { cn } from '@/lib/utils';

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
  const [regions, setRegions] = useState<string[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [regionComboboxOpen, setRegionComboboxOpen] = useState(false);
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
      ...(isEditMode && kitchen && { id: kitchen.id }),
    },
  });

  // Fetch regions when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchRegions = async () => {
        setRegionsLoading(true);
        try {
          const result = await getRegions();
          if (Array.isArray(result)) {
            setRegions(result);
          } else {
            console.error('Failed to fetch regions:', result.error);
            setRegions([]);
          }
        } catch (error) {
          console.error('Error fetching regions:', error);
          setRegions([]);
        } finally {
          setRegionsLoading(false);
        }
      };

      fetchRegions();
    }
  }, [isOpen]);

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
        });
      } else {
        // Reset form for create mode
        form.reset({
          kitchenCode: '',
          name: '',
          region: '',
          address: '',
          managerId: undefined,
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

              {/* Region Combobox */}
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khu vực *</FormLabel>
                    <Popover open={regionComboboxOpen} onOpenChange={setRegionComboboxOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={regionComboboxOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting || regionsLoading}
                          >
                            {regionsLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang tải...
                              </>
                            ) : (
                              field.value || "Chọn hoặc nhập khu vực..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Tìm kiếm hoặc nhập khu vực mới..."
                            value={field.value}
                            onValueChange={(searchValue) => {
                              field.onChange(searchValue);
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="py-3 px-2 text-sm">
                                Không tìm thấy khu vực. Nhập để tạo mới.
                              </div>
                            </CommandEmpty>
                            {regions.length > 0 && (
                              <CommandGroup>
                                {regions.map((region) => (
                                  <CommandItem
                                    key={region}
                                    value={region}
                                    onSelect={(currentValue) => {
                                      field.onChange(currentValue);
                                      setRegionComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === region ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {region}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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