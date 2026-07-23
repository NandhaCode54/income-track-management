import { categoryRepository, type CategoryRow, type WriteCategoryData } from './category.repository';
import type { CategoryDto, CreateCategoryInput, UpdateCategoryInput } from './expense.types';
import type { ActorContext } from '../../shared/types/actor';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { MSG } from '../../shared/constants/messages';

const toDto = (row: CategoryRow): CategoryDto => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  parentId: row.parentId,
  isDefault: row.isDefault,
  expenseCount: row._count.expenses,
  children: [],
});

/**
 * Flattens the family's categories into the two-level tree the UI renders.
 * A row whose parent has since been deleted falls back to the top level rather
 * than disappearing from the list entirely.
 */
const buildTree = (rows: CategoryRow[]): CategoryDto[] => {
  const byId = new Map(rows.map((row) => [row.id, toDto(row)]));
  const roots: CategoryDto[] = [];

  rows.forEach((row) => {
    const node = byId.get(row.id) as CategoryDto;
    const parent = row.parentId ? byId.get(row.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  return roots;
};

const duplicateError = () =>
  new ValidationError(MSG.VALIDATION_ERROR, { name: [MSG.CATEGORY_DUPLICATE] });

/**
 * The schema allows arbitrarily deep self-nesting, but the product does not:
 * a parent must itself be top-level. Enforcing it here is what keeps the tree
 * two deep — and, incidentally, makes cycles impossible.
 */
const assertUsableParent = async (
  familyId: string,
  parentId: string,
  categoryId?: string,
): Promise<void> => {
  if (categoryId && parentId === categoryId) {
    throw new ValidationError(MSG.VALIDATION_ERROR, { parentId: [MSG.CATEGORY_PARENT_SELF] });
  }

  const parent = await categoryRepository.findById(familyId, parentId);
  if (!parent) throw new NotFoundError('Parent category');

  if (parent.parentId) {
    throw new ValidationError(MSG.VALIDATION_ERROR, { parentId: [MSG.CATEGORY_PARENT_INVALID] });
  }
};

export const categoryService = {
  /**
   * Families registered before this module existed have no categories at all,
   * and an empty picker makes the expense form unusable. Reading the list seeds
   * the starter set once, so every workspace converges on the same baseline.
   */
  async list(actor: ActorContext): Promise<CategoryDto[]> {
    const existing = await categoryRepository.count(actor.familyId);
    if (existing === 0) await categoryRepository.ensureDefaults(actor.familyId);

    return buildTree(await categoryRepository.listAll(actor.familyId));
  },

  async create(actor: ActorContext, input: CreateCategoryInput): Promise<CategoryDto> {
    const parentId = input.parentId ?? null;
    if (parentId) await assertUsableParent(actor.familyId, parentId);

    const clash = await categoryRepository.findByName(actor.familyId, input.name, parentId);
    if (clash) throw duplicateError();

    const data: WriteCategoryData = {
      name: input.name,
      icon: input.icon ?? null,
      color: input.color ?? null,
      parentId,
    };

    return toDto(await categoryRepository.create(actor.familyId, data));
  },

  async update(actor: ActorContext, id: string, input: UpdateCategoryInput): Promise<CategoryDto> {
    const existing = await categoryRepository.findById(actor.familyId, id);
    if (!existing) throw new NotFoundError('Category');

    // `undefined` means "leave the parent alone"; `null` means "move to the top level".
    const parentChanged = input.parentId !== undefined;
    const parentId = parentChanged ? (input.parentId ?? null) : existing.parentId;

    if (parentChanged && parentId) {
      await assertUsableParent(actor.familyId, parentId, id);

      // Giving a parent to a category that already has children would make the
      // tree three deep, which nothing downstream is built to render.
      const children = await categoryRepository.countChildren(actor.familyId, id);
      if (children > 0) {
        throw new ValidationError(MSG.VALIDATION_ERROR, {
          parentId: [MSG.CATEGORY_NESTING_LIMIT],
        });
      }
    }

    const name = input.name ?? existing.name;
    if (input.name !== undefined || parentChanged) {
      const clash = await categoryRepository.findByName(actor.familyId, name, parentId, id);
      if (clash) throw duplicateError();
    }

    const data: Partial<WriteCategoryData> = {};
    if (input.name !== undefined) data.name = input.name;
    if ('icon' in input) data.icon = input.icon ?? null;
    if ('color' in input) data.color = input.color ?? null;
    if (parentChanged) data.parentId = parentId;

    return toDto(await categoryRepository.update(existing.id, data));
  },

  /**
   * Deleting a category does not delete its expenses — the schema nulls their
   * `categoryId`, so the money stays in every total and the rows simply become
   * uncategorised. Subcategories are a different matter: orphaning them silently
   * would move them to the top level, so the caller has to deal with them first.
   */
  async remove(actor: ActorContext, id: string): Promise<{ name: string; expenseCount: number }> {
    const existing = await categoryRepository.findById(actor.familyId, id);
    if (!existing) throw new NotFoundError('Category');

    const children = await categoryRepository.countChildren(actor.familyId, id);
    if (children > 0) {
      throw new ValidationError(MSG.VALIDATION_ERROR, { id: [MSG.CATEGORY_HAS_CHILDREN] });
    }

    await categoryRepository.delete(existing.id);
    return { name: existing.name, expenseCount: existing._count.expenses };
  },
};
