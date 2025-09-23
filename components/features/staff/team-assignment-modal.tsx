'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Users, UserMinus, Plus, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import {
  getTeamsForAssignment,
  assignStaffToTeam,
  removeStaffFromTeam,
  getStaffAssignments,
} from '@/lib/actions/staff.actions';
import type { Staff } from '@/lib/hooks/use-staff';
import { TeamCombobox } from './team-combobox';

// Role constants based on team type
const KITCHEN_ROLES = [
  { value: 'KITCHEN_MANAGER', label: 'Quản lý Bếp' },
  { value: 'KITCHEN_STAFF', label: 'Nhân viên Bếp' },
  { value: 'KITCHEN_VIEWER', label: 'Xem Bếp' },
] as const;

const OFFICE_ROLES = [
  { value: 'ADMIN_MANAGER', label: 'Quản lý Văn phòng' },
  { value: 'ADMIN_STAFF', label: 'Nhân viên Văn phòng' },
  { value: 'ADMIN_VIEWER', label: 'Xem Văn phòng' },
  { value: 'PROCUREMENT_MANAGER', label: 'Quản lý Mua sắm' },
  { value: 'PROCUREMENT_STAFF', label: 'Nhân viên Mua sắm' },
  { value: 'ACCOUNTING_MANAGER', label: 'Quản lý Kế toán' },
  { value: 'ACCOUNTING_STAFF', label: 'Nhân viên Kế toán' },
  { value: 'OPERATIONS_MANAGER', label: 'Quản lý Vận hành' },
  { value: 'OPERATIONS_STAFF', label: 'Nhân viên Vận hành' },
] as const;

// Team assignment form schema
const assignmentSchema = z.object({
  teamId: z.string().min(1, 'Vui lòng chọn nhóm'),
  role: z.string().min(1, 'Vui lòng chọn vai trò'),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;


interface TeamAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff: Staff | null;
}

export function TeamAssignmentModal({
  isOpen,
  onClose,
  onSuccess,
  staff,
}: TeamAssignmentModalProps) {
  const [removingAssignment, setRemovingAssignment] = useState<number | null>(null);
  const [selectedTeamType, setSelectedTeamType] = useState<string>('');

  // Local state for current assignments to enable instant UI refresh
  const [currentAssignments, setCurrentAssignments] = useState<Array<{
    id: number;
    teamId: number;
    teamName: string;
    teamType: string;
    role: string;
    joinedAt: Date;
  }>>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Form setup for new assignment
  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      teamId: '',
      role: '',
    },
  });

  const selectedTeamId = form.watch('teamId');

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && staff) {
      refreshAssignments();
    }
  }, [isOpen, staff]);

  // Update selected team type when team changes - we'll need to get this from the combobox
  useEffect(() => {
    if (selectedTeamId) {
      // We'll derive the team type from the selected team ID via the combobox
      // Reset role when team changes
      form.setValue('role', '');
    } else {
      setSelectedTeamType('');
    }
  }, [selectedTeamId, form]);


  // Refresh current assignments
  const refreshAssignments = async () => {
    if (!staff) return;

    setLoadingAssignments(true);
    try {
      const assignments = await getStaffAssignments(staff.id);
      setCurrentAssignments(assignments);
    } catch (error) {
      console.error('Error refreshing assignments:', error);
      toast.error('Có lỗi xảy ra khi tải danh sách phân công');
      setCurrentAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Handle team selection and update team type
  const handleTeamChange = async (teamId: string) => {
    form.setValue('teamId', teamId);

    // Get team type from the server action to determine available roles
    try {
      const teams = await getTeamsForAssignment();
      if (Array.isArray(teams)) {
        const selectedTeam = teams.find(t => t.id.toString() === teamId);
        if (selectedTeam) {
          setSelectedTeamType(selectedTeam.type);
        }
      }
    } catch (error) {
      console.error('Error getting team type:', error);
    }
  };

  // Get available roles based on selected team type
  const getAvailableRoles = () => {
    if (selectedTeamType === 'KITCHEN') {
      return KITCHEN_ROLES;
    } else {
      return OFFICE_ROLES;
    }
  };

  // Handle new assignment submission
  const onSubmit = async (data: AssignmentFormData) => {
    if (!staff) return;

    try {
      const result = await assignStaffToTeam(
        staff.id,
        parseInt(data.teamId),
        data.role
      );

      if (result.success) {
        toast.success(result.success);
        form.reset();
        // Refresh assignments to show new assignment immediately
        await refreshAssignments();
        onSuccess();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error assigning staff to team:', error);
      toast.error('Có lỗi xảy ra khi phân công nhân viên vào nhóm');
    }
  };

  // Handle removing assignment
  const handleRemoveAssignment = async (teamId: number) => {
    if (!staff) return;

    setRemovingAssignment(teamId);
    try {
      const result = await removeStaffFromTeam(staff.id, teamId);

      if (result.success) {
        toast.success(result.success);
        // Refresh assignments to remove assignment from UI immediately
        await refreshAssignments();
        onSuccess();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error removing staff from team:', error);
      toast.error('Có lỗi xảy ra khi xóa phân công nhân viên');
    } finally {
      setRemovingAssignment(null);
    }
  };

  // Handle modal close
  const handleClose = () => {
    form.reset();
    setSelectedTeamType('');
    onClose();
  };

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    const allRoles = [...KITCHEN_ROLES, ...OFFICE_ROLES];
    const roleConfig = allRoles.find(r => r.value === role);
    return roleConfig ? roleConfig.label : role;
  };

  if (!staff) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <DialogTitle>Quản lý Nhóm Làm việc</DialogTitle>
          </div>
          <DialogDescription>
            Quản lý các nhóm làm việc cho nhân viên {staff.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nhóm hiện tại</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAssignments ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Đang tải phân công...</span>
                </div>
              ) : currentAssignments && currentAssignments.length > 0 ? (
                <div className="space-y-3">
                  {currentAssignments.map((assignment) => (
                    <div
                      key={assignment.teamId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{assignment.teamName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Badge variant="secondary">
                              {getRoleDisplayName(assignment.role)}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Từ {new Date(assignment.joinedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.teamId)}
                        disabled={removingAssignment === assignment.teamId}
                        className="text-red-600 hover:text-red-700"
                      >
                        {removingAssignment === assignment.teamId ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang xóa...
                          </>
                        ) : (
                          <>
                            <UserMinus className="mr-2 h-4 w-4" />
                            Xóa
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>Chưa được phân công vào nhóm nào</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Add New Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thêm phân công mới</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Team Selection */}
                    <FormField
                      control={form.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chọn nhóm *</FormLabel>
                          <FormControl>
                            <TeamCombobox
                              value={field.value}
                              onChange={handleTeamChange}
                              placeholder="Chọn nhóm..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Role Selection */}
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chọn vai trò *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedTeamType}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={!selectedTeamType ? "Chọn nhóm trước" : "Chọn vai trò"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getAvailableRoles().map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Đóng
                    </Button>
                    <Button type="submit" disabled={!selectedTeamType}>
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm phân công
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}