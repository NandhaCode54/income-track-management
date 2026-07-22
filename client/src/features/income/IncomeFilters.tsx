import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useFamilyMembers } from '@/features/family/family.hooks';
import { INCOME_TYPES, type IncomeFilters, type IncomeSortField } from '@/types/income.types';
import { INCOME_TYPE_LABELS, SORT_LABELS } from './income.constants';

interface IncomeFiltersBarProps {
  filters: IncomeFilters;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onChange: (patch: Partial<IncomeFilters>) => void;
  onReset: () => void;
}

/** Anything beyond paging and the default sort counts as "filtered". */
const hasActiveFilters = (filters: IncomeFilters, searchTerm: string): boolean =>
  !!(
    searchTerm ||
    filters.type ||
    filters.memberId ||
    filters.from ||
    filters.to ||
    filters.isRecurring !== undefined
  );

const IncomeFiltersBar = ({
  filters,
  searchTerm,
  onSearchChange,
  onChange,
  onReset,
}: IncomeFiltersBarProps) => {
  const membersQuery = useFamilyMembers();
  const members = membersQuery.data ?? [];
  const sortValue = `${filters.sortBy}:${filters.sortOrder}`;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label htmlFor="incomeSearch">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="incomeSearch"
              className="pl-9"
              placeholder="Description or notes…"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </div>

        <div className="w-40 space-y-2">
          <Label htmlFor="filterType">Type</Label>
          <Select
            id="filterType"
            value={filters.type ?? ''}
            onChange={(event) =>
              onChange({ type: (event.target.value || undefined) as IncomeFilters['type'] })
            }
          >
            <option value="">All types</option>
            {INCOME_TYPES.map((type) => (
              <option key={type} value={type}>
                {INCOME_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-44 space-y-2">
          <Label htmlFor="filterMember">Member</Label>
          <Select
            id="filterMember"
            value={filters.memberId ?? ''}
            onChange={(event) => onChange({ memberId: event.target.value || undefined })}
          >
            <option value="">Everyone</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.user.firstName} {member.user.lastName}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-40 space-y-2">
          <Label htmlFor="filterRecurring">Repeats</Label>
          <Select
            id="filterRecurring"
            value={filters.isRecurring === undefined ? '' : String(filters.isRecurring)}
            onChange={(event) =>
              onChange({
                isRecurring: event.target.value === '' ? undefined : event.target.value === 'true',
              })
            }
          >
            <option value="">All entries</option>
            <option value="true">Recurring only</option>
            <option value="false">One-off only</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44 space-y-2">
          <Label htmlFor="filterFrom">From</Label>
          <Input
            id="filterFrom"
            type="date"
            value={filters.from ?? ''}
            max={filters.to || undefined}
            onChange={(event) => onChange({ from: event.target.value || undefined })}
          />
        </div>

        <div className="w-44 space-y-2">
          <Label htmlFor="filterTo">To</Label>
          <Input
            id="filterTo"
            type="date"
            value={filters.to ?? ''}
            min={filters.from || undefined}
            onChange={(event) => onChange({ to: event.target.value || undefined })}
          />
        </div>

        <div className="w-48 space-y-2">
          <Label htmlFor="filterSort">Sort by</Label>
          <Select
            id="filterSort"
            value={sortValue}
            onChange={(event) => {
              const [sortBy, sortOrder] = event.target.value.split(':');
              onChange({
                sortBy: sortBy as IncomeSortField,
                sortOrder: sortOrder as 'asc' | 'desc',
              });
            }}
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {hasActiveFilters(filters, searchTerm) && (
          <Button variant="ghost" onClick={onReset}>
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
};

export default IncomeFiltersBar;
