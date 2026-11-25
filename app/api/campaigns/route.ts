import { NextResponse } from 'next/server';
import { localStore } from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { Campaign } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email')?.trim().toLowerCase();

  let campaigns = localStore.getCampaigns(email || undefined);

  if (isSupabaseConfigured() && email) {
    try {
      const { getCampaignsByUser } = await import('@/lib/supabase/db');
      const dbCampaigns = await getCampaignsByUser(email);
      if (dbCampaigns.length > 0) {
        for (const dbCamp of dbCampaigns) {
          localStore.upsertCampaign(dbCamp, email);
        }
        campaigns = localStore.getCampaigns(email);
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

    // Browser localStorage cache restoration endpoint (idempotent upsert, never duplicates)
    if (body.action === 'sync_cache') {
      const user_email = (body.user_email || '').trim().toLowerCase();
      const incomingCampaigns: Campaign[] = Array.isArray(body.campaigns) ? body.campaigns : [];

      if (incomingCampaigns.length > 0) {
        if (user_email && isSupabaseConfigured()) {
          try {
            const { getCampaignsByUser, saveCampaignsToDb } = await import('@/lib/supabase/db');
            const dbCampaigns = await getCampaignsByUser(user_email);
            for (const dbCamp of dbCampaigns) {
              localStore.upsertCampaign(dbCamp, user_email);
            }
            // Only insert campaigns from client cache that do not already exist in DB/store
            const knownIds = new Set(localStore.getCampaigns(user_email).map((c) => c.id));
            for (const c of incomingCampaigns) {
              if (c && c.id && !knownIds.has(c.id)) {
                localStore.upsertCampaign({ ...c, user_email: c.user_email || user_email }, user_email);
                knownIds.add(c.id);
              }
            }
            await saveCampaignsToDb(user_email, localStore.getCampaigns(user_email));
          } catch (err) {
            console.error('Failed sync_cache with DB:', err);
          }
        } else {
          for (const c of incomingCampaigns) {
            if (c && c.id) {
              localStore.upsertCampaign(c, user_email || undefined);
            }
          }
        }
      }
      return NextResponse.json({ success: true, count: incomingCampaigns.length });
    }

    const {
      name,
      user_email: rawUserEmail,
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
      schedule_type,
      recurrence_pattern,
      recurrence_interval_hours,
      auto_retry_failed,
      client_request_id,
    } = body;

    const user_email = (rawUserEmail || '').trim().toLowerCase();

    if (!name || !subject || !sender_name || !reply_to || !body_html || !list_id) {
      return NextResponse.json({ error: 'Missing required campaign fields' }, { status: 400 });
    }

    // Deduplicate double-submissions / rapid duplicate creates
    const existingCampaigns = localStore.getCampaigns(user_email || undefined);
    if (client_request_id) {
      const byReqId = existingCampaigns.find((c) => c.client_request_id === client_request_id);
      if (byReqId) {
        return NextResponse.json({ campaign: byReqId, deduplicated: true });
      }
    }
    const nowMs = Date.now();
    const recentDuplicate = existingCampaigns.find((c) => {
      const createdMs = new Date(c.created_at || 0).getTime();
      return (
        !isNaN(createdMs) &&
        nowMs - createdMs < 15000 &&
        c.name === name &&
        c.subject === subject &&
        c.list_id === list_id &&
        (c.scheduled_at || '') === (scheduled_at || '') &&
        (c.user_email || '').toLowerCase() === user_email
      );
    });
    if (recentDuplicate) {
      return NextResponse.json({ campaign: recentDuplicate, deduplicated: true });
    }

    let contacts = localStore.getContacts(user_email, list_id);
    if (contacts.length === 0) {
      contacts = localStore.getContacts(list_id);
    }

    if (contacts.length === 0 && isSupabaseConfigured() && list_id) {
      try {
        const { getContactsByListId, getContactsByUser } = await import('@/lib/supabase/db');
        const dbContacts = await getContactsByListId(list_id);
        if (dbContacts.length > 0) {
          contacts = dbContacts;
          localStore.upsertContacts(list_id, dbContacts, user_email);
        } else if (user_email) {
          const userContacts = await getContactsByUser(user_email, list_id);
          if (userContacts.length > 0) {
            contacts = userContacts;
            localStore.upsertContacts(list_id, userContacts, user_email);
          }
        }
      } catch (err) {
        console.error('Failed to sync contacts for campaign creation:', err);
      }
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        {
          error:
            'The selected contact list has 0 recipients. Please select a list with contacts or upload a CSV file before launching.',
        },
        { status: 400 }
      );
    }

    const isScheduled = Boolean(scheduled_at);
    const newCampaign = localStore.addCampaign({
      name,
      user_email,
      subject,
      preview_text: preview_text || '',
      sender_name,
      reply_to,
      template_id,
      list_id,
      body_html,
      status: isScheduled ? 'scheduled' : 'draft',
      speed_preset: speed_preset || 'medium',
      emails_per_minute: emails_per_minute || 50,
      scheduled_at: scheduled_at || undefined,
      schedule_type: schedule_type || (isScheduled ? 'once' : undefined),
      recurrence_pattern: recurrence_pattern || undefined,
      recurrence_interval_hours: recurrence_interval_hours ? Number(recurrence_interval_hours) : undefined,
      next_run_at: scheduled_at || undefined,
      auto_retry_failed: auto_retry_failed !== false,
      client_request_id: client_request_id || undefined,
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
