import { useState } from 'react';
import { CalendarClock, Check, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Pagination from '@/components/common/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/utils/formatDate';
import type { PaginationMeta } from '@/types/api.types';
import type {
  PaymentItem,
  PaymentKind,
  PaymentStatus,
} from '@/types/payments.types';
import { PAYMENT_STATUS_LABELS, BILL_TYPE_LABELS } from '@/types/payments.types';
import { usePaymentsList, useRemovePayment } from './payments.hooks';
import PaymentFormDialog from './PaymentFormDialog';
import RecordPaymentDialog from './RecordPaymentDialog';

export type PaymentSectionKind = 'bills' | 'rent' | 'school-fees';

const SECTION_TO_KIND: Record<PaymentSectionKind, PaymentKind> = {
  bills: 'bill',
  rent: 'rent',
  'school-fees': 'schoolFee',
};

const SECTIONS: Record<PaymentSectionKind, { title: string; singular: string; description: string }> = {
  bills: {
    title: 'Bills',
    singular: 'bill',
    description: 'Track household bills and mark them paid when they clear.',
  },
  rent: {
    title: 'Rent',
    singular: 'rent payment',
    description: 'Keep monthly rent obligations and their payment status together.',
  },
  'school-fees': {
    title: 'School Fees',
    singular: 'school fee',
    description: "Track each student's term fees and due dates.",
  },
};

const nameOf = (item: PaymentItem) =>
  item.kind === 'bill' ? item.name : item.kind === 'rent' ? item.propertyName : item.studentName;

const subtitleOf = (item: PaymentItem) => {
  if (item.kind === 'bill') return BILL_TYPE_LABELS[item.type] + (item.providerName ? ` · ${item.providerName}` : '');
  if (item.kind === 'rent') return `Due day ${item.dueDay} · ${item.month}/${item.year}`;
  return [item.school, item.class].filter(Boolean).join(' · ');
};

interface PaymentTrackerPageProps {
  kind: PaymentSectionKind;
}

const PER_PAGE = 20;

const PaymentTrackerPage = ({ kind }: PaymentTrackerPageProps) => {
  const section = SECTIONS[kind];
  const paymentKind = SECTION_TO_KIND[kind];
  const { format } = useCurrency();
  const { can } = usePermission();

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentItem | null>(null);
  const [paying, setPaying] = useState<PaymentItem | null>(null);
  const [deleting, setDeleting] = useState<PaymentItem | null>(null);

  const query = usePaymentsList(paymentKind, {
    status: (statusFilter || undefined) as PaymentStatus | undefined,
    page,
    perPage: PER_PAGE,
  });
  const removePayment = useRemovePayment(paymentKind);

  const items = query.data?.items ?? [];
  const meta: PaginationMeta | undefined = query.data?.meta;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: PaymentItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={section.title}
        description={section.description}
        actions={
          can('FINANCE_WRITE') ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add {section.singular}
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="p-4">
          <Select
            className="w-44"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1); // A new filter starts a new first page.
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {(Object.entries(PAYMENT_STATUS_LABELS) as [string, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {query.isPending ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title={`No ${section.title.toLowerCase()} yet`}
              description={`Add a ${section.singular} to start tracking it.`}
            />
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{nameOf(item)}</p>
                    <p className="text-sm text-muted-foreground">
                      {subtitleOf(item)} · Due {formatDate(item.dueDate)}
                      {item.paidDate ? ` · Paid ${formatDate(item.paidDate)}` : ''}
                    </p>
                  </div>

                  <span className="font-semibold">{format(item.amount)}</span>

                  <Badge
                    variant={
                      item.status === 'PAID'
                        ? 'success'
                        : item.status === 'OVERDUE'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {PAYMENT_STATUS_LABELS[item.status]}
                  </Badge>

                  {can('FINANCE_WRITE') && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)} aria-label={`Edit ${nameOf(item)}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {item.status !== 'PAID' && item.status !== 'WAIVED' && (
                        <Button size="sm" variant="outline" onClick={() => setPaying(item)}>
                          <Check className="h-4 w-4" />
                          Settle
                        </Button>
                      )}
                    </>
                  )}

                  {can('FINANCE_DELETE') && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleting(item)}
                      aria-label={`Delete ${nameOf(item)}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <Pagination meta={meta} onPageChange={setPage} label={section.title.toLowerCase()} />
          )}
        </CardContent>
      </Card>

      <PaymentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        kind={paymentKind}
        item={editing}
      />

      {can('FINANCE_WRITE') && (
        <RecordPaymentDialog
          open={!!paying}
          onOpenChange={(open) => !open && setPaying(null)}
          kind={paymentKind}
          item={paying}
        />
      )}

      {can('FINANCE_DELETE') && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={`Delete this ${section.singular}?`}
          description={
            deleting ? `"${nameOf(deleting)}" will be removed for everyone in the family.` : undefined
          }
          confirmLabel="Delete"
          destructive
          loading={removePayment.isPending}
          onConfirm={() => {
            if (!deleting) return;
            removePayment.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
          }}
        />
      )}
    </div>
  );
};

export default PaymentTrackerPage;
