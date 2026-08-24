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
import { chitFundFormSchema, type ChitFundForm } from './chit-fund.schemas';
import { useCreateChitFund } from './chit-fund.hooks';

interface ChitFundFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChitFundFormDialog = ({ open, onOpenChange }: ChitFundFormDialogProps) => {
  const create = useCreateChitFund({ onSuccess: () => onOpenChange(false) });

  const now = new Date();
  const inTenMonths = new Date(now.getFullYear(), now.getMonth() + 10, 1);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChitFundForm>({
    resolver: zodResolver(chitFundFormSchema),
    defaultValues: {
      name: '',
      organizer: '',
      totalAmount: '',
      monthlyAmount: '',
      totalMembers: '',
      dueDay: '5',
      startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      endDate: `${inTenMonths.getFullYear()}-${String(inTenMonths.getMonth() + 1).padStart(2, '0')}-01`,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset();
  }, [open, reset]);

  const onSubmit = (v: ChitFundForm) => {
    create.mutate({
      name: v.name,
      ...(v.organizer ? { organizer: v.organizer } : {}),
      totalAmount: Number(v.totalAmount),
      monthlyAmount: Number(v.monthlyAmount),
      totalMembers: Number(v.totalMembers),
      dueDay: Number(v.dueDay),
      startDate: new Date(v.startDate).toISOString(),
      endDate: new Date(v.endDate).toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a chit fund</DialogTitle>
          <DialogDescription>
            One member pays the pooled amount each month — track every month here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chitName">Name</Label>
              <Input
                id="chitName"
                placeholder="Neighbourhood chit"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="chitOrganizer">Organizer (optional)</Label>
              <Input id="chitOrganizer" aria-invalid={!!errors.organizer} {...register('organizer')} />
              {errors.organizer && (
                <p className="text-sm text-destructive">{errors.organizer.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="chitTotal">Total amount</Label>
              <Input
                id="chitTotal"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                aria-invalid={!!errors.totalAmount}
                {...register('totalAmount')}
              />
              {errors.totalAmount && (
                <p className="text-sm text-destructive">{errors.totalAmount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="chitMonthly">Monthly payment</Label>
              <Input
                id="chitMonthly"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                aria-invalid={!!errors.monthlyAmount}
                {...register('monthlyAmount')}
              />
              {errors.monthlyAmount && (
                <p className="text-sm text-destructive">{errors.monthlyAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="chitMembers">Total members</Label>
              <Input
                id="chitMembers"
                type="number"
                min="2"
                aria-invalid={!!errors.totalMembers}
                {...register('totalMembers')}
              />
              {errors.totalMembers && (
                <p className="text-sm text-destructive">{errors.totalMembers.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="chitDueDay">Due day of month</Label>
              <Input
                id="chitDueDay"
                type="number"
                min="1"
                max="31"
                aria-invalid={!!errors.dueDay}
                {...register('dueDay')}
              />
              {errors.dueDay && <p className="text-sm text-destructive">{errors.dueDay.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="chitStart">Start month</Label>
              <Input id="chitStart" type="date" aria-invalid={!!errors.startDate} {...register('startDate')} />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="chitEnd">End month</Label>
              <Input id="chitEnd" type="date" aria-invalid={!!errors.endDate} {...register('endDate')} />
              {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add fund
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChitFundFormDialog;
