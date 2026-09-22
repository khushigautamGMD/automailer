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
} from 'lucide-react';

export default function CampaignProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    // 1. Initial direct fetch for instant UI rendering without waiting
    fetch('/api/campaigns')
      .then((res) => res.json())
      .then((data) => {
        const found = (data.campaigns || []).find((c: Campaign) => c.id === campaignId);
        if (found) setCampaign(found);
      })
      .catch((err) => console.error('Fetch campaign failed:', err));

    // 2. Establish Server-Sent Events (SSE) connection for real-time progress updates
    const eventSource = new EventSource(`/api/campaigns/${campaignId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.campaign) {
          setCampaign(data.campaign);
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

  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
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
                  {campaign.status === 'paused' && <Badge variant="amber">Paused</Badge>}
                  {campaign.status === 'completed' && <Badge variant="green">Completed</Badge>}
                  {campaign.status === 'cancelled' && <Badge variant="rose">Cancelled</Badge>}
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Subject: &quot;{campaign.subject}&quot; • Rate: {campaign.emails_per_minute} emails/min
                </p>
              </div>

              {/* Action Buttons: Pause / Resume / Cancel */}
              <div className="flex flex-wrap items-center gap-2">
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
                          {log.status === 'failed' && <Badge variant="rose">Failed</Badge>}
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
