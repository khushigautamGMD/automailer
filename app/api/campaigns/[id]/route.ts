import { NextResponse } from 'next/server';
import { localStore } from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { EmailLog } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email')?.trim().toLowerCase();

  let campaign = localStore.getCampaign(id);

  if (isSupabaseConfigured()) {
    try {
      if (email) {
        const { getCampaignsByUser } = await import('@/lib/supabase/db');
        const dbCampaigns = await getCampaignsByUser(email);
        const match = dbCampaigns.find((c) => c.id === id);
        if (match) {
          campaign = localStore.upsertCampaign(match, email);
        }
      } else if (!campaign) {
        const { getCampaignByIdFromDb } = await import('@/lib/supabase/db');
        const dbCamp = await getCampaignByIdFromDb(id);
        if (dbCamp) {
          campaign = dbCamp;
        }
      }
    } catch (err) {
      console.error('Failed to recover campaign from DB:', err);
    }
  }

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  let logs = localStore.getLogs(id);
  // If local logs were lost across a cold start, reconstruct audit rows from persisted recipients
  if (logs.length === 0 && ((campaign.sent_recipients?.length || 0) > 0 || (campaign.failed_recipients?.length || 0) > 0)) {
    const reconstructed: EmailLog[] = [
      ...(campaign.sent_recipients || []).map((recipient, idx) => ({
        id: `persisted-sent-${idx}`,
        campaign_id: id,
        recipient_email: recipient,
        status: 'sent' as const,
        retry_count: 0,
        sent_at: campaign?.last_executed_at || campaign?.created_at,
        created_at: campaign?.last_executed_at || campaign?.created_at || new Date().toISOString(),
      })),
      ...(campaign.failed_recipients || []).map((recipient, idx) => ({
        id: `persisted-fail-${idx}`,
        campaign_id: id,
        recipient_email: recipient,
        status: 'failed' as const,
        retry_count: 1,
        created_at: campaign?.last_executed_at || campaign?.created_at || new Date().toISOString(),
      })),
    ];
    logs = reconstructed;
  }

  return NextResponse.json({ campaign, logs });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get('email') || '').trim().toLowerCase();

    localStore.deleteCampaign(id, email || undefined);

    if (email && isSupabaseConfigured()) {
      try {
        const { getCampaignsByUser, saveCampaignsToDb } = await import('@/lib/supabase/db');
        const existing = await getCampaignsByUser(email);
        const filtered = existing.filter((c) => c.id !== id);
        await saveCampaignsToDb(email, filtered);
      } catch (err) {
        console.error('Failed to sync campaign deletion to DB:', err);
      }
    }

    return NextResponse.json({ success: true, message: 'Campaign and associated logs removed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete campaign' }, { status: 500 });
  }
}
