'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { calculatePercentage, formatDate } from '@/lib/utils';
import { Campaign, EmailLog } from '@/types';
import {
  Play,
  Pause,
  XCircle,
  BarChart2,
  Zap,
  RotateCcw,
  AlertCircle,
  Send,
  Calendar,
} from 'lucide-react';

export default function CampaignProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    // 0. Instant localStorage check so progress renders immediately with 0 ms blank screen
    try {
      const stored = localStorage.getItem('automailer_campaigns');
      if (stored) {
        const list: Campaign[] = JSON.parse(stored);
        const match = list.find((c) => c.id === campaignId);
        if (match) setCampaign(match);
      }
    } catch (e) {}

    let userEmail = '';
    try {
      const u = localStorage.getItem('automailer_user');
      if (u) userEmail = JSON.parse(u).email || '';
    } catch (e) {}

    const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';

    // 1. Initial direct fetch for instant UI rendering without waiting
    fetch(`/api/campaigns${query}`)
      .then((res) => res.json())
      .then((data) => {
        const found = (data.campaigns || []).find((c: Campaign) => c.id === campaignId);
        if (found) {
          setCampaign(found);
          try {
            const stored = localStorage.getItem('automailer_campaigns');
            const list: Campaign[] = stored ? JSON.parse(stored) : [];
            const idx = list.findIndex((c) => c.id === found.id);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...found };
            } else {
              list.unshift(found);
            }
            localStorage.setItem('automailer_campaigns', JSON.stringify(list));
          } catch (e) {}
        }
      })
      .catch((err) => console.error('Fetch campaign failed:', err));

    // 2. Establish Server-Sent Events (SSE) connection for real-time progress updates
    const eventSource = new EventSource(`/api/campaigns/${campaignId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.campaign) {
          setCampaign(data.campaign);
          try {
            const stored = localStorage.getItem('automailer_campaigns');
            const list: Campaign[] = stored ? JSON.parse(stored) : [];
            const idx = list.findIndex((c) => c.id === data.campaign.id);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...data.campaign };
            } else {
              list.unshift(data.campaign);
            }
            localStorage.setItem('automailer_campaigns', JSON.stringify(list));
          } catch (e) {}
        }
        if (data.logs) {
          setLogs(data.logs);
        }
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [campaignId]);

  const handleAction = async (action: 'pause' | 'resume' | 'cancel' | 'retry' | 'send_now') => {
    setIsActionLoading(true);
    try {
      await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!campaign) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-blue-500 animate-spin" />
          <span className="text-sm font-bold">Loading Live Queue Monitor...</span>
        </div>
      </div>
    );
  }

  const progressPercent = calculatePercentage(campaign.sent_count + campaign.failed_count, campaign.total_recipients);
  const remainingCount = Math.max(0, campaign.total_recipients - (campaign.sent_count + campaign.failed_count));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="pl-0 md:pl-64 transition-all">
        <Navbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
          {/* Top Status & Control Card */}
          <GlassCard className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                    {campaign.name}
                  </h1>
                  {campaign.status === 'sending' && <Badge variant="blue" dot>Sending Real-Time</Badge>}
                  {campaign.status === 'scheduled' && (
                    <Badge variant="blue" dot>
                      📅 Scheduled: {campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                    </Badge>
                  )}
                  {campaign.schedule_type === 'recurring' && (
                    <Badge variant="purple">
                      🔁 Repeats {campaign.recurrence_pattern || 'daily'}
                    </Badge>
                  )}
                  {campaign.status === 'paused' && <Badge variant="amber">Paused</Badge>}
                  {campaign.status === 'completed' && <Badge variant="green">Completed</Badge>}
                  {campaign.status === 'cancelled' && <Badge variant="rose">Cancelled</Badge>}
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Subject: &quot;{campaign.subject}&quot; • Rate: {campaign.emails_per_minute} emails/min
                </p>
              </div>

              {/* Action Buttons: Pause / Resume / Cancel / Send Now */}
              <div className="flex flex-wrap items-center gap-2">
                {campaign.status === 'scheduled' && (
                  <button
                    onClick={() => handleAction('send_now')}
                    disabled={isActionLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
                  >
                    <Send className="h-4 w-4" /> Send Now
                  </button>
                )}

                {campaign.status === 'sending' && (
                  <button
                    onClick={() => handleAction('pause')}
                    disabled={isActionLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 shadow-sm hover:bg-amber-500/20"
                  >
                    <Pause className="h-4 w-4" /> Pause
                  </button>
                )}

                {campaign.status === 'paused' && (
                  <button
                    onClick={() => handleAction('resume')}
                    disabled={isActionLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                  >
                    <Play className="h-4 w-4 fill-white" /> Resume
                  </button>
                )}

                {campaign.status !== 'completed' && campaign.status !== 'cancelled' && (
                  <button
                    onClick={() => handleAction('cancel')}
                    disabled={isActionLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 shadow-sm hover:bg-rose-500/20"
                  >
                    <XCircle className="h-4 w-4" /> Cancel
                  </button>
                )}

                {campaign.failed_count > 0 && campaign.status !== 'sending' && (
                  <button
                    onClick={() => handleAction('retry')}
                    disabled={isActionLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-sm hover:bg-blue-500/20"
                  >
                    <RotateCcw className="h-4 w-4" /> Retry Failed
                  </button>
                )}

                <Link
                  href={`/campaigns/${campaign.id}/report`}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <BarChart2 className="h-4 w-4" /> Report
                </Link>
              </div>
            </div>

            {/* Progress Bar Component */}
            <ProgressBar value={progressPercent} />

            {/* Metric Counters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3.5 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500">Enqueued</span>
                <p className="mt-1 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">{campaign.total_recipients}</p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-center">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Sent</span>
                <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{campaign.sent_count}</p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-center">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Remaining</span>
                <p className="mt-1 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{remainingCount}</p>
              </div>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-center">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Failed</span>
                <p className="mt-1 text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">{campaign.failed_count}</p>
              </div>
            </div>
          </GlassCard>

          {/* Scheduled Campaign Info Banner */}
          {campaign.status === 'scheduled' && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      Campaign Scheduled for {campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString() : 'Later'}
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                      Automailer will automatically start sending to {campaign.total_recipients} recipient(s) at the scheduled time. You can also click &quot;Send Now&quot; to begin sending immediately.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleAction('send_now')}
                  disabled={isActionLoading}
                  className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" /> Send Now
                </button>
              </div>
            </div>
          )}

          {/* Failure Alert Banner */}
          {campaign.failed_count > 0 && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {campaign.failed_count} Email{campaign.failed_count > 1 ? 's' : ''} Failed to Dispatch
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                      The outbound email server rejected the dispatch. Review the exact error message in the audit log below.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleAction('retry')}
                  disabled={isActionLoading}
                  className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Retry Failed Dispatch
                </button>
              </div>
            </div>
          )}

          {/* Live Activity Stream Table */}
          <GlassCard hoverEffect={false}>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-200/80 pb-3 dark:border-zinc-800 flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" /> Live Outbound Dispatch Audit Log
            </h3>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 font-bold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Recipient Email</th>
                    <th className="py-2.5 px-3">Recipient Name</th>
                    <th className="py-2.5 px-3">Dispatch Status</th>
                    <th className="py-2.5 px-3">Retries</th>
                    <th className="py-2.5 px-3">Sent Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-500">
                        Dispatching to queued contacts...
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-white">
                          {log.recipient_email}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                          {log.recipient_name || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          {log.status === 'sent' && <Badge variant="green">Sent</Badge>}
                          {log.status === 'sending' && <Badge variant="blue" dot font-mono>Dispatching...</Badge>}
                          {log.status === 'failed' && (
                            <div className="space-y-1">
                              <Badge variant="rose">Failed</Badge>
                              {log.error_message && (
                                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium max-w-sm break-words leading-tight">
                                  {log.error_message}
                                </p>
                              )}
                            </div>
                          )}
                          {log.status === 'pending' && <Badge variant="zinc">Pending</Badge>}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-500 font-mono">
                          {log.retry_count || 0} / 3
                        </td>
                        <td className="py-2.5 px-3 text-zinc-500 font-mono">
                          {formatDate(log.sent_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </main>
      </div>
    </div>
  );
}
