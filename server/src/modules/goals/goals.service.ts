import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ValidationError } from '../../shared/errors/ValidationError';
import { MSG } from '../../shared/constants/messages';
import { goalsRepository } from './goals.repository';
import type {
  ContributeInput,
  CreateGoalInput,
  GoalDto,
  ListGoalsQuery,
  UpdateGoalInput,
} from './goals.types';
import { toDto } from './goals.types';

export const goalsService = {
  async list(familyId: string, query: ListGoalsQuery): Promise<GoalDto[]> {
    const rows = await goalsRepository.list(familyId, query);
    return rows.map(toDto);
  },

  async getById(familyId: string, id: string): Promise<GoalDto> {
    const row = await goalsRepository.findById(familyId, id);
    if (!row) throw new NotFoundError('Goal');
    return toDto(row);
  },

  async create(familyId: string, input: CreateGoalInput): Promise<GoalDto> {
    const row = await goalsRepository.create(familyId, input);
    return toDto(row);
  },

  async update(familyId: string, id: string, input: UpdateGoalInput): Promise<GoalDto> {
    // Scoped first: a foreign id is invisible, not forbidden (the IDOR rule).
    await this.getById(familyId, id);
    const row = await goalsRepository.update(id, input);
    return toDto(row);
  },

  async remove(familyId: string, id: string): Promise<void> {
    await this.getById(familyId, id);
    await goalsRepository.delete(id);
  },

  /**
   * Adding money to a goal that is already complete is a mistake, not a 500 —
   * the caller gets a 422 with a field error like every other validation.
   */
  async contribute(familyId: string, goalId: string, input: ContributeInput): Promise<GoalDto> {
    const result = await goalsRepository.contribute(familyId, goalId, input);

    if (result.outcome === 'not-found') throw new NotFoundError('Goal');
    if (result.outcome === 'already-complete') {
      throw new ValidationError(MSG.VALIDATION_ERROR, { amount: [MSG.GOAL_ALREADY_COMPLETE] });
    }

    return toDto(result.goal);
  },
};
