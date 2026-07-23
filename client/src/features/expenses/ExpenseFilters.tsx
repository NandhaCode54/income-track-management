import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCurrency } from '@/hooks/useCurrency';
import { useFamilyMembers } from '@/features/family/family.hooks';
import {
  PAYMENT_METHODS,
  type ExpenseFilters,
  type ExpenseSortField,
} from '@/types/expense.types';
import { PAYMENT_METHOD_LABELS, SORT_LABELS } from './expense.constants';
import { flattenCategories, useExpenseCategories } from './expense.hooks';

interface ExpenseFiltersBarProps {
  filters: ExpenseFilters;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onChange: (patch: Partial<ExpenseFilters>) => void;
  onReset: () => void;
}

/** Anything beyond paging and the default sort counts as "filtered". */
export const hasActiveFilters = (filters: ExpenseFilters, searchTerm = ''): boolean =>
  !!(
    searchTerm ||
    filters.search ||
    filters.categoryId ||
    filters.memberId ||
    filters.paymentMethod ||
    filters.tag ||
    filters.from ||
    filters.to ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined ||
    filters.isRecurring !== undefined ||
    filters.uncategorized
  );

/** The category dropdown carries one extra, non-category option. */
const UNCATEGORIZED = '__uncategorized__';

const ExpenseFiltersBar = ({
  filters,
  searchTerm,
  onSearchChange,
  onChange,
  onReset,
}: ExpenseFiltersBarProps) => {
  const { symbol } = useCurrency();
  const membersQuery = useFamilyMembers();
  const categoriesQuery = useExpenseCategories();

  const members = membersQuery.data ?? [];
  const categories = flattenCategories(categoriesQuery.data ?? []);
  const sortValue = `${filters.sortBy}:${filters.sortOrder}`;

  const categoryValue = filters.uncategorized ? UNCATEGORIZED : (filters.categoryId ?? '');

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label htmlFor="expenseSearch">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="expenseSearch"
              className="pl-9"
              placeholder="Description, notes or tag…"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </div>

        <div className="w-52 space-y-2">
          <Label htmlFor="filterCategory">Category</Label>
          <Select
            id="filterCategory"
            value={categoryValue}
            onChange={(event) => {
              const value = event.target.value;
              // The two are mutually exclusive on the server, so clear the other.
              onChange({
                categoryId: value && value !== UNCATEGORIZED ? value : undefined,
                uncategorized: value === UNCATEGORIZED ? true : undefined,
              });
            }}
          >
            <option value="">All categories</option>
            <option value={UNCATEGORIZED}>Uncategorised</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
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

        <div className="w-44 space-y-2">
          <Label htmlFor="filterMethod">Paid with</Label>
          <Select
            id="filterMethod"
            value={filters.paymentMethod ?? ''}
            onChange={(event) =>
              onChange({
                paymentMethod: (event.target.value || undefined) as ExpenseFilters['paymentMethod'],
              })
            }
          >
            <option value="">Any method</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40 space-y-2">
          <Label htmlFor="filterFrom">From</Label>
          <Input
            id="filterFrom"
            type="date"
            value={filters.from ?? ''}
            max={filters.to || undefined}
            onChange={(event) => onChange({ from: event.target.value || undefined })}
          />
        </div>

        <div className="w-40 space-y-2">
          <Label htmlFor="filterTo">To</Label>
          <Input
            id="filterTo"
            type="date"
            value={filters.to ?? ''}
            min={filters.from || undefined}
            onChange={(event) => onChange({ to: event.target.value || undefined })}
          />
        </div>

        <div className="w-32 space-y-2">
          <Label htmlFor="filterMin">Min ({symbol})</Label>
          <Input
            id="filterMin"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={filters.minAmount ?? ''}
            onChange={(event) =>
              onChange({ minAmount: event.target.value ? Number(event.target.value) : undefined })
            }
          />
        </div>

        <div className="w-32 space-y-2">
          <Label htmlFor="filterMax">Max ({symbol})</Label>
          <Input
            id="filterMax"
            type="number"
            min="0"
            step="0.01"
            placeholder="Any"
            value={filters.maxAmount ?? ''}
            onChange={(event) =>
              onChange({ maxAmount: event.target.value ? Number(event.target.value) : undefined })
            }
          />
        </div>

        <div className="w-40 space-y-2">
          <Label htmlFor="filterTag">Tag</Label>
          <Input
            id="filterTag"
            placeholder="e.g. groceries"
            value={filters.tag ?? ''}
            onChange={(event) => onChange({ tag: event.target.value || undefined })}
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
                sortBy: sortBy as ExpenseSortField,
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

export default ExpenseFiltersBar;
