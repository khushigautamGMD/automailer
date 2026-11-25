import { NextResponse, after } from 'next/server';
import {
  startCampaignExecution,
  pauseCampaignExecution,
  resumeCampaignExecution,
  cancelCampaignExecution,
  retryCampaignExecution,
  computeNextRunTime,
} from '@/lib/queue/campaign-runner';
import { localStore } from '@/lib/storage';
import { canSendMoreEmails } from '@/lib/plan-limits';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export const maxDuration = 60;

function scheduleLoopInBackground(loopPromises: Promise<void>[]) {
  if (loopPromises.length === 0) return;
  try {
    after(async () => {
      await Promise.allSettled(loopPromises);
    });
  } catch {
    // Outside Next.js request context
  }
}

async function syncCampaignToDb(userEmail?: string) {
  if (!userEmail || !isSupabaseConfigured()) return;
  try {
    const { saveCampaignsToDb } = await import('@/lib/supabase/db');
    await saveCampaignsToDb(userEmail, localStore.getCampaigns(userEmail));
  } catch (err) {
    console.error('Failed to sync campaign state to DB:', err);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    let campaign = localStore.getCampaign(id);
    if (!campaign && isSupabaseConfigured()) {
      try {
        const { getCampaignByIdFromDb } = await import('@/lib/supabase/db');
        const dbCamp = await getCampaignByIdFromDb(id);
        if (dbCamp) {
          campaign = dbCamp;
        }
      } catch {}
    }
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const loopPromises: Promise<void>[] = [];
    const onLoop = (p: Promise<void>) => {
      loopPromises.push(p);
    };

    if (action === 'start' || action === 'send_now') {
      const profile = localStore.getProfile(campaign.user_email);
      const hasOwnSmtp = Boolean(
        (profile.smtp_user && profile.smtp_pass) ||
          (profile.smtp_accounts && profile.smtp_accounts.some((a) => a.active && a.user && a.pass))
      );

      if (!hasOwnSmtp) {
        const quotaCheck = canSendMoreEmails(profile, 1);
        if (!quotaCheck.allowed) {
          return NextResponse.json({ error: quotaCheck.reason }, { status: 403 });
        }
      }

      if (campaign.status === 'scheduled') {
        if (campaign.schedule_type === 'recurring' && campaign.recurrence_pattern) {
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
            sent_recipients: [],
            failed_recipients: [],
            schedule_note: undefined,
          });
        } else {
          localStore.updateCampaign(id, {
            status: 'sending',
            scheduled_at: undefined,
            next_run_at: undefined,
            last_executed_at: new Date().toISOString(),
            sent_count: 0,
            failed_count: 0,
            sent_recipients: [],
            failed_recipients: [],
            schedule_note: undefined,
          });
        }
      }

      localStore.resetCampaignLogsForRerun(id);
      await startCampaignExecution(id, onLoop);
      scheduleLoopInBackground(loopPromises);
      await syncCampaignToDb(campaign.user_email);

      return NextResponse.json({ message: 'Campaign sending started', campaign: localStore.getCampaign(id) });
    } else if (action === 'cancel_schedule') {
      localStore.updateCampaign(id, {
        status: 'draft',
        scheduled_at: undefined,
        next_run_at: undefined,
        schedule_type: undefined,
        schedule_note: undefined,
      });
      await syncCampaignToDb(campaign.user_email);

      return NextResponse.json({ message: 'Campaign schedule cancelled', campaign: localStore.getCampaign(id) });
    } else if (action === 'pause_schedule') {
      localStore.updateCampaign(id, { status: 'paused' });
      await syncCampaignToDb(campaign.user_email);
      return NextResponse.json({ message: 'Campaign schedule paused', campaign: localStore.getCampaign(id) });
    } else if (action === 'resume_schedule') {
      localStore.updateCampaign(id, { status: 'scheduled', schedule_note: undefined });
      await syncCampaignToDb(campaign.user_email);
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
        schedule_note: undefined,
      });
      await syncCampaignToDb(campaign.user_email);

      return NextResponse.json({ message: 'Campaign rescheduled successfully', campaign: localStore.getCampaign(id) });
    } else if (action === 'pause') {
      pauseCampaignExecution(id);
      await syncCampaignToDb(campaign.user_email);
      return NextResponse.json({ message: 'Campaign paused', campaign: localStore.getCampaign(id) });
    } else if (action === 'resume') {
      await resumeCampaignExecution(id, onLoop);
      scheduleLoopInBackground(loopPromises);
      await syncCampaignToDb(campaign.user_email);
      return NextResponse.json({ message: 'Campaign resumed', campaign: localStore.getCampaign(id) });
    } else if (action === 'cancel') {
      cancelCampaignExecution(id);
      await syncCampaignToDb(campaign.user_email);
      return NextResponse.json({ message: 'Campaign cancelled', campaign: localStore.getCampaign(id) });
    } else if (action === 'retry') {
      await retryCampaignExecution(id, onLoop);
      scheduleLoopInBackground(loopPromises);
      await syncCampaignToDb(campaign.user_email);
      return NextResponse.json({ message: 'Campaign retrying failed emails', campaign: localStore.getCampaign(id) });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 });
  }
}
