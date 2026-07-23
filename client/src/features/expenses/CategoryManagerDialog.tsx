import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import { CATEGORY_COLORS, NEUTRAL_CATEGORY_COLOR } from './expense.constants';
import { categoryFormSchema, type CategoryForm } from './expense.schemas';
import {
  useCreateCategory,
  useDeleteCategory,
  useExpenseCategories,
  useUpdateCategory,
} from './expense.hooks';
import type { ExpenseCategory } from '@/types/expense.types';

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = (parentId = ''): CategoryForm => ({
  name: '',
  icon: '',
  color: CATEGORY_COLORS[0],
  parentId,
});

const CategoryManagerDialog = ({ open, onOpenChange }: CategoryManagerDialogProps) => {
  const { can, isAtLeast } = usePermission();
  const categoriesQuery = useExpenseCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const canWrite = can('FINANCE_WRITE');
  const canDelete = isAtLeast('FAMILY_HEAD');

  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ExpenseCategory | null>(null);

  const categories = categoriesQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: emptyForm(),
  });

  const selectedColor = watch('color');

  // Re-seed whenever the form opens or switches between add and edit.
  useEffect(() => {
    if (!showForm) return;
    reset(
      editing
        ? {
            name: editing.name,
            icon: editing.icon ?? '',
            color: editing.color ?? CATEGORY_COLORS[0],
            parentId: editing.parentId ?? '',
          }
        : emptyForm(),
    );
  }, [showForm, editing, reset]);

  // Closing the whole dialog should not leave a half-filled form behind.
  useEffect(() => {
    if (!open) {
      setShowForm(false);
      setEditing(null);
    }
  }, [open]);

  const pending = createCategory.isPending || updateCategory.isPending;

  const onSubmit = (values: CategoryForm) => {
    const payload = {
      name: values.name.trim(),
      icon: values.icon?.trim() ?? '',
      color: values.color || '',
      // `null` is what promotes a subcategory back to the top level; '' would
      // read as "unchanged" on a PATCH.
      parentId: values.parentId ? values.parentId : null,
    };

    const done = {
      onSuccess: () => {
        setShowForm(false);
        setEditing(null);
      },
    };

    if (editing) updateCategory.mutate({ id: editing.id, payload }, done);
    else createCategory.mutate(payload, done);
  };

  const startEdit = (category: ExpenseCategory) => {
    setEditing(category);
    setShowForm(true);
  };

  const startCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  /** A subcategory may not itself become a parent, and nothing may parent itself. */
  const parentOptions = categories.filter(
    (category) => !editing || (category.id !== editing.id && editing.children.length === 0),
  );

  const renderRow = (category: ExpenseCategory, isChild = false) => (
    <li
      key={category.id}
      className={cn('flex items-center gap-3 rounded-lg border p-3', isChild && 'ml-6')}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
        style={{ backgroundColor: category.color ?? NEUTRAL_CATEGORY_COLOR }}
        aria-hidden
      >
        {category.icon || category.name.charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {category.expenseCount === 1 ? '1 expense' : `${category.expenseCount} expenses`}
        </p>
      </div>

      {category.isDefault && <Badge variant="muted">Default</Badge>}

      {canWrite && (
        <button
          type="button"
          onClick={() => startEdit(category)}
          aria-label={`Edit ${category.name}`}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={() => setPendingDelete(category)}
          aria-label={`Delete ${category.name}`}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Categories</DialogTitle>
            <DialogDescription>
              Group spending so reports and budgets have something to compare. Categories can be
              nested one level deep.
            </DialogDescription>
          </DialogHeader>

          {showForm && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 rounded-lg border bg-muted/30 p-4"
              noValidate
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {editing ? `Edit ${editing.name}` : 'New category'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  aria-label="Close the category form"
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="categoryName">Name</Label>
                  <Input
                    id="categoryName"
                    placeholder="e.g. Groceries"
                    aria-invalid={!!errors.name}
                    {...register('name')}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryIcon">Icon</Label>
                  <Input
                    id="categoryIcon"
                    className="w-20 text-center"
                    placeholder="🍽️"
                    aria-invalid={!!errors.icon}
                    {...register('icon')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryParent">Parent category</Label>
                <Select id="categoryParent" {...register('parentId')}>
                  <option value="">Top level</option>
                  {parentOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
                {editing && editing.children.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    This category has subcategories, so it has to stay at the top level.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Colour</span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue('color', color, { shouldDirty: true })}
                      aria-label={`Use colour ${color}`}
                      aria-pressed={selectedColor === color}
                      className={cn(
                        'h-7 w-7 rounded-full border-2 transition-transform',
                        selectedColor === color
                          ? 'border-foreground scale-110'
                          : 'border-transparent',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? 'Save changes' : 'Create category'}
                </Button>
              </div>
            </form>
          )}

          {canWrite && !showForm && (
            <Button variant="outline" onClick={startCreate}>
              <Plus className="h-4 w-4" />
              New category
            </Button>
          )}

          {categoriesQuery.isLoading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.id} className="space-y-2">
                  <ul className="space-y-2">
                    {renderRow(category)}
                    {category.children.map((child) => renderRow(child, true))}
                  </ul>
                </li>
              ))}
            </ul>
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
        title={`Delete ${pendingDelete?.name ?? 'this category'}?`}
        description={
          pendingDelete && pendingDelete.expenseCount > 0
            ? `Its ${pendingDelete.expenseCount} expense${
                pendingDelete.expenseCount === 1 ? '' : 's'
              } will stay, but become uncategorised. Nothing is removed from your totals.`
            : 'The category is removed. Nothing else changes.'
        }
        confirmLabel="Delete"
        destructive
        loading={deleteCategory.isPending}
        onConfirm={() =>
          pendingDelete &&
          deleteCategory.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) })
        }
      />
    </>
  );
};

export default CategoryManagerDialog;
