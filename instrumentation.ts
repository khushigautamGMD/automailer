export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initBackgroundScheduler } = await import('@/lib/queue/campaign-runner');
      initBackgroundScheduler();
      console.log('[Instrumentation] Automailer background scheduler initialized successfully.');
    } catch (err) {
      console.error('[Instrumentation] Failed to initialize background scheduler:', err);
    }
  }
}
