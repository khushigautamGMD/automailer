'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

/**
 * Global client heartbeat monitor that ticks the scheduled campaigns processor
 * every 15 seconds while any browser window is open.
 */
export function SchedulerHeartbeat() {
  const inFlightRef = useRef(false);

  useEffect(() => {
    const resolveUserEmail = async (): Promise<string> => {
      try {
        const u = localStorage.getItem('automailer_user');
        if (u) {
          const parsed = JSON.parse(u);
          if (parsed?.email) return String(parsed.email).trim().toLowerCase();
        }
      } catch {}

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionEmail = session?.user?.email?.trim().toLowerCase();
        if (sessionEmail) {
          localStorage.setItem(
            'automailer_user',
            JSON.stringify({ email: sessionEmail, isLoggedIn: true, loginTime: Date.now() })
          );
          return sessionEmail;
        }
      } catch {}

      return '';
    };

    const sweep = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const userEmail = await resolveUserEmail();
        const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          const res = await fetch(`/api/cron/scheduled${query}`, { signal: controller.signal });
          if (res.ok) {
            const data = await res.json();
            if (
              data &&
              (data.triggeredCount > 0 ||
                data.expiredPausedCount > 0 ||
                data.staleSendingPausedCount > 0)
            ) {
              window.dispatchEvent(new CustomEvent('automailer:campaigns_updated', { detail: data }));
            }
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch {
      } finally {
        inFlightRef.current = false;
      }
    };

    // Initial sweep on mount
    sweep();

    // Periodic sweep every 15 seconds
    const interval = setInterval(sweep, 15000);

    // Also sweep immediately when tab returns to foreground
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sweep();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
