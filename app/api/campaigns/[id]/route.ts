import { NextResponse } from 'next/server';
import { localStore } from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let campaign = localStore.getCampaign(id);

  if (!campaign && isSupabaseConfigured()) {
    try {
      const { searchParams } = new URL(req.url);
      const email = searchParams.get('email');
      if (email) {
        const { getCampaignsByUser } = await import('@/lib/supabase/db');
        const dbCampaigns = await getCampaignsByUser(email);
        const match = dbCampaigns.find((c) => c.id === id);
        if (match) {
          localStore.syncUserCampaigns(email, dbCampaigns);
          campaign = match;
        }
      }
    } catch (err) {
      console.error('Failed to recover campaign from DB:', err);
    }
  }

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  const logs = localStore.getLogs(id);
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
