import { CalendarClock, IndianRupee, ListTree, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDate } from '@/utils/formatDate';
import EmiProgressBar from './EmiProgressBar';
import { EMI_STATUS_LABELS, EMI_STATUS_STYLES } from './emi.constants';
import type { Emi } from '@/types/emi.types';

interface EmiTableProps {
  emis: Emi[];
  canWrite: boolean;
  canDelete: boolean;
  onOpen: (emi: Emi) => void;
  onEdit: (emi: Emi) => void;
  onDelete: (emi: Emi) => void;
  onRecordPayment: (emi: Emi) => void;
}

/**
 * One card per loan rather than a dense table row.
 *
 * A loan carries too much at once — terms, progress, arrears, what is next — to
 * read across a row on a phone without either truncating or scrolling
 * horizontally. The progress bar is the point of the list, and a bar inside a
 * table cell is unreadable at any width.
 */
const EmiTable = ({
  emis,
  canWrite,
  canDelete,
  onOpen,
  onEdit,
  onDelete,
  onRecordPayment,
}: EmiTableProps) => {
  const { format } = useCurrency();

  return (
    <ul className="divide-y">
      {emis.map((emi) => {
        const behind = emi.progress.overdueCount > 0;

        return (
          <li key={emi.id} className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* The name opens the schedule — the row's primary action gets
                      the row's primary label rather than a separate "view" icon. */}
                  <button
                    type="button"
                    onClick={() => onOpen(emi)}
                    className="truncate text-left font-medium hover:underline"
                  >
                    {emi.name}
                  </button>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-xs font-medium',
                      EMI_STATUS_STYLES[emi.status],
                    )}
                  >
                    {EMI_STATUS_LABELS[emi.status]}
                  </span>
                  {behind && <Badge variant="destructive">In arrears</Badge>}
                </div>

                <p className="text-sm text-muted-foreground">
                  {emi.lenderName ? `${emi.lenderName} · ` : ''}
                  {format(emi.loanAmount)} at {emi.interestRate}% for {emi.tenureMonths} months
                </p>
              </div>

              <div className="text-right">
                <p className="font-semibold tabular-nums">{format(emi.monthlyEMI)}</p>
                <p className="text-xs text-muted-foreground">on the {emi.dueDay}
                  {ordinalSuffix(emi.dueDay)} each month</p>
              </div>
            </div>

            <EmiProgressBar progress={emi.progress} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {emi.progress.nextDueDate ? (
                  <>
                    <CalendarClock className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                    Next {format(emi.progress.nextDueAmount ?? 0)} on{' '}
                    {formatDate(emi.progress.nextDueDate)}
                  </>
                ) : (
                  <>Ends {formatDate(emi.endDate)} · {format(emi.totalInterest)} interest in total</>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => onOpen(emi)}>
                  <ListTree className="h-4 w-4" />
                  Schedule
                </Button>
                {canWrite && emi.progress.nextDueDate && (
                  <Button variant="outline" size="sm" onClick={() => onRecordPayment(emi)}>
                    <IndianRupee className="h-4 w-4" />
                    Record payment
                  </Button>
                )}
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${emi.name}`}
                    onClick={() => onEdit(emi)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${emi.name}`}
                    onClick={() => onDelete(emi)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

/** 1st, 2nd, 3rd, 4th — 11th–13th are the exceptions that catch a naive version. */
const ordinalSuffix = (day: number): string => {
  if (day >= 11 && day <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th';
};

export default EmiTable;
