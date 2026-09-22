'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';

export default function CampaignReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/campaigns')
      .then((res) => res.json())
      .then((data) => {
        const found = (data.campaigns || []).find((c: Campaign) => c.id === campaignId);
        if (found) setCampaign(found);
      });
  }, [campaignId]);

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

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
            >
              <Download className="h-4 w-4" /> Export CSV Report
            </button>
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
                    <th className="py-2.5 px-3">Recipient Email</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Sent Date</th>
                    <th className="py-2.5 px-3">Open Status</th>
                    <th className="py-2.5 px-3">Click Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-white">john.doe@techcorp.com</td>
                    <td className="py-2.5 px-3"><Badge variant="green">Delivered</Badge></td>
                    <td className="py-2.5 px-3 text-zinc-500">{formatDate(campaign.created_at)}</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-semibold">Opened</td>
                    <td className="py-2.5 px-3 text-blue-600 font-semibold">Clicked Link</td>
                  </tr>
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-white">mary.smith@innovate.io</td>
                    <td className="py-2.5 px-3"><Badge variant="green">Delivered</Badge></td>
                    <td className="py-2.5 px-3 text-zinc-500">{formatDate(campaign.created_at)}</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-semibold">Opened</td>
                    <td className="py-2.5 px-3 text-zinc-400">-</td>
                  </tr>
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-white">alex.jones@globalnet.com</td>
                    <td className="py-2.5 px-3"><Badge variant="green">Delivered</Badge></td>
                    <td className="py-2.5 px-3 text-zinc-500">{formatDate(campaign.created_at)}</td>
                    <td className="py-2.5 px-3 text-zinc-400">Not Opened</td>
                    <td className="py-2.5 px-3 text-zinc-400">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCard>
        </main>
      </div>
    </div>
  );
}
