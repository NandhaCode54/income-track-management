import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/types/api.types';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  /** Noun for the "Showing 1–20 of 34 …" line. */
  label?: string;
}

const Pagination = ({ meta, onPageChange, label = 'entries' }: PaginationProps) => {
  if (meta.total === 0) return null;

  const first = (meta.page - 1) * meta.perPage + 1;
  const last = Math.min(meta.page * meta.perPage, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        Showing <span className="font-medium text-foreground">{first}</span>–
        <span className="font-medium text-foreground">{last}</span> of{' '}
        <span className="font-medium text-foreground">{meta.total}</span> {label}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasPrev}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-muted-foreground">
          Page {meta.page} of {Math.max(meta.totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasNext}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
