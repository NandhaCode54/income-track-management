import { useRef, useState } from 'react';
import { ExternalLink, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/utils/formatDate';
import { MAX_RECEIPTS_PER_EXPENSE, type Expense, type Receipt } from '@/types/expense.types';
import { useDeleteReceipt, useUploadReceipt } from './expense.hooks';

interface ReceiptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
}

const MAX_BYTES = 5 * 1024 * 1024;

const formatSize = (bytes: number | null): string => {
  if (!bytes) return '';
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const isImage = (receipt: Receipt): boolean => (receipt.mimeType ?? '').startsWith('image/');

const ReceiptsDialog = ({ open, onOpenChange, expense }: ReceiptsDialogProps) => {
  const { can, isAtLeast } = usePermission();
  const uploadReceipt = useUploadReceipt();
  const deleteReceipt = useDeleteReceipt();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<Receipt | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!expense) return null;

  const canManage = can('FINANCE_WRITE') && (expense.isOwn || isAtLeast('FAMILY_HEAD'));
  const receipts = expense.receipts;
  const atLimit = receipts.length >= MAX_RECEIPTS_PER_EXPENSE;

  const onPick = (file: File | undefined) => {
    setLocalError(null);
    if (!file) return;

    // Checked here as well as on the server so a 5 MB photo is rejected before
    // it is uploaded over a phone connection.
    if (file.size > MAX_BYTES) {
      setLocalError('That file is larger than 5 MB.');
      return;
    }

    uploadReceipt.mutate({ expenseId: expense.id, file });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipts</DialogTitle>
            <DialogDescription>
              {expense.description} · {formatDate(expense.date)}
            </DialogDescription>
          </DialogHeader>

          {receipts.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              No receipts attached yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {receipts.map((receipt) => (
                <li
                  key={receipt.id}
                  className="flex items-center gap-3 rounded-lg border p-2 pr-3"
                >
                  {isImage(receipt) ? (
                    <img
                      src={receipt.url}
                      alt={receipt.fileName ?? 'Receipt'}
                      className="h-12 w-12 shrink-0 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {receipt.fileName ?? 'Receipt'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[formatSize(receipt.fileSize), formatDate(receipt.createdAt)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>

                  <a
                    href={receipt.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${receipt.fileName ?? 'receipt'} in a new tab`}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(receipt)}
                      aria-label={`Delete ${receipt.fileName ?? 'receipt'}`}
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canManage && (
            <div className="space-y-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                className="hidden"
                onChange={(event) => {
                  onPick(event.target.files?.[0]);
                  // Reset so picking the same file twice still fires a change event.
                  event.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={atLimit || uploadReceipt.isPending}
                onClick={() => inputRef.current?.click()}
              >
                {uploadReceipt.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {atLimit ? `Limit of ${MAX_RECEIPTS_PER_EXPENSE} reached` : 'Upload a receipt'}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, HEIC or PDF, up to 5 MB.
              </p>
              {localError && <p className="text-sm text-destructive">{localError}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(isOpen) => !isOpen && setPendingDelete(null)}
        title="Delete this receipt?"
        description="The file is removed from storage and cannot be recovered."
        confirmLabel="Delete"
        destructive
        loading={deleteReceipt.isPending}
        onConfirm={() =>
          pendingDelete &&
          deleteReceipt.mutate(
            { expenseId: expense.id, receiptId: pendingDelete.id },
            { onSuccess: () => setPendingDelete(null) },
          )
        }
      />
    </>
  );
};

export default ReceiptsDialog;
