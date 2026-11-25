import { NextResponse, after } from 'next/server';
import { localStore } from '@/lib/storage';
import { ensureCampaignRunnerActive } from '@/lib/queue/campaign-runner';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!localStore.getCampaign(id) && isSupabaseConfigured()) {
    try {
      const { getCampaignByIdFromDb } = await import('@/lib/supabase/db');
      await getCampaignByIdFromDb(id);
    } catch {}
  }

  // Auto-revive runner if campaign was recently marked sending but runner disconnected
  // (Stale >2h sending campaigns are auto-paused by ensureCampaignRunnerActive)
  const loopPromises: Promise<void>[] = [];
  ensureCampaignRunnerActive(id, (p) => loopPromises.push(p));
  if (loopPromises.length > 0) {
    try {
      after(async () => {
        await Promise.allSettled(loopPromises);
      });
    } catch {}
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const sendEvent = () => {
        if (closed) return;
        const campaign = localStore.getCampaign(id);
        const logs = localStore.getLogs(id);

        if (campaign) {
          const payload = JSON.stringify({
            campaign,
            logs: logs.slice(0, 50),
            timestamp: new Date().toISOString(),
          });

          try {
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          } catch {}
        }
      };

      sendEvent();

      const intervalId = setInterval(() => {
        sendEvent();
      }, 800);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
