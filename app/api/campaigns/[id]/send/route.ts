import { NextResponse } from 'next/server';
import {
  startCampaignExecution,
  pauseCampaignExecution,
  resumeCampaignExecution,
  cancelCampaignExecution,
} from '@/lib/queue/campaign-runner';
import { localStore } from '@/lib/storage';
import { canSendMoreEmails } from '@/lib/plan-limits';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body; // 'start' | 'pause' | 'resume' | 'cancel'

    const campaign = localStore.getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (action === 'start') {
      const profile = localStore.getProfile();
      const quotaCheck = canSendMoreEmails(profile, 1);
      if (!quotaCheck.allowed) {
        return NextResponse.json({ error: quotaCheck.reason }, { status: 403 });
      }

      // Trigger execution in non-blocking background task
      startCampaignExecution(id);
      return NextResponse.json({ message: 'Campaign sending started', campaign: localStore.getCampaign(id) });
    } else if (action === 'pause') {
      pauseCampaignExecution(id);
      return NextResponse.json({ message: 'Campaign paused', campaign: localStore.getCampaign(id) });
    } else if (action === 'resume') {
      resumeCampaignExecution(id);
      return NextResponse.json({ message: 'Campaign resumed', campaign: localStore.getCampaign(id) });
    } else if (action === 'cancel') {
      cancelCampaignExecution(id);
      return NextResponse.json({ message: 'Campaign cancelled', campaign: localStore.getCampaign(id) });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 });
  }
}
