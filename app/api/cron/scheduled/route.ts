import { NextResponse } from 'next/server';
import { checkAndExecuteScheduledCampaigns } from '@/lib/queue/campaign-runner';
import { localStore } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

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

    const triggeredIds = await checkAndExecuteScheduledCampaigns();
    const scheduled = localStore.getAllScheduledCampaigns();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      triggeredCount: triggeredIds.length,
      triggeredCampaignIds: triggeredIds,
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
