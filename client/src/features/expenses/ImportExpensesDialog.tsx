import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CSV_TEMPLATE, CSV_TEMPLATE_COLUMNS } from './expense.constants';
import { useImportExpenses } from './expense.hooks';

interface ImportExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_BYTES = 1024 * 1024;

/** Offers the expected format as a file rather than describing it in prose. */
const downloadTemplate = () => {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'expense-import-template.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const ImportExpensesDialog = ({ open, onOpenChange }: ImportExpensesDialogProps) => {
  const importExpenses = useImportExpenses();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [createMissing, setCreateMissing] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // A fresh dialog every time — a previous run's result must not look like this one's.
  // Deliberately keyed on `open` alone: the mutation object is new every render,
  // and including it would clear the result the moment it arrived.
  useEffect(() => {
    if (!open) {
      setFile(null);
      setLocalError(null);
      importExpenses.reset();
    }
  }, [open]);

  const result = importExpenses.data;

  const onPick = (picked: File | undefined) => {
    setLocalError(null);
    if (!picked) return;

    if (picked.size > MAX_BYTES) {
      setLocalError('That file is larger than 1 MB.');
      return;
    }

    setFile(picked);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import expenses</DialogTitle>
          <DialogDescription>
            Upload a CSV with at least {CSV_TEMPLATE_COLUMNS.slice(0, 2).join(', ')} and Amount
            columns. Everything imported is filed under your name.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="text-sm">
                <p className="font-medium">
                  {result.imported} {result.imported === 1 ? 'expense' : 'expenses'} imported
                </p>
                {result.createdCategories.length > 0 && (
                  <p className="mt-1 text-muted-foreground">
                    New categories: {result.createdCategories.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  {result.skipped} {result.skipped === 1 ? 'row was' : 'rows were'} skipped
                </div>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-muted-foreground">
                  {result.errors.map((error) => (
                    <li key={error.row}>
                      Line {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                onPick(event.target.files?.[0]);
                event.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-accent/50"
            >
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {file ? file.name : 'Choose a CSV file'}
              </span>
              <span className="text-xs text-muted-foreground">Up to 1 MB, 1000 rows</span>
            </button>

            {localError && <p className="text-sm text-destructive">{localError}</p>}

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                checked={createMissing}
                onChange={(event) => setCreateMissing(event.target.checked)}
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">Create missing categories</span>
                <span className="block text-xs text-muted-foreground">
                  Otherwise rows with an unknown category are imported uncategorised.
                </span>
              </span>
            </label>

            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download a template
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              disabled={!file || importExpenses.isPending}
              onClick={() =>
                file && importExpenses.mutate({ file, createMissingCategories: createMissing })
              }
            >
              {importExpenses.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportExpensesDialog;
