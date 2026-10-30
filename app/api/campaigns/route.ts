import { NextResponse } from 'next/server';
import { localStore } from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  let campaigns = localStore.getCampaigns(email || undefined);

  // If localStore returned empty and Supabase is configured, sync from DB across cold starts
  if (campaigns.length === 0 && isSupabaseConfigured() && email) {
    try {
      const { getCampaignsByUser } = await import('@/lib/supabase/db');
      const dbCampaigns = await getCampaignsByUser(email);
      if (dbCampaigns.length > 0) {
        campaigns = dbCampaigns;
        localStore.syncUserCampaigns(email, dbCampaigns);
      }
    } catch (err) {
      console.error('Failed to sync campaigns from DB:', err);
    }
  }

  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Browser localStorage cache restoration endpoint
    if (body.action === 'sync_cache') {
      const { user_email, campaigns } = body;
      if (Array.isArray(campaigns) && campaigns.length > 0) {
        if (user_email) {
          localStore.syncUserCampaigns(user_email, campaigns);
          if (isSupabaseConfigured()) {
            const { saveCampaignsToDb } = await import('@/lib/supabase/db');
            await saveCampaignsToDb(user_email, localStore.getCampaigns(user_email));
          }
        } else {
          for (const c of campaigns) {
            const existing = localStore.getCampaign(c.id);
            if (!existing) {
              localStore.addCampaign(c);
            } else {
              localStore.updateCampaign(c.id, c);
            }
          }
        }
      }
      return NextResponse.json({ success: true, count: campaigns?.length || 0 });
    }
    const {
      name,
      user_email,
      subject,
      preview_text,
      sender_name,
      reply_to,
      template_id,
      list_id,
      body_html,
      speed_preset,
      emails_per_minute,
      scheduled_at,
    } = body;

    if (!name || !subject || !sender_name || !reply_to || !body_html || !list_id) {
      return NextResponse.json({ error: 'Missing required campaign fields' }, { status: 400 });
    }

    let contacts = localStore.getContacts(list_id);
    if (contacts.length === 0 && isSupabaseConfigured() && list_id) {
      try {
        const { getContactsByListId, getContactsByUser } = await import('@/lib/supabase/db');
        const dbContacts = await getContactsByListId(list_id);
        if (dbContacts.length > 0) {
          contacts = dbContacts;
          localStore.addContacts(list_id, dbContacts, user_email);
        } else if (user_email) {
          const userContacts = await getContactsByUser(user_email, list_id);
          if (userContacts.length > 0) {
            contacts = userContacts;
            localStore.addContacts(list_id, userContacts, user_email);
          }
        }
      } catch (err) {
        console.error('Failed to sync contacts for campaign creation:', err);
      }
    }

    if (contacts.length === 0) {
      return NextResponse.json({
        error: 'The selected contact list has 0 recipients. Please select a list with contacts or upload a CSV file before launching.',
      }, { status: 400 });
    }

    const newCampaign = localStore.addCampaign({
      name,
      user_email: user_email || '',
      subject,
      preview_text: preview_text || '',
      sender_name,
      reply_to,
      template_id,
      list_id,
      body_html,
      status: scheduled_at ? 'scheduled' : 'draft',
      speed_preset: speed_preset || 'medium',
      emails_per_minute: emails_per_minute || 50,
      scheduled_at: scheduled_at || undefined,
      total_recipients: contacts.length,
    });

    if (user_email && isSupabaseConfigured()) {
      try {
        const { getCampaignsByUser, saveCampaignsToDb } = await import('@/lib/supabase/db');
        const existing = await getCampaignsByUser(user_email);
        const filtered = existing.filter((c) => c.id !== newCampaign.id);
        await saveCampaignsToDb(user_email, [newCampaign, ...filtered]);
      } catch (err) {
        console.error('Failed to backup campaign to DB:', err);
      }
    }

    return NextResponse.json({ campaign: newCampaign });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create campaign' }, { status: 500 });
  }
}
