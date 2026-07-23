import { Select } from '@/components/ui/select';
import { MONTH_NAMES } from '@/utils/formatDate';

/** A summary window: one month, or the whole year when `month` is omitted. */
export interface Period {
  year: number;
  month?: number;
}

interface PeriodSelectorProps {
  value: Period;
  onChange: (value: Period) => void;
}

/** Six years back is enough history for a family ledger without an unusable dropdown. */
const years = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index);

const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => (
  <div className="flex items-center gap-2">
    <Select
      className="h-9 w-36"
      aria-label="Summary month"
      value={value.month ?? ''}
      onChange={(event) =>
        onChange({ ...value, month: event.target.value ? Number(event.target.value) : undefined })
      }
    >
      <option value="">Whole year</option>
      {MONTH_NAMES.map((name, index) => (
        <option key={name} value={index + 1}>
          {name}
        </option>
      ))}
    </Select>

    <Select
      className="h-9 w-28"
      aria-label="Summary year"
      value={value.year}
      onChange={(event) => onChange({ ...value, year: Number(event.target.value) })}
    >
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </Select>
  </div>
);

export default PeriodSelector;
