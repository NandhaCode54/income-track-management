import { Loader2 } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { useMyFamilies, useSwitchFamily } from './family.hooks';

/**
 * Lets a user who belongs to more than one family pick the workspace every
 * request is scoped to. Hidden entirely for the common single-family case.
 */
const WorkspaceSwitcher = () => {
  const { data: families = [] } = useMyFamilies();
  const switchFamily = useSwitchFamily();

  if (families.length < 2) return null;

  const current = families.find((family) => family.isCurrent) ?? families[0];

  return (
    <div className="flex items-center gap-2">
      {switchFamily.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      <Select
        aria-label="Active workspace"
        className="h-9 w-48"
        value={current.id}
        disabled={switchFamily.isPending}
        onChange={(event) => switchFamily.mutate(event.target.value)}
      >
        {families.map((family) => (
          <option key={family.id} value={family.id}>
            {family.name}
          </option>
        ))}
      </Select>
    </div>
  );
};

export default WorkspaceSwitcher;
