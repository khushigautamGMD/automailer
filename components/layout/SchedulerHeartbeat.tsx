'use client';

import { useEffect } from 'react';

/**
 * Global client heartbeat monitor that ticks the scheduled campaigns processor
 * every 15 seconds while any browser window is open.
 */
export function SchedulerHeartbeat() {
  useEffect(() => {
    const sweep = async () => {
      try {
        let userEmail = '';
        try {
          const u = localStorage.getItem('automailer_user');
          if (u) userEmail = JSON.parse(u).email || '';
        } catch {}

        const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
        const res = await fetch(`/api/cron/scheduled${query}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.triggeredCount > 0) {
            // Broadcast event so active views re-fetch campaigns instantly
            window.dispatchEvent(new CustomEvent('automailer:campaigns_updated', { detail: data }));
          }
        }
      } catch {}
    };

    // Initial sweep on mount
    sweep();

    // Periodic sweep every 15 seconds
    const interval = setInterval(sweep, 15000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
