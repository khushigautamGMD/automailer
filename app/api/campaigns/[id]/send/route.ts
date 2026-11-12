import { NextResponse } from 'next/server';
import {
  startCampaignExecution,
  pauseCampaignExecution,
  resumeCampaignExecution,
  cancelCampaignExecution,
  retryCampaignExecution,
} from '@/lib/queue/campaign-runner';
import { localStore } from '@/lib/storage';
import { canSendMoreEmails } from '@/lib/plan-limits';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body; // 'start' | 'pause' | 'resume' | 'cancel'

    let campaign = localStore.getCampaign(id);
    if (!campaign && isSupabaseConfigured()) {
      try {
        const { getCampaignByIdFromDb } = await import('@/lib/supabase/db');
        const dbCamp = await getCampaignByIdFromDb(id);
        if (dbCamp) {
          campaign = dbCamp;
        }
      } catch (err) {}
    }
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (action === 'start' || action === 'send_now') {
      const profile = localStore.getProfile(campaign.user_email);
      const hasOwnSmtp = Boolean((profile.smtp_user && profile.smtp_pass) || (profile.smtp_accounts && profile.smtp_accounts.length > 0));

      if (!hasOwnSmtp) {
        const quotaCheck = canSendMoreEmails(profile, 1);
        if (!quotaCheck.allowed) {
          return NextResponse.json({ error: quotaCheck.reason }, { status: 403 });
        }
      }

      // If scheduled campaign is being fired now, advance next schedule if recurring
      if (campaign.status === 'scheduled') {
        if (campaign.schedule_type === 'recurring' && campaign.recurrence_pattern) {
          const { computeNextRunTime } = await import('@/lib/queue/campaign-runner');
          const next = computeNextRunTime(
            new Date(),
            campaign.recurrence_pattern,
            campaign.recurrence_interval_hours || 24
          );
          localStore.updateCampaign(id, {
            status: 'sending',
            scheduled_at: next.toISOString(),
            next_run_at: next.toISOString(),
            last_executed_at: new Date().toISOString(),
            sent_count: 0,
            failed_count: 0,
          });
        } else {
          localStore.updateCampaign(id, {
            status: 'sending',
            scheduled_at: undefined,
            next_run_at: undefined,
            last_executed_at: new Date().toISOString(),
            sent_count: 0,
            failed_count: 0,
          });
        }
      }

      // Reset previous logs to ensure every single email in the list sends
      localStore.resetCampaignLogsForRerun(id);

      // Trigger execution in non-blocking background task
      startCampaignExecution(id);

      // Sync state back to DB
      if (campaign.user_email) {
        const { isSupabaseConfigured } = await import('@/lib/supabase/client');
        if (isSupabaseConfigured()) {
          try {
            const { getCampaignsByUser, saveCampaignsToDb } = await import('@/lib/supabase/db');
            await saveCampaignsToDb(campaign.user_email, localStore.getCampaigns(campaign.user_email));
          } catch {}
        }
      }

      return NextResponse.json({ message: 'Campaign sending started', campaign: localStore.getCampaign(id) });
    } else if (action === 'cancel_schedule') {
      localStore.updateCampaign(id, {
        status: 'draft',
        scheduled_at: undefined,
        next_run_at: undefined,
        schedule_type: undefined,
      });

      if (campaign.user_email) {
        const { isSupabaseConfigured } = await import('@/lib/supabase/client');
        if (isSupabaseConfigured()) {
          try {
            const { saveCampaignsToDb } = await import('@/lib/supabase/db');
            await saveCampaignsToDb(campaign.user_email, localStore.getCampaigns(campaign.user_email));
          } catch {}
        }
      }

      return NextResponse.json({ message: 'Campaign schedule cancelled', campaign: localStore.getCampaign(id) });
    } else if (action === 'pause_schedule') {
      localStore.updateCampaign(id, { status: 'paused' });
      return NextResponse.json({ message: 'Campaign schedule paused', campaign: localStore.getCampaign(id) });
    } else if (action === 'resume_schedule') {
      localStore.updateCampaign(id, { status: 'scheduled' });
      return NextResponse.json({ message: 'Campaign schedule resumed', campaign: localStore.getCampaign(id) });
    } else if (action === 'reschedule') {
      const {
        scheduled_at,
        schedule_type,
        recurrence_pattern,
        recurrence_interval_hours,
      } = body;

      if (!scheduled_at) {
        return NextResponse.json({ error: 'Missing scheduled_at date' }, { status: 400 });
      }

      localStore.updateCampaign(id, {
        status: 'scheduled',
        scheduled_at,
        next_run_at: scheduled_at,
        schedule_type: schedule_type || 'once',
        recurrence_pattern: recurrence_pattern || undefined,
        recurrence_interval_hours: recurrence_interval_hours ? Number(recurrence_interval_hours) : undefined,
      });

      if (campaign.user_email) {
        const { isSupabaseConfigured } = await import('@/lib/supabase/client');
        if (isSupabaseConfigured()) {
          try {
            const { saveCampaignsToDb } = await import('@/lib/supabase/db');
            await saveCampaignsToDb(campaign.user_email, localStore.getCampaigns(campaign.user_email));
          } catch {}
        }
      }

      return NextResponse.json({ message: 'Campaign rescheduled successfully', campaign: localStore.getCampaign(id) });
    } else if (action === 'pause') {
      pauseCampaignExecution(id);
      return NextResponse.json({ message: 'Campaign paused', campaign: localStore.getCampaign(id) });
    } else if (action === 'resume') {
      resumeCampaignExecution(id);
      return NextResponse.json({ message: 'Campaign resumed', campaign: localStore.getCampaign(id) });
    } else if (action === 'cancel') {
      cancelCampaignExecution(id);
      return NextResponse.json({ message: 'Campaign cancelled', campaign: localStore.getCampaign(id) });
    } else if (action === 'retry') {
      retryCampaignExecution(id);
      return NextResponse.json({ message: 'Campaign retrying failed emails', campaign: localStore.getCampaign(id) });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 });
  }
}
