import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/utils/formatDate';
import type {
  Asset,
  Investment,
  Liability,
  PortfolioKind,
} from '@/types/portfolio.types';
import {
  ASSET_TYPE_LABELS,
  INVESTMENT_TYPE_LABELS,
  LIABILITY_TYPE_LABELS,
} from '@/types/portfolio.types';
import {
  usePortfolioList,
  useRemovePortfolioItem,
} from './portfolio.hooks';
import PortfolioFormDialog from './PortfolioFormDialog';
import NetWorthCard from './NetWorthCard';

type PortfolioItem = Investment | Asset | Liability;

const subtitleFor = (kind: PortfolioKind, item: PortfolioItem): string => {
  if (kind === 'investment') {
    const inv = item as Investment;
    return `Bought ${formatDate(inv.purchaseDate)}${inv.units ? ` · ${inv.units} units` : ''}`;
  }
  if (kind === 'asset') {
    const asset = item as Asset;
    return asset.purchaseDate ? `Owned since ${formatDate(asset.purchaseDate)}` : 'No purchase date';
  }
  const liab = item as Liability;
  return [
    liab.interestRate != null ? `${liab.interestRate}% p.a.` : null,
    liab.dueDate ? `Due ${formatDate(liab.dueDate)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
};

const typeLabelFor = (kind: PortfolioKind, item: PortfolioItem): string => {
  if (kind === 'investment') return INVESTMENT_TYPE_LABELS[(item as Investment).type];
  if (kind === 'asset') return ASSET_TYPE_LABELS[(item as Asset).type];
  return LIABILITY_TYPE_LABELS[(item as Liability).type];
};

/** Gain badge colour follows the sign — green for gains, red for losses. */
const gainBadgeVariant = (gain: number | null) =>
  gain == null ? ('secondary' as const) : gain >= 0 ? ('success' as const) : ('destructive' as const);

interface PortfolioSectionPageProps {
  kind: PortfolioKind;
  title: string;
  singular: string;
  description: string;
  icon: LucideIcon;
}

const PortfolioSectionPage = ({
  kind,
  title,
  singular,
  description,
  icon: Icon,
}: PortfolioSectionPageProps) => {
  const { format } = useCurrency();
  const { can } = usePermission();

  const list = usePortfolioList(kind);
  const removeItem = useRemovePortfolioItem(kind);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [deleting, setDeleting] = useState<PortfolioItem | null>(null);

  const items = list.data ?? [];

  const total = items.reduce((sum, item) => sum + primaryAmount(kind, item), 0);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: PortfolioItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          can('FINANCE_WRITE') ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add {singular}
            </Button>
          ) : undefined
        }
      />

      <NetWorthCard />

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
            <span className="text-muted-foreground">{items.length} recorded</span>
            <span className="font-semibold">{format(total)}</span>
          </div>

          {list.isPending ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Icon}
              title={`No ${title.toLowerCase()} yet`}
              description={`Add a ${singular} to start tracking it here.`}
            />
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {typeLabelFor(kind, item)} · {subtitleFor(kind, item)}
                    </p>
                  </div>

                  {kind === 'investment' && (
                    <>
                      <Badge variant={gainBadgeVariant((item as Investment).gainPercent)}>
                        {(item as Investment).gainPercent == null
                          ? 'No gain data'
                          : `${(item as Investment).gainAmount >= 0 ? '+' : ''}${(item as Investment).gainAmount.toFixed(2)} (${(item as Investment).gainPercent!.toFixed(1)}%)`}
                      </Badge>
                      <div className="text-right">
                        <p className="font-semibold">{format((item as Investment).currentValue)}</p>
                        <p className="text-xs text-muted-foreground">
                          invested {format((item as Investment).investedAmount)}
                        </p>
                      </div>
                    </>
                  )}

                  {kind === 'asset' && (
                    <div className="text-right">
                      <p className="font-semibold">{format((item as Asset).value)}</p>
                      {(item as Asset).purchaseValue != null && (
                        <p className="text-xs text-muted-foreground">
                          paid {format((item as Asset).purchaseValue!)}
                        </p>
                      )}
                    </div>
                  )}

                  {kind === 'liability' && (
                    <div className="text-right">
                      <p className="font-semibold text-destructive">{format((item as Liability).amount)}</p>
                    </div>
                  )}

                  {can('FINANCE_WRITE') && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(item)}
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}

                  {can('FINANCE_DELETE') && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleting(item)}
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {can('FINANCE_WRITE') && (
        <PortfolioFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          kind={kind}
          item={editing}
        />
      )}

      {can('FINANCE_DELETE') && (
        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={`Delete this ${singular}?`}
          description={
            deleting
              ? `"${deleting.name}" will be removed for everyone in the family.`
              : undefined
          }
          confirmLabel="Delete"
          destructive
          loading={removeItem.isPending}
          onConfirm={() => {
            if (!deleting) return;
            removeItem.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
          }}
        />
      )}
    </div>
  );
};

const primaryAmount = (kind: PortfolioKind, item: PortfolioItem): number => {
  if (kind === 'investment') return (item as Investment).currentValue;
  if (kind === 'asset') return (item as Asset).value;
  return (item as Liability).amount;
};

export default PortfolioSectionPage;
