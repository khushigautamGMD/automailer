'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { calculatePercentage, formatDate } from '@/lib/utils';
import { Campaign, EmailLog } from '@/types';
import {
  Download,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  RotateCcw,
  ArrowLeft,
  PieChart,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

export default function CampaignReportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');

  const handleDeleteCampaign = async () => {
    if (!campaign) return;
    if (!confirm(`Are you sure you want to delete "${campaign.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      let userEmail = '';
      try {
        const u = localStorage.getItem('automailer_user');
        if (u) userEmail = JSON.parse(u).email || '';
      } catch (e) {}

      const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
      await fetch(`/api/campaigns/${campaignId}${query}`, { method: 'DELETE' });

      // Clean localStorage
      try {
        const stored = localStorage.getItem('automailer_campaigns');
        if (stored) {
          const list: Campaign[] = JSON.parse(stored);
          const updated = list.filter((c) => c.id !== campaignId);
          localStorage.setItem('automailer_campaigns', JSON.stringify(updated));
        }
      } catch (e) {}

      router.push('/campaigns');
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  useEffect(() => {
    // 0. Immediate localStorage fallback for cold starts
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

    fetch(`/api/campaigns/${campaignId}${query}`)
      .then((res) => res.json())
      .then((data) => {
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
        if (data.logs) setLogs(data.logs);
      })
      .catch(() => {
        fetch(`/api/campaigns${query}`)
          .then((res) => res.json())
          .then((data) => {
            const found = (data.campaigns || []).find((c: Campaign) => c.id === campaignId);
            if (found) setCampaign(found);
          });
      });
  }, [campaignId]);

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'sent') return l.status === 'sent';
    if (logFilter === 'failed') return l.status === 'failed';
    if (logFilter === 'opened') return Boolean(l.opened_at);
    if (logFilter === 'clicked') return Boolean(l.clicked_at);
    return true;
  });

  const handleExportCsv = () => {
    if (!campaign) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Email,Status,SentAt,OpenedAt,ClickedAt'].join(',') +
      '\n' +
      logs
        .map(
          (l) =>
            `${l.recipient_email},${l.status},${l.sent_at || ''},${l.opened_at || ''},${l.clicked_at || ''}`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${campaign.name}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!campaign) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-sm font-bold">Loading campaign analytics...</p>
      </div>
    );
  }

  const openRate = calculatePercentage(campaign.open_count, campaign.sent_count);
  const clickRate = calculatePercentage(campaign.click_count, campaign.sent_count);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="pl-0 md:pl-64 transition-all">
        <Navbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/campaigns"
                className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                  {campaign.name} Analytics
                </h1>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Detailed delivery report, engagement metrics, and export logs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteCampaign}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 transition-all cursor-pointer"
                title="Delete this campaign"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Campaign</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
              >
                <Download className="h-4 w-4" /> Export CSV Report
              </button>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <GlassCard>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Delivered</span>
              <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">{campaign.sent_count}</p>
              <span className="text-xs text-zinc-500">Out of {campaign.total_recipients} total</span>
            </GlassCard>

            <GlassCard>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Open Rate</span>
              <p className="mt-2 text-3xl font-black text-purple-600 dark:text-purple-400">{openRate}%</p>
              <span className="text-xs text-zinc-500">{campaign.open_count} total opens</span>
            </GlassCard>

            <GlassCard>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Click Rate</span>
              <p className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400">{clickRate}%</p>
              <span className="text-xs text-zinc-500">{campaign.click_count} total clicks</span>
            </GlassCard>

            <GlassCard>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Failed / Bounced</span>
              <p className="mt-2 text-3xl font-black text-rose-600 dark:text-rose-400">{campaign.failed_count}</p>
              <span className="text-xs text-zinc-500">0 Spam complaints</span>
            </GlassCard>
          </div>

          {/* Detailed Email Log Table */}
          <GlassCard hoverEffect={false}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Per-Recipient Audit Logs
              </h3>

              <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
                {['all', 'sent', 'opened', 'clicked', 'failed'].map((flt) => (
                  <button
                    key={flt}
                    onClick={() => setLogFilter(flt)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize shrink-0 ${
                      logFilter === flt
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {flt}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 font-bold text-zinc-500 dark:border-zinc-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Recipient Name</th>
                    <th className="py-2.5 px-3">Recipient Email</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Sent Date</th>
                    <th className="py-2.5 px-3">Open Status</th>
                    <th className="py-2.5 px-3">Click Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-zinc-500">
                        No activity records found for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const company = log.variables?.company || log.variables?.company_name || 'GrowMore Partner';
                      const name = log.recipient_name || `${log.variables?.firstname || ''} ${log.variables?.lastname || ''}`.trim() || '-';
                      return (
                        <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                          <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">
                            {company}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                            {name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                            {log.recipient_email}
                          </td>
                          <td className="py-2.5 px-3">
                            {log.status === 'sent' && <Badge variant="green">Delivered</Badge>}
                            {log.status === 'sending' && <Badge variant="blue" dot>Sending</Badge>}
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
                          <td className="py-2.5 px-3 text-zinc-500">
                            {log.sent_at ? formatDate(log.sent_at) : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3">
                            {log.opened_at ? (
                              <span className="text-emerald-600 font-semibold">Opened</span>
                            ) : (
                              <span className="text-zinc-400">Not Opened</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {log.clicked_at ? (
                              <span className="text-blue-600 font-semibold">Clicked Link</span>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
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
