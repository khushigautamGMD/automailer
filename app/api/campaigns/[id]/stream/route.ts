import { localStore } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = () => {
        const campaign = localStore.getCampaign(id);
        const logs = localStore.getLogs(id);

        if (campaign) {
          const payload = JSON.stringify({
            campaign,
            logs: logs.slice(0, 50), // Send recent logs
            timestamp: new Date().toISOString(),
          });

          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }
      };

      // Initial push
      sendEvent();

      // Poll every 800ms while connected
      const intervalId = setInterval(() => {
        sendEvent();
      }, 800);

      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
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
