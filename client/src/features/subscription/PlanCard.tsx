import { Check, X, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import type { PlanDefinition, PlanType, Subscription } from '@/types/subscription.types';

interface PlanCardProps {
  plan: PlanDefinition;
  currentPlan: PlanType;
  subscription: Subscription | null;
  onSelectPlan: (plan: PlanDefinition, billingCycle: 'monthly' | 'yearly') => void;
  isPending: boolean;
}

const PlanCard = ({ plan, currentPlan, subscription, onSelectPlan, isPending }: PlanCardProps) => {
  const { format } = useCurrency();
  const isCurrent = plan.plan === currentPlan;
  const isFree = plan.plan === 'FREE';

  return (
    <Card
      className={cn(
        'relative flex flex-col',
        isCurrent && 'border-primary ring-2 ring-primary/20',
        plan.plan === 'FAMILY' && 'border-primary/50',
      )}
    >
      {plan.plan === 'FAMILY' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Most Popular
          </Badge>
        </div>
      )}
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription className="text-sm">{plan.description}</CardDescription>
        <div className="mt-4">
          {isFree ? (
            <div className="text-3xl font-bold">Free</div>
          ) : (
            <div>
              <span className="text-3xl font-bold">{format(plan.monthlyPrice)}</span>
              <span className="text-muted-foreground">/mo</span>
              <p className="mt-1 text-xs text-muted-foreground">
                or {format(plan.yearlyPrice)}/year (save {Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}%)
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <ul className="flex-1 space-y-2.5">
          {plan.features.map((feature) => (
            <li key={feature.label} className="flex items-start gap-2 text-sm">
              {feature.included ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
              )}
              <span className={cn(!feature.included && 'text-muted-foreground/50')}>
                {feature.label}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {isCurrent ? (
            <Button disabled className="w-full">
              Current Plan
            </Button>
          ) : isFree ? (
            <Button disabled className="w-full" variant="outline">
              Free Forever
            </Button>
          ) : (
            <Button
              className="w-full"
              variant={plan.plan === 'FAMILY' ? 'default' : 'outline'}
              disabled={isPending}
              onClick={() => onSelectPlan(plan, 'monthly')}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCurrent ? 'Current Plan' : subscription?.plan === 'FREE' ? 'Upgrade' : 'Switch'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanCard;
