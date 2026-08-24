import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/hooks/useCurrency';
import { toDateInputValue } from '@/utils/formatDate';
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
  assetFormSchema,
  investmentFormSchema,
  liabilityFormSchema,
  type AssetForm,
  type InvestmentForm,
  type LiabilityForm,
} from './portfolio.schemas';
import { useCreatePortfolioItem, useUpdatePortfolioItem } from './portfolio.hooks';

interface PortfolioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PortfolioKind;
  /** When set the dialog edits this row instead of creating one. */
  item?: Investment | Asset | Liability | null;
}

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-sm text-destructive">{message}</p> : null;

const MoneyInput = ({
  id,
  label,
  symbol,
  error,
  registration,
}: {
  id: string;
  label: string;
  symbol: string;
  error?: string;
  registration: Record<string, unknown>;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {symbol}
      </span>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        className="pl-8"
        aria-invalid={!!error}
        {...registration}
      />
    </div>
    <FieldError message={error} />
  </div>
);

const InvestmentFields = ({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Investment | null;
}) => {
  const editing = !!item;
  const { symbol } = useCurrency();
  const create = useCreatePortfolioItem('investment', { onSuccess: () => onOpenChange(false) });
  const update = useUpdatePortfolioItem('investment', { onSuccess: () => onOpenChange(false) });
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvestmentForm>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: {
      type: 'OTHER',
      name: '',
      investedAmount: '',
      currentValue: '',
      units: '',
      purchaseDate: toDateInputValue(new Date()),
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      type: item?.type ?? 'OTHER',
      name: item?.name ?? '',
      investedAmount: item ? String(item.investedAmount) : '',
      currentValue: item ? String(item.currentValue) : '',
      units: item?.units != null ? String(item.units) : '',
      purchaseDate: item
        ? toDateInputValue(new Date(item.purchaseDate))
        : toDateInputValue(new Date()),
      notes: item?.notes ?? '',
    });
  }, [open, item, reset]);

  const onSubmit = (v: InvestmentForm) => {
    const payload = {
      type: v.type,
      name: v.name,
      investedAmount: Number(v.investedAmount),
      currentValue: Number(v.currentValue),
      ...(v.units ? { units: Number(v.units) } : {}),
      purchaseDate: new Date(v.purchaseDate).toISOString(),
      ...(v.notes ? { notes: v.notes } : {}),
    };
    if (editing && item) update.mutate({ id: item.id, payload });
    else create.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit investment' : 'Add an investment'}</DialogTitle>
          <DialogDescription>
            Update the current value whenever you check the market.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invType">Type</Label>
              <Select id="invType" {...register('type')}>
                {Object.entries(INVESTMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invName">Name</Label>
              <Input
                id="invName"
                placeholder="Index fund – growth plan"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              <FieldError message={errors.name?.message} />
            </div>
            <MoneyInput
              id="invInvested"
              label="Invested amount"
              symbol={symbol}
              error={errors.investedAmount?.message}
              registration={register('investedAmount')}
            />
            <MoneyInput
              id="invCurrent"
              label="Current value"
              symbol={symbol}
              error={errors.currentValue?.message}
              registration={register('currentValue')}
            />
            <div className="space-y-2">
              <Label htmlFor="invUnits">Units (optional)</Label>
              <Input
                id="invUnits"
                type="number"
                inputMode="decimal"
                step="0.0001"
                min="0"
                aria-invalid={!!errors.units}
                {...register('units')}
              />
              <FieldError message={errors.units?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invDate">Purchase date</Label>
              <Input
                id="invDate"
                type="date"
                aria-invalid={!!errors.purchaseDate}
                {...register('purchaseDate')}
              />
              <FieldError message={errors.purchaseDate?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invNotes">Notes (optional)</Label>
            <Textarea
              id="invNotes"
              rows={2}
              placeholder="Broker, folio number…"
              aria-invalid={!!errors.notes}
              {...register('notes')}
            />
            <FieldError message={errors.notes?.message} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const AssetFields = ({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Asset | null;
}) => {
  const editing = !!item;
  const { symbol } = useCurrency();
  const create = useCreatePortfolioItem('asset', { onSuccess: () => onOpenChange(false) });
  const update = useUpdatePortfolioItem('asset', { onSuccess: () => onOpenChange(false) });
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetForm>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      type: 'OTHER',
      name: '',
      value: '',
      purchaseValue: '',
      purchaseDate: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      type: item?.type ?? 'OTHER',
      name: item?.name ?? '',
      value: item ? String(item.value) : '',
      purchaseValue: item?.purchaseValue != null ? String(item.purchaseValue) : '',
      purchaseDate: item?.purchaseDate ? toDateInputValue(new Date(item.purchaseDate)) : '',
      description: item?.description ?? '',
    });
  }, [open, item, reset]);

  const onSubmit = (v: AssetForm) => {
    const payload = {
      type: v.type,
      name: v.name,
      value: Number(v.value),
      ...(v.purchaseValue ? { purchaseValue: Number(v.purchaseValue) } : {}),
      ...(v.purchaseDate ? { purchaseDate: new Date(v.purchaseDate).toISOString() } : {}),
      ...(v.description ? { description: v.description } : {}),
    };
    if (editing && item) update.mutate({ id: item.id, payload });
    else create.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit asset' : 'Add an asset'}</DialogTitle>
          <DialogDescription>Things the family owns that hold value.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assetType">Type</Label>
              <Select id="assetType" {...register('type')}>
                {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assetName">Name</Label>
              <Input
                id="assetName"
                placeholder="Honda City"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              <FieldError message={errors.name?.message} />
            </div>
            <MoneyInput
              id="assetValue"
              label="Current value"
              symbol={symbol}
              error={errors.value?.message}
              registration={register('value')}
            />
            <MoneyInput
              id="assetPurchase"
              label="Purchase price (optional)"
              symbol={symbol}
              error={errors.purchaseValue?.message}
              registration={register('purchaseValue')}
            />
            <div className="space-y-2">
              <Label htmlFor="assetDate">Purchased on (optional)</Label>
              <Input id="assetDate" type="date" {...register('purchaseDate')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetDescription">Description (optional)</Label>
            <Textarea
              id="assetDescription"
              rows={2}
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            <FieldError message={errors.description?.message} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const LiabilityFields = ({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Liability | null;
}) => {
  const editing = !!item;
  const { symbol } = useCurrency();
  const create = useCreatePortfolioItem('liability', { onSuccess: () => onOpenChange(false) });
  const update = useUpdatePortfolioItem('liability', { onSuccess: () => onOpenChange(false) });
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LiabilityForm>({
    resolver: zodResolver(liabilityFormSchema),
    defaultValues: {
      type: 'OTHER',
      name: '',
      amount: '',
      interestRate: '',
      dueDate: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      type: item?.type ?? 'OTHER',
      name: item?.name ?? '',
      amount: item ? String(item.amount) : '',
      interestRate: item?.interestRate != null ? String(item.interestRate) : '',
      dueDate: item?.dueDate ? toDateInputValue(new Date(item.dueDate)) : '',
      description: item?.description ?? '',
    });
  }, [open, item, reset]);

  const onSubmit = (v: LiabilityForm) => {
    const payload = {
      type: v.type,
      name: v.name,
      amount: Number(v.amount),
      ...(v.interestRate ? { interestRate: Number(v.interestRate) } : {}),
      ...(v.dueDate ? { dueDate: new Date(v.dueDate).toISOString() } : {}),
      ...(v.description ? { description: v.description } : {}),
    };
    if (editing && item) update.mutate({ id: item.id, payload });
    else create.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit liability' : 'Add a liability'}</DialogTitle>
          <DialogDescription>What is owed — loans, card dues, borrowings.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="liabType">Type</Label>
              <Select id="liabType" {...register('type')}>
                {Object.entries(LIABILITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="liabName">Name</Label>
              <Input
                id="liabName"
                placeholder="Home loan – HDFC"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              <FieldError message={errors.name?.message} />
            </div>
            <MoneyInput
              id="liabAmount"
              label="Outstanding amount"
              symbol={symbol}
              error={errors.amount?.message}
              registration={register('amount')}
            />
            <div className="space-y-2">
              <Label htmlFor="liabRate">Interest rate % (optional)</Label>
              <Input
                id="liabRate"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="99.99"
                aria-invalid={!!errors.interestRate}
                {...register('interestRate')}
              />
              <FieldError message={errors.interestRate?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="liabDue">Due date (optional)</Label>
              <Input id="liabDue" type="date" {...register('dueDate')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="liabDescription">Notes (optional)</Label>
            <Textarea
              id="liabDescription"
              rows={2}
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            <FieldError message={errors.description?.message} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Kind-dispatched create/edit dialog over one shared shell, so all three
 * ledgers get identical behaviour without triplicated page code.
 */
const PortfolioFormDialog = ({ open, onOpenChange, kind, item }: PortfolioFormDialogProps) => {
  if (kind === 'investment')
    return (
      <InvestmentFields
        open={open}
        onOpenChange={onOpenChange}
        item={(item as Investment | null) ?? null}
      />
    );
  if (kind === 'asset')
    return (
      <AssetFields open={open} onOpenChange={onOpenChange} item={(item as Asset | null) ?? null} />
    );
  return (
    <LiabilityFields
      open={open}
      onOpenChange={onOpenChange}
      item={(item as Liability | null) ?? null}
    />
  );
};

export default PortfolioFormDialog;
