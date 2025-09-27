"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Plus, Settings2 } from "lucide-react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TeamCombobox } from "@/components/features/staff/team-combobox";
import { getStaffDepartments } from "@/lib/actions/staff.actions";
import type { Staff } from "@/lib/hooks/use-staff";


// Single source of truth for status options
const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Hoạt Động" },
  { value: "inactive", label: "Tạm Dừng" },
  { value: "terminated", label: "Đã Nghỉ" },
] as const;

// Department display mapping for Vietnamese labels
const getDepartmentDisplay = (department: string): string => {
  switch (department.toUpperCase()) {
    case 'ADMIN':
      return 'Quản Trị';
    case 'BEP':
      return 'Bếp';
    case 'KE_TOAN':
      return 'Kế Toán';
    case 'KINH_DOANH':
      return 'Kinh Doanh';
    case 'NHAN_SU':
      return 'Nhân Sự';
    case 'PHAT_TRIEN_KINH_DOANH':
      return 'Phát Triển Kinh Doanh';
    case 'SAN_XUAT':
      return 'Sản Xuất';
    case 'TONG_VU':
      return 'Tổng Vụ';
    default:
      return department;
  }
};

// Team options - this could be dynamically loaded in the future
const teamOptions = [
  { value: "all", label: "Tất cả nhóm" },
  // Additional team options will be populated dynamically
] as const;

interface StaffTableToolbarProps {
  // Search props
  searchValue?: string;
  onSearchChange: (value: string) => void;

  // Filter props
  selectedDepartment?: string;
  onDepartmentChange: (value: string) => void;
  selectedStatus?: string;
  onStatusChange: (value: string) => void;
  selectedTeam?: string;
  onTeamChange: (value: string) => void;

  // Filter state
  onClearFilters: () => void;
  hasActiveFilters: boolean;

  // Table instance for column visibility
  table: Table<Staff>;

  // Actions
  onCreateClick: () => void;
}

export function StaffTableToolbar({
  searchValue = "",
  onSearchChange,
  selectedDepartment = "all",
  onDepartmentChange,
  selectedStatus = "all",
  onStatusChange,
  selectedTeam = "all",
  onTeamChange,
  onClearFilters,
  hasActiveFilters,
  table,
  onCreateClick,
}: StaffTableToolbarProps) {
  // Local state for search input to enable debouncing
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);

  // Department state - dynamic loading from database
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  // Debounce the search value to prevent API calls on every keystroke
  const [debouncedSearchValue] = useDebounce(localSearchValue, 300);

  // Sync local search value with external prop when it changes
  useEffect(() => {
    setLocalSearchValue(searchValue);
  }, [searchValue]);

  // Trigger API call when debounced value changes
  useEffect(() => {
    if (debouncedSearchValue !== searchValue) {
      onSearchChange(debouncedSearchValue);
    }
  }, [debouncedSearchValue, searchValue, onSearchChange]);

  // Fetch departments when component mounts
  useEffect(() => {
    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      try {
        const result = await getStaffDepartments();
        if (Array.isArray(result)) {
          setDepartments(result);
        } else {
          console.error("Failed to fetch departments:", result.error);
          setDepartments([]);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
        setDepartments([]);
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // Handle local search input change
  const handleLocalSearchChange = (value: string) => {
    setLocalSearchValue(value);
  };

  // Build department options dynamically
  const departmentOptions = [
    { value: 'all', label: 'Tất cả phòng ban' },
    ...departments.map(department => ({
      value: department,
      label: getDepartmentDisplay(department),
    })),
  ];

  return (
    <DataTableToolbar
      searchValue={localSearchValue}
      searchPlaceholder="Tìm kiếm theo tên, email, mã nhân viên..."
      onSearchChange={handleLocalSearchChange}
      onClearFilters={onClearFilters}
      hasActiveFilters={hasActiveFilters}
      actions={
        <div className="flex items-center gap-2">
          {/* Column Visibility Toggle */}
          <TooltipProvider>
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 hidden lg:flex"
                    >
                      <Settings2 className="h-4 w-4" />
                      <span className="sr-only">Ẩn/hiện cột</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent align="end" className="w-[150px]">
                  <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter(
                      (column) =>
                        typeof column.accessorFn !== "undefined" &&
                        column.getCanHide()
                    )
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {getColumnDisplayName(column.id)}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent>
                <p>Ẩn/hiện cột</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Create Button */}
          <Button onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm Nhân viên
          </Button>
        </div>
      }
    >
      {/* Department Filter - Dynamic Loading */}
      <Select
        value={selectedDepartment}
        onValueChange={onDepartmentChange}
        disabled={departmentsLoading}
      >
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder={departmentsLoading ? "Đang tải..." : "Phòng ban"} />
        </SelectTrigger>
        <SelectContent>
          {departmentOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Team Filter - mirror department filter pattern */}
      <TeamCombobox
        value={selectedTeam === "all" ? "" : selectedTeam}
        onChange={(value: string) => {
          onTeamChange(value || "all");
        }}
        placeholder="Tất cả nhóm"
        className="h-8 w-[180px]"
      />
    </DataTableToolbar>
  );
}

// Helper function to get display names for columns
function getColumnDisplayName(columnId: string): string {
  const columnNames: Record<string, string> = {
    employeeCode: "Mã NV",
    name: "Tên Nhân Viên",
    email: "Email",
    phone: "Điện Thoại",
    jobTitle: "Chức Danh",
    department: "Phòng Ban",
    currentTeams: "Nhóm Làm Việc",
    hireDate: "Ngày Vào Làm",
    status: "Trạng Thái",
  };

  return columnNames[columnId] || columnId;
}

// Export options for use in other components
export { statusOptions, teamOptions };
