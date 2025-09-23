'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, Building2, ChefHat } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { getTeamsForAssignment } from '@/lib/actions/staff.actions';

interface Team {
  id: number;
  name: string;
  type: string;
}

interface TeamComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TeamCombobox({
  value,
  onChange,
  placeholder = "Chọn nhóm...",
  disabled = false,
  className,
}: TeamComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load teams when component mounts
  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getTeamsForAssignment();

      if (Array.isArray(result)) {
        setTeams(result);
      } else {
        setError(result.error || 'Không thể tải danh sách nhóm');
        setTeams([]);
      }
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Có lỗi xảy ra khi tải danh sách nhóm');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter teams based on search query
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    team.type.toLowerCase().includes(search.toLowerCase())
  );

  // Get selected team for display
  const selectedTeam = teams.find((team) => team.id.toString() === value);

  // Get appropriate icon for team type
  const getTeamTypeIcon = (type: string) => {
    switch (type) {
      case 'KITCHEN':
        return <ChefHat className="h-3 w-3" />;
      case 'OFFICE':
      default:
        return <Building2 className="h-3 w-3" />;
    }
  };

  // Get appropriate variant for team type badge
  const getTeamTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'KITCHEN':
        return 'secondary' as const;
      case 'OFFICE':
      default:
        return 'outline' as const;
    }
  };

  // Handle team selection
  const handleSelect = (teamId: string) => {
    onChange(teamId);
    setOpen(false);
    setSearch(''); // Clear search when selection is made
  };

  // Format team display name
  const formatTeamDisplay = (team: Team) => (
    <div className="flex items-center gap-2">
      {getTeamTypeIcon(team.type)}
      <span className="flex-1">{team.name}</span>
      <Badge variant={getTeamTypeBadgeVariant(team.type)} className="text-xs">
        {team.type}
      </Badge>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedTeam && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
        >
          {selectedTeam ? (
            <div className="flex items-center gap-2 min-w-0">
              {getTeamTypeIcon(selectedTeam.type)}
              <span className="truncate">{selectedTeam.name}</span>
              <Badge
                variant={getTeamTypeBadgeVariant(selectedTeam.type)}
                className="text-xs shrink-0"
              >
                {selectedTeam.type}
              </Badge>
            </div>
          ) : (
            <span className="truncate">
              {loading ? "Đang tải..." : placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Tìm kiếm nhóm..."
              value={search}
              onValueChange={setSearch}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <CommandList className="max-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Đang tải danh sách nhóm...
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-6 text-sm">
                <p className="text-destructive mb-2">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTeams}
                  className="text-xs"
                >
                  Thử lại
                </Button>
              </div>
            ) : filteredTeams.length === 0 ? (
              <CommandEmpty>
                {search.trim() ? (
                  <div className="py-6 text-center text-sm">
                    <p className="text-muted-foreground">
                      Không tìm thấy nhóm phù hợp với "{search}"
                    </p>
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm">
                    <p className="text-muted-foreground">Không có nhóm nào</p>
                  </div>
                )}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredTeams.map((team) => (
                  <CommandItem
                    key={team.id}
                    value={team.id.toString()}
                    onSelect={() => handleSelect(team.id.toString())}
                    className="flex items-center gap-2 px-2 py-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selectedTeam?.id === team.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getTeamTypeIcon(team.type)}
                      <span className="truncate flex-1">{team.name}</span>
                      <Badge
                        variant={getTeamTypeBadgeVariant(team.type)}
                        className="text-xs shrink-0"
                      >
                        {team.type}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}