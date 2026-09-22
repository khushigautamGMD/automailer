import { NextResponse } from 'next/server';
import { localStore } from '@/lib/storage';

export async function GET() {
  const campaigns = localStore.getCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
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

    const contacts = localStore.getContacts(list_id);

    const newCampaign = localStore.addCampaign({
      name,
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

    return NextResponse.json({ campaign: newCampaign });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create campaign' }, { status: 500 });
  }
}
