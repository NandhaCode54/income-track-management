import { Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDate, formatRelative } from '@/utils/formatDate';
import { FREQUENCY_LABELS, INCOME_TYPE_LABELS } from './income.constants';
import { useRecurringIncome } from './income.hooks';

/**
 * Recurring entries and their next derived due date. Nothing is auto-created yet —
 * the scheduler that materialises occurrences arrives with the reminders phase.
 */
const RecurringIncomePanel = () => {
  const { format } = useCurrency();
  const { data, isLoading } = useRecurringIncome();
  const entries = data ?? [];

  if (isLoading || entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Repeat className="h-4 w-4 text-muted-foreground" />
          Recurring income
        </CardTitle>
        <CardDescription>
          {entries.length === 1 ? '1 entry repeats' : `${entries.length} entries repeat`} on a
          schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-medium">
                {entry.description || INCOME_TYPE_LABELS[entry.type]}
              </p>
              <Badge variant="secondary">
                {entry.frequency ? FREQUENCY_LABELS[entry.frequency] : '—'}
              </Badge>
            </div>
            <p className="mt-2 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {format(entry.amount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.nextOccurrence
                ? `Next ${formatRelative(entry.nextOccurrence)} · ${formatDate(entry.nextOccurrence)}`
                : `Last received ${formatDate(entry.date)}`}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RecurringIncomePanel;
