import { localStore } from '@/lib/storage';
import { sendIndividualEmail } from '@/lib/email/dispatcher';
import { Campaign, EmailLog } from '@/types';
import { canSendMoreEmails, getUserLimits } from '@/lib/plan-limits';

// In-memory campaign runner state tracking active execution loops
const activeRunners: Record<string, boolean> = {};

export async function startCampaignExecution(campaignId: string) {
  if (activeRunners[campaignId]) {
    return; // Already running
  }

  const campaign = localStore.getCampaign(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    return;
  }

  // Pre-execution plan limits check
  const profile = localStore.getProfile();
  const quotaCheck = canSendMoreEmails(profile, 1);
  if (!quotaCheck.allowed) {
    throw new Error(quotaCheck.reason || 'Plan email limit reached.');
  }

  // Set status to sending
  localStore.updateCampaign(campaignId, { status: 'sending' });
  activeRunners[campaignId] = true;

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

async function executeQueueLoop(campaignId: string) {
  try {
    let campaign = localStore.getCampaign(campaignId);
    if (!campaign) return;

    const contacts = localStore.getContacts(campaign.list_id);
    let profile = localStore.getProfile();
    const existingLogs = localStore.getLogs(campaignId);
    const limits = getUserLimits(profile);

    // Enforce Per-Campaign Email Cap (e.g., Demo plan max 10 emails per campaign)
    const maxCampaignCap = Math.min(contacts.length, limits.maxEmailsPerCampaign);

    // Track which emails have already been dispatched or failed max retries
    const processedEmails = new Set(
      existingLogs.filter((l) => l.status === 'sent' || (l.status === 'failed' && l.retry_count >= 3)).map((l) => l.recipient_email)
    );

    const pendingContacts = contacts.slice(0, maxCampaignCap).filter((c) => !processedEmails.has(c.email));

    if (pendingContacts.length === 0) {
      localStore.updateCampaign(campaignId, { status: 'completed' });
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

      // Check monthly quota limits mid-loop
      profile = localStore.getProfile();
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

      const contact = pendingContacts[i];

      // Prepare Personalization Variables
      const variables: Record<string, string | undefined> = {
        firstname: contact.first_name || 'Valued',
        lastname: contact.last_name || 'Client',
        email: contact.email,
        company: contact.company || 'Partner',
        phone: contact.phone || '',
        ...contact.custom_fields,
      };

      // Round-Robin Sender Rotation
      const senderIndex = i;

      // Dispatch Email via Dispatcher
      const result = await sendIndividualEmail({
        to: contact.email,
        senderName: campaign.sender_name || profile.sender_name || 'GrowMore Digitally',
        senderEmail: profile.email,
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

      // Delay for Rate Limiting Pace
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Mark completed if queue is empty
    const updatedCampaign = localStore.getCampaign(campaignId);
    if (updatedCampaign && updatedCampaign.status === 'sending') {
      const updatedLogs = localStore.getLogs(campaignId);
      const totalProcessed = updatedLogs.filter((l) => l.status === 'sent' || l.status === 'failed').length;
      if (totalProcessed >= contacts.length) {
        localStore.updateCampaign(campaignId, { status: 'completed' });
      }
    }
  } catch (err) {
    console.error(`Execution error for campaign ${campaignId}:`, err);
  } finally {
    activeRunners[campaignId] = false;
  }
}
