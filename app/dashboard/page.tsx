'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { calculatePercentage, formatDate } from '@/lib/utils';
import { Campaign, EmailLog } from '@/types';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart2,
  Users,
  FileCode,
  Zap,
  ShieldCheck,
  Plus,
} from 'lucide-react';

import { PlanLimitBanner } from '@/components/ui/PlanLimitBanner';
import { UserProfile } from '@/types';

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/campaigns').then((res) => res.json()),
      fetch('/api/settings').then((res) => res.json()),
    ]).then(([campData, profData]) => {
      setCampaigns(campData.campaigns || []);
      setProfile(profData.profile);
      setLoading(false);
    });
  }, []);

  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((acc, c) => acc + c.sent_count, 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + c.failed_count, 0);
  const totalRecipients = campaigns.reduce((acc, c) => acc + c.total_recipients, 0);
  const totalOpens = campaigns.reduce((acc, c) => acc + c.open_count, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.click_count, 0);

  const overallOpenRate = calculatePercentage(totalOpens, totalSent || 1);
  const overallClickRate = calculatePercentage(totalClicks, totalSent || 1);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="md:pl-64">
        <Navbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                Outreach & Campaign Dashboard
              </h1>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Real-time delivery stats, multi-sender rotation activity, and inbox metrics
              </p>
            </div>

            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Start New Campaign
            </Link>
          </div>

          {/* Plan Tier & Usage Banner */}
          <PlanLimitBanner profile={profile} />

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Total Dispatched
                </span>
                <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500">
                  <Send className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{totalSent}</p>
              <p className="text-[11px] text-zinc-500">Across {totalCampaigns} campaigns</p>
            </GlassCard>

            <GlassCard className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Delivered Success
                </span>
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {calculatePercentage(totalSent, totalRecipients || 1)}%
              </p>
              <p className="text-[11px] text-zinc-500">{totalSent} / {totalRecipients} emails delivered</p>
            </GlassCard>

            <GlassCard className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Open Rate %
                </span>
                <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {overallOpenRate}%
              </p>
              <p className="text-[11px] text-zinc-500">{totalOpens} recipients opened</p>
            </GlassCard>

            <GlassCard className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Link Click Rate %
                </span>
                <div className="rounded-xl bg-purple-500/10 p-2 text-purple-500">
                  <BarChart2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                {overallClickRate}%
              </p>
              <p className="text-[11px] text-zinc-500">{totalClicks} affiliate link clicks</p>
            </GlassCard>
          </div>

          {/* Recent Campaigns Table */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Recent Email Campaigns
              </h3>
              <Link href="/campaigns" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="border-b border-zinc-200 font-bold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Campaign Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Progress</th>
                    <th className="py-2.5 px-3">Sent / Total</th>
                    <th className="py-2.5 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-500">
                        No campaigns found. Start your first campaign!
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                        <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">
                          {c.name}
                          <div className="text-[11px] font-normal text-zinc-500">&quot;{c.subject}&quot;</div>
                        </td>
                        <td className="py-3 px-3">
                          {c.status === 'completed' && <Badge variant="green">Completed</Badge>}
                          {c.status === 'sending' && <Badge variant="blue" dot font-mono>Sending</Badge>}
                          {c.status === 'paused' && <Badge variant="amber">Paused</Badge>}
                          {c.status === 'draft' && <Badge variant="zinc">Draft</Badge>}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {calculatePercentage(c.sent_count + c.failed_count, c.total_recipients)}%
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {c.sent_count} / {c.total_recipients}
                        </td>
                        <td className="py-3 px-3">
                          <Link
                            href={`/campaigns/${c.id}/progress`}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Live Monitor
                          </Link>
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
