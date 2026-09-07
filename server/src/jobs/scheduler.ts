import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../config/env';
import { logger } from '../shared/utils/logger';
import { budgetAlertTask } from './budget-alert.job';
import { emiReminderTask } from './emi-reminder.job';
import { paymentReminderTask } from './payment-reminder.job';
import { recurringOccurrenceTask } from './recurring-occurrence.job';

/**
 * The job registry.
 *
 * Every scheduled task is declared here rather than starting itself on import,
 * for two reasons: a job that registers as a side effect of being imported is
 * impossible to keep out of a test run, and the scheduler has to be stoppable so
 * graceful shutdown does not leave a tick half-finished against a closed
 * database.
 *
 * **Times are in the family's timezone, not the server's.** `CRON_TIMEZONE`
 * defaults to Asia/Kolkata to match the app's default `FamilySettings.timezone`:
 * a reminder that says "due today" should arrive on the morning of that day where
 * the family lives, and a UTC-scheduled 06:00 job lands at 11:30 in India.
 */

interface Job {
  name: string;
  /** Standard five-field cron expression. */
  schedule: string;
  run: () => void;
}

const JOBS: Job[] = [
  {
    name: 'recurring-occurrence',
    // 05:50 daily, ahead of the overdue/reminder sweeps so a just-materialised
    // recurring bill can still be reminded about the same morning.
    schedule: '50 5 * * *',
    run: recurringOccurrenceTask,
  },
  {
    name: 'emi-reminder',
    // 06:00 daily — early enough to act on, late enough not to arrive overnight.
    schedule: '0 6 * * *',
    run: emiReminderTask,
  },
  {
    name: 'payment-reminder',
    // Staggered ten minutes behind the EMI sweep so the two never compete for
    // the same connection pool mid-tick.
    schedule: '10 6 * * *',
    run: paymentReminderTask,
  },
  {
    name: 'budget-alerts',
    schedule: '20 6 * * *',
    run: budgetAlertTask,
  },
];

const tasks: ScheduledTask[] = [];

/**
 * `ENABLE_CRON` exists because these jobs are **not idempotent across
 * processes**. The notification guard prevents a *second* reminder for the same
 * instalment, but two replicas ticking at the same second can both read "not yet
 * notified" and both insert. In a single-process deployment that never happens;
 * behind a load balancer running three containers it happens on day one. So
 * scaling out means turning this off everywhere except one worker, and the flag
 * is what makes that possible without a code change.
 *
 * A proper fix is a database advisory lock around each tick. That is worth doing
 * when there is a second replica to justify it, and is noted rather than
 * pre-built.
 */
export const startScheduler = (): void => {
  if (!env.ENABLE_CRON) {
    logger.info('Scheduler disabled (ENABLE_CRON=false)');
    return;
  }

  for (const job of JOBS) {
    if (!cron.validate(job.schedule)) {
      // A typo'd expression must not fail silently — a reminder that never fires
      // looks exactly like a reminder with nothing to say.
      logger.error(`Invalid cron expression for job "${job.name}": ${job.schedule}`);
      continue;
    }

    tasks.push(cron.schedule(job.schedule, job.run, { timezone: env.CRON_TIMEZONE }));
    logger.info(`Scheduled job "${job.name}" (${job.schedule} ${env.CRON_TIMEZONE})`);
  }
};

export const stopScheduler = (): void => {
  for (const task of tasks) task.stop();
  tasks.length = 0;
};
