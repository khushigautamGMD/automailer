import { localStore } from '@/lib/storage';
import { sendIndividualEmail } from '@/lib/email/dispatcher';
import { Campaign, UserProfile, RecurrencePattern } from '@/types';
import { canSendMoreEmails, getUserLimits } from '@/lib/plan-limits';
import { isSupabaseConfigured } from '@/lib/supabase/client';

// Maximum overdue grace window for one-time scheduled campaigns (30 minutes).
// Campaigns older than this are auto-paused instead of firing expired offers.
const MAX_OVERDUE_GRACE_MS = 30 * 60 * 1000;

// Campaigns stuck in 'sending' with no active runner for 2+ hours are auto-paused.
const STALE_SENDING_MS = 2 * 60 * 60 * 1000;

// Share runner state across Next.js route bundles in the same Node.js process
const globalForRunner = globalThis as unknown as {
  __automailerActiveRunners?: Record<string, boolean>;
  __automailerSchedulerTimer?: NodeJS.Timeout | null;
  __automailerSweepPromise?: Promise<SweepResult> | null;
};

const activeRunners: Record<string, boolean> =
  globalForRunner.__automailerActiveRunners ||
  (globalForRunner.__automailerActiveRunners = {});

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function persistCampaignToDb(campaign: Campaign | null | undefined) {
  if (!campaign || !campaign.user_email || !isSupabaseConfigured()) return;
  try {
    const { saveSingleCampaignToDb } = await import('@/lib/supabase/db');
    await withTimeout(saveSingleCampaignToDb(campaign.user_email, campaign), 5000, undefined);
  } catch (err) {
    console.error(`[Campaign ${campaign?.id}] Failed to persist campaign to DB:`, err);
  }
}

/**
 * Multi-tier credential resolution:
 * 1. Campaign user's profile
 * 2. Default/guest profile
 * 3. Environment variables (SMTP_USER, SMTP_PASS, etc.)
 */
async function resolveProfileWithSmtp(userEmail?: string): Promise<UserProfile> {
  let profile = localStore.getProfile(userEmail);

  // If missing credentials and Supabase is configured, fetch from DB
  if ((!profile.smtp_user || !profile.smtp_pass) && isSupabaseConfigured()) {
    try {
      const { getProfileByEmail } = await import('@/lib/supabase/db');
      const lookupEmail = userEmail || 'rahul@growmoredigitally.in';
      const dbProfile = await getProfileByEmail(lookupEmail);
      if (dbProfile && (dbProfile.smtp_user || (dbProfile.smtp_accounts && dbProfile.smtp_accounts.length > 0))) {
        profile = localStore.updateProfile(dbProfile, lookupEmail);
        if (profile.smtp_user && profile.smtp_pass) {
          return profile;
        }
      }
    } catch (err) {
      console.error('Failed to sync profile from DB in runner:', err);
    }
  }

  if ((profile.smtp_user && profile.smtp_pass) || (profile.smtp_accounts && profile.smtp_accounts.length > 0)) {
    return profile;
  }

  // Fallback 1: Check default/guest profile
  const defaultProfile = localStore.getProfile();
  if ((defaultProfile.smtp_user && defaultProfile.smtp_pass) || (defaultProfile.smtp_accounts && defaultProfile.smtp_accounts.length > 0)) {
    return { ...profile, ...defaultProfile };
  }

  // Fallback 2: Environment variables
  const envUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const envPass = process.env.SMTP_PASS || process.env.GMAIL_PASS;
  if (envUser && envPass) {
    return {
      ...profile,
      smtp_user: envUser,
      smtp_pass: envPass,
      smtp_host: process.env.SMTP_HOST || profile.smtp_host || 'smtp.gmail.com',
      smtp_port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : profile.smtp_port || 587,
    };
  }

  return profile;
}

/**
 * Calculate the next run time for recurring campaigns
 */
export function computeNextRunTime(
  baseDate: Date,
  pattern: RecurrencePattern = 'daily',
  intervalHours: number = 24
): Date {
  const next = new Date(baseDate.getTime());
  switch (pattern) {
    case 'hourly':
      next.setHours(next.getHours() + 1);
      break;
    case 'custom_hours':
      next.setHours(next.getHours() + Math.max(1, intervalHours));
      break;
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekdays':
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 0 || next.getDay() === 6); // Skip Sun and Sat
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }
  return next;
}

export async function startCampaignExecution(
  campaignId: string,
  onLoopPromise?: (p: Promise<void>) => void
) {
  if (activeRunners[campaignId]) {
    return; // Already running
  }

  activeRunners[campaignId] = true;

  try {
    let campaign = localStore.getCampaign(campaignId);
    if (!campaign && isSupabaseConfigured()) {
      try {
        const { getCampaignByIdFromDb } = await import('@/lib/supabase/db');
        const dbCamp = await getCampaignByIdFromDb(campaignId);
        if (dbCamp) {
          campaign = dbCamp;
        }
      } catch (err) {
        console.error(`Failed to load campaign ${campaignId} from DB in runner:`, err);
      }
    }

    if (!campaign) {
      activeRunners[campaignId] = false;
      throw new Error('Campaign not found');
    }

    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      activeRunners[campaignId] = false;
      return;
    }

    // Pre-execution credentials check
    const profile = await resolveProfileWithSmtp(campaign.user_email);
    const hasOwnSmtp = Boolean(
      (profile.smtp_user && profile.smtp_pass) ||
        (profile.smtp_accounts && profile.smtp_accounts.some((a) => a.active && a.user && a.pass))
    );

    if (!hasOwnSmtp) {
      const quotaCheck = canSendMoreEmails(profile, 1);
      if (!quotaCheck.allowed) {
        activeRunners[campaignId] = false;
        throw new Error(quotaCheck.reason || 'Plan email limit reached.');
      }
    }

    // Set status to sending and persist to DB before starting loop
    const updated = localStore.updateCampaign(campaignId, {
      status: 'sending',
      last_executed_at: new Date().toISOString(),
      schedule_note: undefined,
    });
    await persistCampaignToDb(updated || { ...campaign, status: 'sending' });

    const loopPromise = executeQueueLoop(campaignId);
    if (onLoopPromise) {
      onLoopPromise(loopPromise);
    }
  } catch (err) {
    activeRunners[campaignId] = false;
    throw err;
  }
}

export function pauseCampaignExecution(campaignId: string) {
  activeRunners[campaignId] = false;
  const updated = localStore.updateCampaign(campaignId, { status: 'paused' });
  persistCampaignToDb(updated).catch(() => {});
}

export function resumeCampaignExecution(
  campaignId: string,
  onLoopPromise?: (p: Promise<void>) => void
) {
  return startCampaignExecution(campaignId, onLoopPromise);
}

export function cancelCampaignExecution(campaignId: string) {
  activeRunners[campaignId] = false;
  const updated = localStore.updateCampaign(campaignId, { status: 'cancelled' });
  persistCampaignToDb(updated).catch(() => {});
}

export function retryCampaignExecution(
  campaignId: string,
  onLoopPromise?: (p: Promise<void>) => void
) {
  activeRunners[campaignId] = false;
  const campaign = localStore.getCampaign(campaignId);
  if (!campaign) return;

  const logs = localStore.getLogs(campaignId);
  const remainingFailed = logs.filter((l) => l.status === 'failed').length;

  localStore.updateCampaign(campaignId, {
    status: 'draft',
    failed_count: Math.max(0, (campaign.failed_count || 0) - remainingFailed),
    failed_recipients: [],
  });

  // Reset failed logs to allow re-dispatch
  for (const log of logs) {
    if (log.status === 'failed') {
      log.status = 'pending';
      log.retry_count = 0;
      delete log.error_message;
    }
  }

  return startCampaignExecution(campaignId, onLoopPromise);
}

/**
 * Self-healing watchdog: revives recent campaigns marked as 'sending' whose runner disconnected,
 * while auto-pausing stale orphaned 'sending' campaigns (2+ hours old) so old offers never fire.
 */
export function ensureCampaignRunnerActive(
  campaignId: string,
  onLoopPromise?: (p: Promise<void>) => void
) {
  const campaign = localStore.getCampaign(campaignId);
  if (!campaign || campaign.status !== 'sending' || activeRunners[campaignId]) {
    return;
  }

  const refEpoch = new Date(campaign.last_executed_at || campaign.updated_at || campaign.created_at || 0).getTime();
  if (!isNaN(refEpoch) && Date.now() - refEpoch > STALE_SENDING_MS) {
    const paused = localStore.updateCampaign(campaignId, {
      status: 'paused',
      schedule_note: 'Auto-paused: campaign was left in sending state for 2+ hours.',
    });
    persistCampaignToDb(paused).catch(() => {});
    return;
  }

  activeRunners[campaignId] = true;
  const loopPromise = executeQueueLoop(campaignId);
  if (onLoopPromise) {
    onLoopPromise(loopPromise);
  }
}

export interface SweepResult {
  triggeredIds: string[];
  expiredPausedIds: string[];
  staleSendingPausedIds: string[];
}

/**
 * Scheduled Campaigns Processor:
 * - Cleans up stale orphaned 'sending' campaigns (>2h inactive) by pausing them safely.
 * - Auto-pauses overdue one-time scheduled campaigns (>30m past scheduled time) so closed offers never fire.
 * - Advances overdue recurring schedules to their next future occurrence without firing missed cycles.
 * - Triggers due scheduled campaigns within the active window.
 */
export async function sweepScheduledCampaigns(
  onLoopPromise?: (p: Promise<void>) => void
): Promise<SweepResult> {
  let priorResult: SweepResult | null = null;
  if (globalForRunner.__automailerSweepPromise) {
    try {
      priorResult = await globalForRunner.__automailerSweepPromise;
    } catch {}
  }

  const runPromise = runSweepInternal(onLoopPromise);
  globalForRunner.__automailerSweepPromise = runPromise;
  try {
    const currentResult = await runPromise;
    if (!priorResult) return currentResult;
    return {
      triggeredIds: Array.from(new Set([...priorResult.triggeredIds, ...currentResult.triggeredIds])),
      expiredPausedIds: Array.from(new Set([...priorResult.expiredPausedIds, ...currentResult.expiredPausedIds])),
      staleSendingPausedIds: Array.from(
        new Set([...priorResult.staleSendingPausedIds, ...currentResult.staleSendingPausedIds])
      ),
    };
  } finally {
    if (globalForRunner.__automailerSweepPromise === runPromise) {
      globalForRunner.__automailerSweepPromise = null;
    }
  }
}

async function runSweepInternal(
  onLoopPromise?: (p: Promise<void>) => void
): Promise<SweepResult> {
  const result: SweepResult = {
    triggeredIds: [],
    expiredPausedIds: [],
    staleSendingPausedIds: [],
  };

  try {
    if (isSupabaseConfigured()) {
      try {
        const { getAllScheduledCampaignsFromDb } = await import('@/lib/supabase/db');
        await withTimeout(getAllScheduledCampaignsFromDb(), 5000, []);
      } catch (err) {
        console.error('[Scheduler] Failed to sync scheduled campaigns from DB:', err);
      }
    }

    const now = Date.now();
    const allCampaigns = localStore.getCampaigns();

    // 1. Clean up stale 'sending' campaigns that have no active runner and have been idle > 2h
    for (const c of allCampaigns) {
      if (c.status === 'sending' && !activeRunners[c.id]) {
        const refEpoch = new Date(c.last_executed_at || c.updated_at || c.created_at || 0).getTime();
        if (!isNaN(refEpoch) && now - refEpoch > STALE_SENDING_MS) {
          console.log(`[Scheduler] Auto-pausing stale sending campaign "${c.name}" (${c.id})`);
          const paused = localStore.updateCampaign(c.id, {
            status: 'paused',
            schedule_note: 'Auto-paused after remaining inactive in Sending state.',
          });
          localStore.addLog({
            campaign_id: c.id,
            recipient_email: 'SYSTEM_SCHEDULER',
            recipient_name: 'Scheduler Guard',
            status: 'failed',
            retry_count: 0,
            error_message: 'Campaign was stuck in Sending state for over 2 hours and was safely paused.',
          });
          await persistCampaignToDb(paused || { ...c, status: 'paused' });
          result.staleSendingPausedIds.push(c.id);
        }
      }
    }

    // 2. Evaluate all 'scheduled' campaigns
    const allScheduled = localStore.getAllScheduledCampaigns();

    for (const campaign of allScheduled) {
      const scheduledTarget = campaign.next_run_at || campaign.scheduled_at;
      if (!scheduledTarget) continue;

      const scheduledTime = new Date(scheduledTarget).getTime();
      if (isNaN(scheduledTime) || scheduledTime > now) {
        continue;
      }

      const overdueMs = now - scheduledTime;
      const isRecurring = campaign.schedule_type === 'recurring' && Boolean(campaign.recurrence_pattern);

      // Overdue protection: never fire campaigns whose scheduled window passed > 30 minutes ago
      if (overdueMs > MAX_OVERDUE_GRACE_MS) {
        const overdueMins = Math.round(overdueMs / 60000);
        if (isRecurring) {
          let nextRun = computeNextRunTime(
            new Date(scheduledTime),
            campaign.recurrence_pattern,
            campaign.recurrence_interval_hours || 24
          );
          while (nextRun.getTime() <= now) {
            nextRun = computeNextRunTime(
              nextRun,
              campaign.recurrence_pattern,
              campaign.recurrence_interval_hours || 24
            );
          }
          console.log(
            `[Scheduler] Skipped overdue recurring window (${overdueMins}m late) for "${campaign.name}" (${campaign.id}); next run set to ${nextRun.toISOString()}`
          );
          const updated = localStore.updateCampaign(campaign.id, {
            status: 'scheduled',
            scheduled_at: nextRun.toISOString(),
            next_run_at: nextRun.toISOString(),
            schedule_note: `Skipped missed window (${overdueMins}m overdue); rescheduled to next cycle.`,
          });
          await persistCampaignToDb(updated);
        } else {
          console.log(
            `[Scheduler] Auto-pausing overdue one-time campaign "${campaign.name}" (${campaign.id}, ${overdueMins}m overdue)`
          );
          const paused = localStore.updateCampaign(campaign.id, {
            status: 'paused',
            schedule_note: `Missed scheduled window (${overdueMins}m overdue). Auto-paused to prevent sending expired offers.`,
          });
          localStore.addLog({
            campaign_id: campaign.id,
            recipient_email: 'SYSTEM_SCHEDULER',
            recipient_name: 'Scheduler Guard',
            status: 'failed',
            retry_count: 0,
            error_message: `Scheduled send time passed (${overdueMins} minutes overdue). Auto-paused so expired offers are not sent.`,
          });
          await persistCampaignToDb(paused || { ...campaign, status: 'paused' });
          result.expiredPausedIds.push(campaign.id);
        }
        continue;
      }

      if (activeRunners[campaign.id]) {
        continue;
      }

      console.log(`[Scheduler] Auto-triggering scheduled campaign: "${campaign.name}" (${campaign.id})`);

      if (isRecurring) {
        let nextRun = computeNextRunTime(
          new Date(scheduledTime),
          campaign.recurrence_pattern,
          campaign.recurrence_interval_hours || 24
        );
        while (nextRun.getTime() <= now) {
          nextRun = computeNextRunTime(
            nextRun,
            campaign.recurrence_pattern,
            campaign.recurrence_interval_hours || 24
          );
        }

        localStore.updateCampaign(campaign.id, {
          status: 'sending',
          scheduled_at: nextRun.toISOString(),
          next_run_at: nextRun.toISOString(),
          last_executed_at: new Date().toISOString(),
          execution_count: (campaign.execution_count || 0) + 1,
          sent_count: 0,
          failed_count: 0,
          sent_recipients: [],
          failed_recipients: [],
          schedule_note: undefined,
        });
      } else {
        localStore.updateCampaign(campaign.id, {
          status: 'sending',
          last_executed_at: new Date().toISOString(),
          execution_count: (campaign.execution_count || 0) + 1,
          sent_count: 0,
          failed_count: 0,
          sent_recipients: [],
          failed_recipients: [],
          schedule_note: undefined,
        });
      }

      // Reset previous logs so all contacts get dispatched cleanly for this run
      localStore.resetCampaignLogsForRerun(campaign.id);

      try {
        await startCampaignExecution(campaign.id, onLoopPromise);
        result.triggeredIds.push(campaign.id);
      } catch (err: any) {
        console.error(`[Scheduler] Failed to trigger campaign ${campaign.id}:`, err?.message || err);
        const reverted = localStore.updateCampaign(campaign.id, {
          status: isRecurring ? 'scheduled' : 'paused',
          schedule_note: `Scheduled launch failed: ${err?.message || 'Unknown error'}`,
        });
        localStore.addLog({
          campaign_id: campaign.id,
          recipient_email: 'SYSTEM_SCHEDULER',
          recipient_name: 'Scheduler Engine',
          status: 'failed',
          retry_count: 0,
          error_message: `Scheduled launch failed: ${err?.message || 'Unknown error'}`,
        });
        await persistCampaignToDb(reverted);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error checking scheduled campaigns:', err);
  }

  return result;
}

export async function checkAndExecuteScheduledCampaigns(): Promise<string[]> {
  const { triggeredIds } = await sweepScheduledCampaigns();
  return triggeredIds;
}

export function initBackgroundScheduler() {
  if (globalForRunner.__automailerSchedulerTimer) return;
  // Run initial sweep
  sweepScheduledCampaigns().catch(() => {});
  // Sweep every 15 seconds for precise delivery timing
  const timer = setInterval(() => {
    sweepScheduledCampaigns().catch(() => {});
  }, 15000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
  globalForRunner.__automailerSchedulerTimer = timer;
}

// Auto-initialize scheduler on server load
initBackgroundScheduler();

async function executeQueueLoop(campaignId: string) {
  try {
    let campaign = localStore.getCampaign(campaignId);
    if (!campaign && isSupabaseConfigured()) {
      try {
        const { getCampaignByIdFromDb } = await import('@/lib/supabase/db');
        const dbCamp = await getCampaignByIdFromDb(campaignId);
        if (dbCamp) {
          campaign = dbCamp;
        }
      } catch {}
    }
    if (!campaign) return;

    // Contact resolution: check user-specific contacts, then global contacts, then Supabase DB
    let contacts = localStore.getContacts(campaign.user_email, campaign.list_id);
    if (contacts.length === 0 && campaign.list_id) {
      contacts = localStore.getContacts(campaign.list_id);
    }

    if (contacts.length === 0 && isSupabaseConfigured() && campaign.list_id) {
      try {
        const { getContactsByListId, getContactsByUser } = await import('@/lib/supabase/db');
        const dbContacts = await getContactsByListId(campaign.list_id);
        if (dbContacts.length > 0) {
          contacts = dbContacts;
          localStore.upsertContacts(campaign.list_id, dbContacts, campaign.user_email);
        } else if (campaign.user_email) {
          const userContacts = await getContactsByUser(campaign.user_email, campaign.list_id);
          if (userContacts.length > 0) {
            contacts = userContacts;
            localStore.upsertContacts(campaign.list_id, userContacts, campaign.user_email);
          }
        }
      } catch (err) {
        console.error('Failed to sync contacts in campaign runner:', err);
      }
    }

    if (contacts.length === 0) {
      const paused = localStore.updateCampaign(campaignId, {
        status: 'paused',
        schedule_note: 'No recipients found for the selected contact list.',
      });
      localStore.addLog({
        campaign_id: campaignId,
        recipient_email: 'SYSTEM_ALERT',
        recipient_name: 'Campaign Runner',
        status: 'failed',
        retry_count: 0,
        error_message: `No recipients found for list "${campaign.list_id || 'unknown'}".`,
      });
      await persistCampaignToDb(paused);
      return;
    }

    let profile = await resolveProfileWithSmtp(campaign.user_email);
    const existingLogs = localStore.getLogs(campaignId);
    const limits = getUserLimits(profile);
    const hasOwnSmtp = Boolean(
      (profile.smtp_user && profile.smtp_pass) ||
        (profile.smtp_accounts && profile.smtp_accounts.some((a) => a.active && a.user && a.pass))
    );

    const maxCampaignCap = hasOwnSmtp ? contacts.length : Math.min(contacts.length, limits.maxEmailsPerCampaign);

    // Track already-dispatched emails across both local logs and DB-persisted sent_recipients
    const sentRecipientsSet = new Set<string>(
      [
        ...existingLogs.filter((l) => l.status === 'sent').map((l) => l.recipient_email.toLowerCase()),
        ...(campaign.sent_recipients || []).map((e) => e.toLowerCase()),
      ]
    );
    const failedRecipientsSet = new Set<string>(
      existingLogs
        .filter((l) => l.status === 'failed' && l.recipient_email !== 'SYSTEM_ALERT' && l.recipient_email !== 'SYSTEM_SCHEDULER')
        .map((l) => l.recipient_email.toLowerCase())
    );

    const pendingContacts = contacts
      .slice(0, maxCampaignCap)
      .filter((c) => !sentRecipientsSet.has(c.email.toLowerCase()));

    if (pendingContacts.length === 0) {
      const nextStatus = campaign.schedule_type === 'recurring' ? 'scheduled' : 'completed';
      const doneCamp = localStore.updateCampaign(campaignId, {
        status: nextStatus,
        sent_count: sentRecipientsSet.size,
      });
      await persistCampaignToDb(doneCamp);
      return;
    }

    // Rate limiting delay calculation (e.g. 50/min -> 1200ms per email)
    const delayMs = Math.max(200, Math.floor(60000 / (campaign.emails_per_minute || 50)));
    let lastDbPersistTime = Date.now();
    let unsyncedUpdates = 0;

    for (let i = 0; i < pendingContacts.length; i++) {
      if (!activeRunners[campaignId]) {
        break;
      }

      campaign = localStore.getCampaign(campaignId);
      if (!campaign || campaign.status !== 'sending') {
        activeRunners[campaignId] = false;
        break;
      }

      // Check monthly quota limits mid-loop only if NOT using own SMTP
      if (!hasOwnSmtp) {
        profile = await resolveProfileWithSmtp(campaign.user_email);
        const quotaCheck = canSendMoreEmails(profile, 1);
        if (!quotaCheck.allowed) {
          console.warn(`[Campaign ${campaignId}] Quota limit hit during dispatch: ${quotaCheck.reason}`);
          localStore.updateCampaign(campaignId, { status: 'paused' });
          localStore.addLog({
            campaign_id: campaignId,
            recipient_email: 'SYSTEM_ALERT',
            recipient_name: 'System Alert',
            status: 'failed',
            retry_count: 0,
            error_message: quotaCheck.reason || 'Plan monthly email limit reached. Campaign auto-paused.',
          });
          activeRunners[campaignId] = false;
          break;
        }
      }

      const contact = pendingContacts[i];

      const variables: Record<string, string> = {
        firstname: contact.first_name || 'Valued',
        lastname: contact.last_name || 'Client',
        email: contact.email,
        company: contact.company || 'Partner',
        phone: contact.phone || '',
        ...(contact.custom_fields || {}),
      };

      try {
        const result = await sendIndividualEmail({
          to: contact.email,
          senderName: campaign.sender_name || profile.sender_name || 'GrowMore Digitally',
          senderEmail: campaign.reply_to || profile.reply_to_email || profile.email,
          replyTo: campaign.reply_to || profile.reply_to_email,
          subject: campaign.subject,
          bodyHtml: campaign.body_html,
          variables,
          resendApiKey: profile.resend_api_key,
          smtpHost: profile.smtp_host,
          smtpPort: profile.smtp_port,
          smtpUser: profile.smtp_user,
          smtpPass: profile.smtp_pass,
          smtpAccounts: profile.smtp_accounts,
          senderIndex: i,
        });

        if (result.success) {
          sentRecipientsSet.add(contact.email.toLowerCase());
          failedRecipientsSet.delete(contact.email.toLowerCase());

          localStore.incrementEmailsSent(1, campaign.user_email || profile.email);
          if (profile.email) {
            import('@/lib/supabase/db').then(({ incrementEmailsSent }) => {
              incrementEmailsSent(profile.email, 1).catch(() => {});
            });
          }

          localStore.updateCampaign(campaignId, {
            sent_count: sentRecipientsSet.size,
            failed_count: failedRecipientsSet.size,
            sent_recipients: Array.from(sentRecipientsSet),
            failed_recipients: Array.from(failedRecipientsSet),
            last_executed_at: new Date().toISOString(),
          });

          localStore.addLog({
            campaign_id: campaignId,
            recipient_email: contact.email,
            recipient_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
            sender_used: result.senderUsed,
            status: 'sent',
            retry_count: 0,
            sent_at: new Date().toISOString(),
            variables,
          });
        } else {
          failedRecipientsSet.add(contact.email.toLowerCase());
          localStore.updateCampaign(campaignId, {
            failed_count: failedRecipientsSet.size,
            failed_recipients: Array.from(failedRecipientsSet),
            last_executed_at: new Date().toISOString(),
          });

          localStore.addLog({
            campaign_id: campaignId,
            recipient_email: contact.email,
            recipient_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
            sender_used: result.senderUsed,
            status: 'failed',
            retry_count: 1,
            error_message: result.error,
            variables,
          });
        }
      } catch (singleSendErr: any) {
        console.error(`[Campaign ${campaignId}] Error dispatching to ${contact.email}:`, singleSendErr);
        failedRecipientsSet.add(contact.email.toLowerCase());
        localStore.updateCampaign(campaignId, {
          failed_count: failedRecipientsSet.size,
          failed_recipients: Array.from(failedRecipientsSet),
          last_executed_at: new Date().toISOString(),
        });
        localStore.addLog({
          campaign_id: campaignId,
          recipient_email: contact.email,
          recipient_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          status: 'failed',
          retry_count: 1,
          error_message: singleSendErr?.message || 'Unexpected dispatch error',
          variables,
        });
      }

      unsyncedUpdates++;
      if (unsyncedUpdates >= 5 || Date.now() - lastDbPersistTime >= 3000) {
        await persistCampaignToDb(localStore.getCampaign(campaignId));
        unsyncedUpdates = 0;
        lastDbPersistTime = Date.now();
      }

      // Delay for Rate Limiting Pace
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Auto-retry pass for failed recipients
    const currentLogs = localStore.getLogs(campaignId);
    const failedLogs = currentLogs.filter(
      (l) =>
        l.status === 'failed' &&
        (l.retry_count || 0) < 3 &&
        l.recipient_email !== 'SYSTEM_ALERT' &&
        l.recipient_email !== 'SYSTEM_SCHEDULER'
    );

    const latestBeforeRetry = localStore.getCampaign(campaignId);
    if (failedLogs.length > 0 && latestBeforeRetry?.auto_retry_failed !== false && activeRunners[campaignId]) {
      console.log(`[Campaign ${campaignId}] Executing automatic retry pass for ${failedLogs.length} recipient(s)...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      for (const failedLog of failedLogs) {
        if (!activeRunners[campaignId]) break;
        const contact = contacts.find((c) => c.email.toLowerCase() === failedLog.recipient_email.toLowerCase());
        if (!contact) continue;

        const variables = failedLog.variables || {
          email: contact.email,
          firstname: contact.first_name || 'Valued',
        };
        try {
          const retryResult = await sendIndividualEmail({
            to: contact.email,
            senderName: latestBeforeRetry?.sender_name || profile.sender_name || 'Automailer',
            senderEmail: latestBeforeRetry?.reply_to || profile.reply_to_email || profile.email,
            replyTo: latestBeforeRetry?.reply_to || profile.reply_to_email,
            subject: latestBeforeRetry?.subject || '',
            bodyHtml: latestBeforeRetry?.body_html || '',
            variables,
            resendApiKey: profile.resend_api_key,
            smtpHost: profile.smtp_host,
            smtpPort: profile.smtp_port,
            smtpUser: profile.smtp_user,
            smtpPass: profile.smtp_pass,
            smtpAccounts: profile.smtp_accounts,
            senderIndex: 1,
          });

          if (retryResult.success) {
            failedLog.status = 'sent';
            failedLog.sent_at = new Date().toISOString();
            delete failedLog.error_message;
            sentRecipientsSet.add(contact.email.toLowerCase());
            failedRecipientsSet.delete(contact.email.toLowerCase());
            localStore.updateCampaign(campaignId, {
              sent_count: sentRecipientsSet.size,
              failed_count: failedRecipientsSet.size,
              sent_recipients: Array.from(sentRecipientsSet),
              failed_recipients: Array.from(failedRecipientsSet),
              last_executed_at: new Date().toISOString(),
            });
          }
        } catch {}
      }
    }

    // Mark completed or scheduled for next recurring cycle
    const updatedCampaign = localStore.getCampaign(campaignId);
    if (updatedCampaign && updatedCampaign.status === 'sending') {
      const totalProcessed = sentRecipientsSet.size + failedRecipientsSet.size;
      if (totalProcessed >= Math.min(contacts.length, maxCampaignCap)) {
        if (updatedCampaign.schedule_type === 'recurring') {
          localStore.updateCampaign(campaignId, { status: 'scheduled' });
        } else {
          localStore.updateCampaign(campaignId, { status: 'completed' });
        }
      }
    }
  } catch (err) {
    console.error(`Execution error for campaign ${campaignId}:`, err);
  } finally {
    activeRunners[campaignId] = false;
    await persistCampaignToDb(localStore.getCampaign(campaignId));
  }
}
