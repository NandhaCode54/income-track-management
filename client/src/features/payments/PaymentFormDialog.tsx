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
  Bill,
  PaymentItem,
  PaymentKind,
  Rent,
  SchoolFee,
} from '@/types/payments.types';
import { BILL_TYPE_LABELS, FREQUENCY_LABELS } from '@/types/payments.types';
import {
  billFormSchema,
  rentFormSchema,
  schoolFeeFormSchema,
  type BillForm,
  type RentForm,
  type SchoolFeeForm,
} from './payments.schemas';
import { useCreatePayment, useUpdatePayment } from './payments.hooks';

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PaymentKind;
  /** When set the dialog edits this row instead of creating a new one. */
  item?: PaymentItem | null;
}

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-sm text-destructive">{message}</p> : null;

/** Shared footer so all three forms behave identically. */
const Footer = ({
  pending,
  editing,
  onCancel,
}: {
  pending: boolean;
  editing: boolean;
  onCancel: () => void;
}) => (
  <DialogFooter>
    <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
      Cancel
    </Button>
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {editing ? 'Save changes' : 'Add'}
    </Button>
  </DialogFooter>
);

const AmountInput = ({
  id,
  label,
  error,
  registration,
}: {
  id: string;
  label: string;
  error?: string;
  registration: Record<string, unknown>;
}) => {
  const { symbol } = useCurrency();
  return (
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
};

const BillFields = ({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Bill | null;
}) => {
  const editing = !!item;
  const create = useCreatePayment('bill', { onSuccess: () => onOpenChange(false) });
  const update = useUpdatePayment('bill', { onSuccess: () => onOpenChange(false) });
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BillForm>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      type: 'OTHER',
      name: '',
      providerName: '',
      amount: '',
      dueDate: toDateInputValue(new Date()),
      isRecurring: false,
      frequency: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      type: item?.type ?? 'OTHER',
      name: item?.name ?? '',
      providerName: item?.providerName ?? '',
      amount: item ? String(item.amount) : '',
      dueDate: item ? toDateInputValue(new Date(item.dueDate)) : toDateInputValue(new Date()),
      isRecurring: item?.isRecurring ?? false,
      frequency: item?.frequency,
      notes: item?.notes ?? '',
    });
  }, [open, item, reset]);

  const isRecurring = watch('isRecurring');

  const onSubmit = (v: BillForm) => {
    // "Absent key = leave alone; present-but-empty = clear" — matching the
    // server's update semantics for optional fields.
    const payload = {
      type: v.type,
      name: v.name,
      ...(v.providerName ? { providerName: v.providerName } : {}),
      amount: Number(v.amount),
      dueDate: new Date(v.dueDate).toISOString(),
      isRecurring: v.isRecurring,
      frequency: v.isRecurring && v.frequency ? v.frequency : undefined,
      ...(v.notes ? { notes: v.notes } : {}),
    };
    if (editing && item) update.mutate({ id: item.id, payload });
    else create.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit bill' : 'Add a bill'}</DialogTitle>
          <DialogDescription>Track a household bill and when it falls due.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="billType">Type</Label>
              <Select id="billType" {...register('type')}>
                {Object.entries(BILL_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billName">Name</Label>
              <Input id="billName" placeholder="Electricity – August" aria-invalid={!!errors.name} {...register('name')} />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billProvider">Provider (optional)</Label>
              <Input id="billProvider" placeholder="City Power" aria-invalid={!!errors.providerName} {...register('providerName')} />
              <FieldError message={errors.providerName?.message} />
            </div>
            <AmountInput
              id="billAmount"
              label="Amount"
              error={errors.amount?.message}
              registration={register('amount')}
            />
            <div className="space-y-2">
              <Label htmlFor="billDueDate">Due date</Label>
              <Input id="billDueDate" type="date" aria-invalid={!!errors.dueDate} {...register('dueDate')} />
              <FieldError message={errors.dueDate?.message} />
            </div>
          </div>

          {/* Recurrence is opt-in now; it used to be hardcoded on every bill. */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <Label className="flex items-center gap-2 font-normal">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                aria-label="This bill repeats"
                {...register('isRecurring')}
              />
              This bill repeats
            </Label>
            {isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="billFrequency">How often</Label>
                <Select id="billFrequency" aria-invalid={!!errors.frequency} {...register('frequency')}>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <FieldError message={errors.frequency?.message} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="billNotes">Notes (optional)</Label>
            <Textarea id="billNotes" rows={2} aria-invalid={!!errors.notes} {...register('notes')} />
            <FieldError message={errors.notes?.message} />
          </div>

          <Footer pending={pending} editing={editing} onCancel={() => onOpenChange(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const RentFields = ({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Rent | null;
}) => {
  const editing = !!item;
  const create = useCreatePayment('rent', { onSuccess: () => onOpenChange(false) });
  const update = useUpdatePayment('rent', { onSuccess: () => onOpenChange(false) });
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RentForm>({
    resolver: zodResolver(rentFormSchema),
    defaultValues: {
      propertyName: '',
      landlordName: '',
      landlordPhone: '',
      amount: '',
      dueDay: '1',
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      propertyName: item?.propertyName ?? '',
      landlordName: item?.landlordName ?? '',
      landlordPhone: item?.landlordPhone ?? '',
      amount: item ? String(item.amount) : '',
      dueDay: item ? String(item.dueDay) : '1',
      month: String(item?.month ?? new Date().getMonth() + 1),
      year: String(item?.year ?? new Date().getFullYear()),
      notes: item?.notes ?? '',
    });
  }, [open, item, reset]);

  const onSubmit = (v: RentForm) => {
    // The API takes an explicit dueDate alongside month/year/dueDay, so it is
    // derived here in UTC — clamped to the month's real length (Feb 31 → Feb 28).
    const lastDay = new Date(Date.UTC(Number(v.year), Number(v.month), 0)).getUTCDate();
    const dueDate = new Date(
      Date.UTC(Number(v.year), Number(v.month) - 1, Math.min(Number(v.dueDay), lastDay)),
    ).toISOString();
    const payload = {
      propertyName: v.propertyName,
      ...(v.landlordName ? { landlordName: v.landlordName } : {}),
      ...(v.landlordPhone ? { landlordPhone: v.landlordPhone } : {}),
      amount: Number(v.amount),
      dueDay: Number(v.dueDay),
      month: Number(v.month),
      year: Number(v.year),
      dueDate,
      notes: v.notes || undefined,
    };
    if (editing && item) update.mutate({ id: item.id, payload });
    else create.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit rent' : 'Add rent'}</DialogTitle>
          <DialogDescription>One row per month keeps each period's status separate.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rentProperty">Property</Label>
              <Input id="rentProperty" placeholder="Maple Street flat" aria-invalid={!!errors.propertyName} {...register('propertyName')} />
              <FieldError message={errors.propertyName?.message} />
            </div>
            <AmountInput
              id="rentAmount"
              label="Amount"
              error={errors.amount?.message}
              registration={register('amount')}
            />
            <div className="space-y-2">
              <Label htmlFor="rentLandlord">Landlord (optional)</Label>
              <Input id="rentLandlord" aria-invalid={!!errors.landlordName} {...register('landlordName')} />
              <FieldError message={errors.landlordName?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentPhone">Landlord phone (optional)</Label>
              <Input id="rentPhone" aria-invalid={!!errors.landlordPhone} {...register('landlordPhone')} />
              <FieldError message={errors.landlordPhone?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentMonth">Month</Label>
              <Select id="rentMonth" {...register('month')}>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={String(m)}>
                    {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'long' })}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rentYear">Year</Label>
                <Input id="rentYear" type="number" min="1970" max="2100" aria-invalid={!!errors.year} {...register('year')} />
                <FieldError message={errors.year?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentDueDay">Due day</Label>
                <Input id="rentDueDay" type="number" min="1" max="31" aria-invalid={!!errors.dueDay} {...register('dueDay')} />
                <FieldError message={errors.dueDay?.message} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rentNotes">Notes (optional)</Label>
            <Textarea id="rentNotes" rows={2} aria-invalid={!!errors.notes} {...register('notes')} />
            <FieldError message={errors.notes?.message} />
          </div>

          <Footer pending={pending} editing={editing} onCancel={() => onOpenChange(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SchoolFeeFields = ({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SchoolFee | null;
}) => {
  const editing = !!item;
  const create = useCreatePayment('schoolFee', { onSuccess: () => onOpenChange(false) });
  const update = useUpdatePayment('schoolFee', { onSuccess: () => onOpenChange(false) });
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolFeeForm>({
    resolver: zodResolver(schoolFeeFormSchema),
    defaultValues: {
      studentName: '',
      school: '',
      class: '',
      amount: '',
      dueDate: toDateInputValue(new Date()),
      term: '',
      academicYear: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      studentName: item?.studentName ?? '',
      school: item?.school ?? '',
      class: item?.class ?? '',
      amount: item ? String(item.amount) : '',
      dueDate: item ? toDateInputValue(new Date(item.dueDate)) : toDateInputValue(new Date()),
      term: item?.term ?? '',
      academicYear: item?.academicYear ?? '',
    });
  }, [open, item, reset]);

  const onSubmit = (v: SchoolFeeForm) => {
    const payload = {
      studentName: v.studentName,
      school: v.school,
      ...(v.class ? { class: v.class } : {}),
      amount: Number(v.amount),
      dueDate: new Date(v.dueDate).toISOString(),
      ...(v.term ? { term: v.term } : {}),
      ...(v.academicYear ? { academicYear: v.academicYear } : {}),
    };
    if (editing && item) update.mutate({ id: item.id, payload });
    else create.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit school fee' : 'Add school fee'}</DialogTitle>
          <DialogDescription>Track one student's fees for one due date.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feeStudent">Student</Label>
              <Input id="feeStudent" aria-invalid={!!errors.studentName} {...register('studentName')} />
              <FieldError message={errors.studentName?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeSchool">School</Label>
              <Input id="feeSchool" aria-invalid={!!errors.school} {...register('school')} />
              <FieldError message={errors.school?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeClass">Class (optional)</Label>
              <Input id="feeClass" aria-invalid={!!errors.class} {...register('class')} />
              <FieldError message={errors.class?.message} />
            </div>
            <AmountInput
              id="feeAmount"
              label="Amount"
              error={errors.amount?.message}
              registration={register('amount')}
            />
            <div className="space-y-2">
              <Label htmlFor="feeDueDate">Due date</Label>
              <Input id="feeDueDate" type="date" aria-invalid={!!errors.dueDate} {...register('dueDate')} />
              <FieldError message={errors.dueDate?.message} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="feeTerm">Term (optional)</Label>
                <Input id="feeTerm" aria-invalid={!!errors.term} {...register('term')} />
                <FieldError message={errors.term?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feeYear">Academic year (optional)</Label>
                <Input id="feeYear" aria-invalid={!!errors.academicYear} {...register('academicYear')} />
                <FieldError message={errors.academicYear?.message} />
              </div>
            </div>
          </div>

          <Footer pending={pending} editing={editing} onCancel={() => onOpenChange(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Kind-dispatched create/edit dialog. Each kind gets its own typed form so
 * `react-hook-form` stays fully inferred end to end.
 */
const PaymentFormDialog = ({ open, onOpenChange, kind, item }: PaymentFormDialogProps) => {
  if (kind === 'bill')
    return <BillFields open={open} onOpenChange={onOpenChange} item={item as Bill | null} />;
  if (kind === 'rent')
    return <RentFields open={open} onOpenChange={onOpenChange} item={item as Rent | null} />;
  return (
    <SchoolFeeFields open={open} onOpenChange={onOpenChange} item={item as SchoolFee | null} />
  );
};

export default PaymentFormDialog;
