import { NextResponse, after } from 'next/server';
import { sweepScheduledCampaigns } from '@/lib/queue/campaign-runner';
import { localStore } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (email) {
      const { isSupabaseConfigured } = await import('@/lib/supabase/client');
      if (isSupabaseConfigured()) {
        try {
          const { getCampaignsByUser } = await import('@/lib/supabase/db');
          const userCamps = await getCampaignsByUser(email);
          if (userCamps.length > 0) {
            localStore.syncUserCampaigns(email, userCamps);
          }
        } catch (syncErr) {
          console.error('[Cron] Error syncing user campaigns:', syncErr);
        }
      }
    }

    const loopPromises: Promise<void>[] = [];
    const sweepResult = await sweepScheduledCampaigns((p) => {
      loopPromises.push(p);
    });

    // Keep serverless lambda alive for triggered sending loops after response is returned
    if (loopPromises.length > 0) {
      try {
        after(async () => {
          await Promise.allSettled(loopPromises);
        });
      } catch {
        // Running outside Next.js request scope (e.g. unit test); promises continue in background
      }
    }

    const scheduled = localStore.getAllScheduledCampaigns();

    return NextResponse.json({
      success: true,
      schedulerActive: true,
      timestamp: new Date().toISOString(),
      triggeredCount: sweepResult.triggeredIds.length,
      triggeredCampaignIds: sweepResult.triggeredIds,
      expiredPausedCount: sweepResult.expiredPausedIds.length,
      expiredPausedIds: sweepResult.expiredPausedIds,
      staleSendingPausedCount: sweepResult.staleSendingPausedIds.length,
      staleSendingPausedIds: sweepResult.staleSendingPausedIds,
      totalScheduled: scheduled.length,
      upcomingSchedules: scheduled.map((c) => ({
        id: c.id,
        name: c.name,
        scheduled_at: c.scheduled_at,
        next_run_at: c.next_run_at || c.scheduled_at,
        schedule_type: c.schedule_type || 'once',
        recurrence_pattern: c.recurrence_pattern,
        total_recipients: c.total_recipients,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to check scheduled campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
