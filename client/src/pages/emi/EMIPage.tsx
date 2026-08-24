import { useEffect, useState } from 'react';
import { AlertCircle, Calculator, Landmark, Loader2, Plus, Search } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useCurrency } from '@/hooks/useCurrency';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermission } from '@/hooks/usePermission';
import { getApiErrorMessage } from '@/lib/api-error';
import EmiCalculatorDialog from '@/features/emi/EmiCalculatorDialog';
import EmiFormDialog from '@/features/emi/EmiFormDialog';
import EmiScheduleDialog from '@/features/emi/EmiScheduleDialog';
import EmiStats from '@/features/emi/EmiStats';
import EmiTable from '@/features/emi/EmiTable';
import RecordPaymentDialog from '@/features/emi/RecordPaymentDialog';
import UpcomingEmiPanel from '@/features/emi/UpcomingEmiPanel';
import {
  DEFAULT_PER_PAGE,
  EMI_SORT_LABELS,
  EMI_STATUS_LABELS,
  UPCOMING_WINDOW_DAYS,
} from '@/features/emi/emi.constants';
import { useDeleteEmi, useEmis, useUpcomingEmis } from '@/features/emi/emi.hooks';
import {
  EMI_SORT_FIELDS,
  EMI_STATUSES,
  type Emi,
  type EmiSortField,
  type EmiStatus,
} from '@/types/emi.types';

const EMIPage = () => {
  const { can } = usePermission();
  const { format } = useCurrency();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<EmiStatus | ''>('');
  const [sortBy, setSortBy] = useState<EmiSortField>('startDate');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  // Otherwise a new filter asks for page 4 of a result set that may have one page.
  useEffect(() => setPage(1), [debouncedSearch, status, sortBy]);

  const filters = {
    page,
    perPage: DEFAULT_PER_PAGE,
    sortBy,
    sortOrder: 'desc' as const,
    ...(status ? { status } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const query = useEmis(filters);
  const upcoming = useUpcomingEmis(UPCOMING_WINDOW_DAYS);
  const deleteEmi = useDeleteEmi();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Emi | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [scheduleTargetId, setScheduleTargetId] = useState<string | null>(null);
  const [paymentTargetId, setPaymentTargetId] = useState<string | null>(null);
  const [presetPaymentId, setPresetPaymentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Emi | null>(null);

  const emis = query.data?.emis ?? [];

  /*
   * Dialog targets are resolved from the live query data by id rather than a copy
   * saved into state when the dialog opened — the stale-dialog trap from Phase 4.
   * Recording a payment refetches the list; a held object would still be showing
   * the progress from before the payment landed.
   */
  const scheduleTarget = emis.find((emi) => emi.id === scheduleTargetId) ?? null;
  const paymentTarget = emis.find((emi) => emi.id === paymentTargetId) ?? null;

  const canWrite = can('FINANCE_WRITE');
  const canDelete = can('FINANCE_DELETE');
  const hasFilters = !!debouncedSearch || !!status;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (emi: Emi) => {
    setEditing(emi);
    setFormOpen(true);
  };

  const openPayment = (emiId: string, paymentId?: string) => {
    setPresetPaymentId(paymentId ?? null);
    setPaymentTargetId(emiId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loans & EMIs"
        description="Every loan, its schedule, and what falls due next."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setCalculatorOpen(true)}>
              <Calculator className="h-4 w-4" />
              Calculator
            </Button>
            {canWrite && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add loan
              </Button>
            )}
          </div>
        }
      />

      <EmiStats
        totals={query.data?.totals}
        upcoming={upcoming.data}
        windowDays={UPCOMING_WINDOW_DAYS}
      />

      <UpcomingEmiPanel
        data={upcoming.data}
        windowDays={UPCOMING_WINDOW_DAYS}
        canWrite={canWrite}
        onRecordPayment={(item) => openPayment(item.emiId, item.id)}
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or lender…"
                aria-label="Search loans"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Select
              className="h-10 w-40"
              aria-label="Filter by status"
              value={status}
              onChange={(event) => setStatus(event.target.value as EmiStatus | '')}
            >
              <option value="">All statuses</option>
              {EMI_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {EMI_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>

            <Select
              className="h-10 w-44"
              aria-label="Sort loans"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as EmiSortField)}
            >
              {EMI_SORT_FIELDS.map((value) => (
                <option key={value} value={value}>
                  {EMI_SORT_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>

          {query.data && emis.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {query.data.meta?.total ?? emis.length}
              </span>{' '}
              {(query.data.meta?.total ?? emis.length) === 1 ? 'loan' : 'loans'} ·{' '}
              <span className="font-medium text-foreground">
                {format(query.data.totals.monthlyOutgo)}
              </span>{' '}
              a month
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {query.isPending ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : query.isError ? (
            <EmptyState
              icon={AlertCircle}
              title="Couldn't load your loans"
              description={getApiErrorMessage(query.error)}
            />
          ) : emis.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title={hasFilters ? 'No loans match those filters' : 'No loans yet'}
              description={
                hasFilters
                  ? 'Try a different search, or clear the status filter.'
                  : canWrite
                    ? 'Add a loan and the whole instalment schedule is generated for you — including what falls due next.'
                    : 'A family member can add the household’s loans here.'
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('');
                      setStatus('');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : canWrite ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button onClick={openCreate}>
                      <Plus className="h-4 w-4" />
                      Add loan
                    </Button>
                    <Button variant="outline" onClick={() => setCalculatorOpen(true)}>
                      <Calculator className="h-4 w-4" />
                      Try the calculator
                    </Button>
                  </div>
                ) : undefined
              }
            />
          ) : (
            <>
              <EmiTable
                emis={emis}
                canWrite={canWrite}
                canDelete={canDelete}
                onOpen={(emi) => setScheduleTargetId(emi.id)}
                onEdit={openEdit}
                onDelete={setDeleting}
                onRecordPayment={(emi) => openPayment(emi.id)}
              />
              {query.data?.meta && (
                <Pagination meta={query.data.meta} onPageChange={setPage} label="loans" />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <EmiFormDialog open={formOpen} onOpenChange={setFormOpen} emi={editing} />
      <EmiCalculatorDialog open={calculatorOpen} onOpenChange={setCalculatorOpen} />

      <EmiScheduleDialog
        open={!!scheduleTargetId}
        onOpenChange={(open) => !open && setScheduleTargetId(null)}
        emi={scheduleTarget}
      />

      <RecordPaymentDialog
        open={!!paymentTargetId}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentTargetId(null);
            setPresetPaymentId(null);
          }
        }}
        emi={paymentTarget}
        presetPaymentId={presetPaymentId}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'this loan'}?`}
        description={
          <>
            This removes the loan and its entire payment history —{' '}
            <span className="font-medium">
              {deleting?.progress.paidCount ?? 0} recorded{' '}
              {(deleting?.progress.paidCount ?? 0) === 1 ? 'payment' : 'payments'}
            </span>{' '}
            included. It cannot be undone.
          </>
        }
        confirmLabel="Delete loan"
        destructive
        loading={deleteEmi.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteEmi.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
};

export default EMIPage;
