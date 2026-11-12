import { localStore } from '@/lib/storage';
import { sendIndividualEmail } from '@/lib/email/dispatcher';
import { Campaign, EmailLog, UserProfile, RecurrencePattern } from '@/types';
import { canSendMoreEmails, getUserLimits } from '@/lib/plan-limits';
import { isSupabaseConfigured } from '@/lib/supabase/client';

// In-memory campaign runner state tracking active execution loops
const activeRunners: Record<string, boolean> = {};

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
      const dbProfile = await getProfileByEmail(userEmail || 'rahul@growmoredigitally.in');
      if (dbProfile && dbProfile.smtp_user && dbProfile.smtp_pass) {
        profile = localStore.updateProfile(dbProfile, userEmail || 'rahul@growmoredigitally.in');
        return profile;
      }
    } catch (err) {
      console.error('Failed to sync profile from DB in runner:', err);
    }
  }

  if (profile.smtp_user && profile.smtp_pass) {
    return profile;
  }

  // Fallback 1: Check default/guest profile
  const defaultProfile = localStore.getProfile();
  if (defaultProfile.smtp_user && defaultProfile.smtp_pass) {
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

export async function startCampaignExecution(campaignId: string) {
  if (activeRunners[campaignId]) {
    return; // Already running
  }

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

  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    return;
  }

  // Pre-execution credentials check
  const profile = await resolveProfileWithSmtp(campaign.user_email);
  const hasOwnSmtp = Boolean((profile.smtp_user && profile.smtp_pass) || (profile.smtp_accounts && profile.smtp_accounts.length > 0));

  if (!hasOwnSmtp) {
    const quotaCheck = canSendMoreEmails(profile, 1);
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.reason || 'Plan email limit reached.');
    }
  }

  // Set status to sending
  localStore.updateCampaign(campaignId, { status: 'sending' });
  activeRunners[campaignId] = true;

  if (campaign.user_email && isSupabaseConfigured()) {
    try {
      const { saveCampaignsToDb } = await import('@/lib/supabase/db');
      const userCampaigns = localStore.getCampaigns(campaign.user_email);
      await saveCampaignsToDb(campaign.user_email, userCampaigns);
    } catch {}
  }

  // Run execution loop in background
  executeQueueLoop(campaignId);
}

export function pauseCampaignExecution(campaignId: string) {
  activeRunners[campaignId] = false;
  localStore.updateCampaign(campaignId, { status: 'paused' });
}

export function resumeCampaignExecution(campaignId: string) {
  startCampaignExecution(campaignId);
}

export function cancelCampaignExecution(campaignId: string) {
  activeRunners[campaignId] = false;
  localStore.updateCampaign(campaignId, { status: 'cancelled' });
}

export function retryCampaignExecution(campaignId: string) {
  activeRunners[campaignId] = false;
  const campaign = localStore.getCampaign(campaignId);
  if (!campaign) return;

  const logs = localStore.getLogs(campaignId);
  const remainingFailed = logs.filter((l) => l.status === 'failed').length;

  localStore.updateCampaign(campaignId, {
    status: 'draft',
    failed_count: Math.max(0, (campaign.failed_count || 0) - remainingFailed),
  });

  // Reset failed logs to allow re-dispatch
  for (const log of logs) {
    if (log.status === 'failed') {
      log.status = 'pending';
      log.retry_count = 0;
      delete log.error_message;
    }
  }

  startCampaignExecution(campaignId);
}

/**
 * Self-healing watchdog: revives any campaigns marked as 'sending' whose runner stopped
 */
export function ensureCampaignRunnerActive(campaignId: string) {
  const campaign = localStore.getCampaign(campaignId);
  if (campaign && campaign.status === 'sending' && !activeRunners[campaignId]) {
    activeRunners[campaignId] = true;
    executeQueueLoop(campaignId);
  }
}

/**
 * Scheduled Campaigns Processor:
 * Sweeps all scheduled campaigns, auto-triggers due ones, handles recurring schedules,
 * and guarantees every recipient in the list receives the mail.
 */
export async function checkAndExecuteScheduledCampaigns(): Promise<string[]> {
  const triggeredIds: string[] = [];
  try {
    if (isSupabaseConfigured()) {
      try {
        const { getAllScheduledCampaignsFromDb } = await import('@/lib/supabase/db');
        await getAllScheduledCampaignsFromDb();
      } catch (err) {
        console.error('[Scheduler] Failed to sync scheduled campaigns from DB:', err);
      }
    }

    const allScheduled = localStore.getAllScheduledCampaigns();
    const now = Date.now();

    for (const campaign of allScheduled) {
      const scheduledTarget = campaign.next_run_at || campaign.scheduled_at;
      if (!scheduledTarget) continue;

      const scheduledTime = new Date(scheduledTarget).getTime();
      if (!isNaN(scheduledTime) && scheduledTime <= now) {
        console.log(`[Scheduler] Auto-triggering scheduled campaign: "${campaign.name}" (${campaign.id})`);

        const isRecurring = campaign.schedule_type === 'recurring' && campaign.recurrence_pattern;

        if (isRecurring) {
          let nextRun = computeNextRunTime(
            new Date(scheduledTime),
            campaign.recurrence_pattern,
            campaign.recurrence_interval_hours || 24
          );
          // Ensure next run is strictly in the future
          while (nextRun.getTime() <= now) {
            nextRun = computeNextRunTime(
              nextRun,
              campaign.recurrence_pattern,
              campaign.recurrence_interval_hours || 24
            );
          }

          // Advance next_run_at while executing current cycle
          localStore.updateCampaign(campaign.id, {
            status: 'sending',
            scheduled_at: nextRun.toISOString(),
            next_run_at: nextRun.toISOString(),
            last_executed_at: new Date().toISOString(),
            execution_count: (campaign.execution_count || 0) + 1,
            sent_count: 0,
            failed_count: 0,
          });
        } else {
          // One-time schedule starts sending
          localStore.updateCampaign(campaign.id, {
            status: 'sending',
            last_executed_at: new Date().toISOString(),
            execution_count: (campaign.execution_count || 0) + 1,
          });
        }

        // Reset previous logs so ALL contacts get sent every time!
        localStore.resetCampaignLogsForRerun(campaign.id);

        try {
          await startCampaignExecution(campaign.id);
          triggeredIds.push(campaign.id);
        } catch (err: any) {
          console.error(`[Scheduler] Failed to trigger campaign ${campaign.id}:`, err?.message || err);
          localStore.updateCampaign(campaign.id, { status: isRecurring ? 'scheduled' : 'paused' });
          localStore.addLog({
            campaign_id: campaign.id,
            recipient_email: 'SYSTEM_SCHEDULER',
            recipient_name: 'Scheduler Engine',
            status: 'failed',
            retry_count: 0,
            error_message: `Scheduled launch failed: ${err?.message || 'Unknown error'}`,
          });
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error checking scheduled campaigns:', err);
  }
  return triggeredIds;
}

// Global in-process interval for periodic scheduled campaign sweeps
let schedulerTimer: NodeJS.Timeout | null = null;

export function initBackgroundScheduler() {
  if (schedulerTimer) return;
  // Run initial sweep
  checkAndExecuteScheduledCampaigns().catch(() => {});
  // Sweep every 15 seconds for precise delivery timing
  schedulerTimer = setInterval(() => {
    checkAndExecuteScheduledCampaigns().catch(() => {});
  }, 15000);
  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }
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

    // Contact resolution: check user-specific contacts, then global contacts
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
          localStore.addContacts(campaign.list_id, dbContacts, campaign.user_email);
        } else if (campaign.user_email) {
          const userContacts = await getContactsByUser(campaign.user_email, campaign.list_id);
          if (userContacts.length > 0) {
            contacts = userContacts;
            localStore.addContacts(campaign.list_id, userContacts, campaign.user_email);
          }
        }
      } catch (err) {
        console.error('Failed to sync contacts in campaign runner:', err);
      }
    }

    let profile = await resolveProfileWithSmtp(campaign.user_email);
    const existingLogs = localStore.getLogs(campaignId);
    const limits = getUserLimits(profile);
    const hasOwnSmtp = Boolean((profile.smtp_user && profile.smtp_pass) || (profile.smtp_accounts && profile.smtp_accounts.length > 0));

    // For user's own SMTP, send 100% of contacts; otherwise respect plan limits
    const maxCampaignCap = hasOwnSmtp ? contacts.length : Math.min(contacts.length, limits.maxEmailsPerCampaign);

    // Track which emails have already been dispatched successfully in this run
    const processedEmails = new Set(
      existingLogs.filter((l) => l.status === 'sent').map((l) => l.recipient_email)
    );

    const pendingContacts = contacts.slice(0, maxCampaignCap).filter((c) => !processedEmails.has(c.email));

    if (pendingContacts.length === 0) {
      // If recurring, revert status back to 'scheduled' for next run, else 'completed'
      if (campaign.schedule_type === 'recurring') {
        localStore.updateCampaign(campaignId, { status: 'scheduled' });
      } else {
        localStore.updateCampaign(campaignId, { status: 'completed' });
      }
      activeRunners[campaignId] = false;
      return;
    }

    // Rate limiting delay calculation (e.g. 50/min -> 1200ms per email)
    const delayMs = Math.max(200, Math.floor(60000 / (campaign.emails_per_minute || 50)));

    for (let i = 0; i < pendingContacts.length; i++) {
      // Check if runner was paused or cancelled mid-loop
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

      // Prepare Personalization Variables
      const variables: Record<string, string> = {
        firstname: contact.first_name || 'Valued',
        lastname: contact.last_name || 'Client',
        email: contact.email,
        company: contact.company || 'Partner',
        phone: contact.phone || '',
        ...(contact.custom_fields || {}),
      };

      // Round-Robin Sender Rotation
      const senderIndex = i;

      try {
        // Dispatch Email with automatic multi-account failover and exponential backoff
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
          senderIndex,
        });

        if (result.success) {
          localStore.incrementEmailsSent(1);
          if (profile.email) {
            import('@/lib/supabase/db').then(({ incrementEmailsSent }) => {
              incrementEmailsSent(profile.email, 1).catch(() => {});
            });
          }
          localStore.updateCampaign(campaignId, {
            sent_count: (campaign.sent_count || 0) + 1,
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
          localStore.updateCampaign(campaignId, {
            failed_count: (campaign.failed_count || 0) + 1,
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
        localStore.updateCampaign(campaignId, {
          failed_count: (campaign.failed_count || 0) + 1,
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

      // Delay for Rate Limiting Pace
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Auto-retry pass to guarantee "every mail sends every time"
    const currentLogs = localStore.getLogs(campaignId);
    const failedLogs = currentLogs.filter((l) => l.status === 'failed' && (l.retry_count || 0) < 3);

    if (failedLogs.length > 0 && campaign.auto_retry_failed !== false) {
      console.log(`[Campaign ${campaignId}] Executing automatic retry pass for ${failedLogs.length} recipient(s)...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      for (const failedLog of failedLogs) {
        if (!activeRunners[campaignId]) break;
        const contact = contacts.find((c) => c.email === failedLog.recipient_email);
        if (!contact) continue;

        const variables = failedLog.variables || { email: contact.email, firstname: contact.first_name || 'Valued' };
        try {
          const retryResult = await sendIndividualEmail({
            to: contact.email,
            senderName: campaign.sender_name || profile.sender_name || 'Automailer',
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
            senderIndex: 1, // Failover rotation
          });

          if (retryResult.success) {
            failedLog.status = 'sent';
            failedLog.sent_at = new Date().toISOString();
            delete failedLog.error_message;
            localStore.updateCampaign(campaignId, {
              sent_count: Math.min(contacts.length, (campaign.sent_count || 0) + 1),
              failed_count: Math.max(0, (campaign.failed_count || 0) - 1),
            });
          }
        } catch {}
      }
    }

    // Mark completed or scheduled for next recurring cycle
    const updatedCampaign = localStore.getCampaign(campaignId);
    if (updatedCampaign && updatedCampaign.status === 'sending') {
      const updatedLogs = localStore.getLogs(campaignId);
      const totalProcessed = updatedLogs.filter((l) => l.status === 'sent' || l.status === 'failed').length;
      if (totalProcessed >= contacts.length) {
        if (updatedCampaign.schedule_type === 'recurring') {
          localStore.updateCampaign(campaignId, { status: 'scheduled' });
        } else {
          localStore.updateCampaign(campaignId, { status: 'completed' });
        }
      }
    }

    const finalCampaign = localStore.getCampaign(campaignId);
    if (finalCampaign && finalCampaign.user_email && isSupabaseConfigured()) {
      try {
        const { getCampaignsByUser, saveCampaignsToDb } = await import('@/lib/supabase/db');
        const existing = await getCampaignsByUser(finalCampaign.user_email);
        const filtered = existing.filter((c) => c.id !== campaignId);
        await saveCampaignsToDb(finalCampaign.user_email, [finalCampaign, ...filtered]);
      } catch (err) {
        console.error('Failed to sync completed campaign to DB:', err);
      }
    }
  } catch (err) {
    console.error(`Execution error for campaign ${campaignId}:`, err);
  } finally {
    activeRunners[campaignId] = false;
  }
}
