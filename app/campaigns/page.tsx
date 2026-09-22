'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { formatDate, calculatePercentage } from '@/lib/utils';
import { Campaign } from '@/types';
import { Plus, Send, Eye, BarChart2, Play, Pause, AlertCircle } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/campaigns')
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []));
  }, []);

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="pl-0 md:pl-64 transition-all">
        <Navbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                Campaign History & Management
              </h1>
              <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                View, create, pause, or monitor bulk email dispatches
              </p>
            </div>

            <Link
              href="/campaigns/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" /> Create New Campaign
            </Link>
          </div>

          {/* Filter Bar with Horizontal Scroll for Mobile */}
          <div className="flex gap-2 border-b border-zinc-200/80 pb-3 dark:border-zinc-800 overflow-x-auto whitespace-nowrap">
            {['all', 'sending', 'completed', 'scheduled', 'draft', 'paused'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold capitalize transition-all shrink-0 ${
                  filter === st
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Campaign List Grid */}
          <div className="space-y-4">
            {filteredCampaigns.length === 0 ? (
              <GlassCard className="text-center py-12">
                <AlertCircle className="mx-auto h-8 w-8 text-zinc-400" />
                <h3 className="mt-2 text-sm font-bold text-zinc-900 dark:text-white">No campaigns found</h3>
                <p className="mt-1 text-xs text-zinc-500">Create your first bulk campaign to get started!</p>
              </GlassCard>
            ) : (
              filteredCampaigns.map((c) => (
                <GlassCard key={c.id} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">{c.name}</h3>
                      {c.status === 'completed' && <Badge variant="green" dot>Completed</Badge>}
                      {c.status === 'sending' && <Badge variant="blue" dot>Sending</Badge>}
                      {c.status === 'paused' && <Badge variant="amber">Paused</Badge>}
                      {c.status === 'draft' && <Badge variant="zinc">Draft</Badge>}
                      <Badge variant="purple">{c.speed_preset.replace('_', ' ')} speed</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Subject: &quot;{c.subject}&quot; • Created {formatDate(c.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto justify-between md:justify-end border-t pt-3 md:border-0 md:pt-0 border-zinc-100 dark:border-zinc-800">
                    <div className="text-left md:text-right">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {c.sent_count} / {c.total_recipients} Sent
                      </span>
                      <p className="text-[11px] text-zinc-500">
                        {calculatePercentage(c.sent_count, c.total_recipients)}% complete
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.status === 'sending' ? (
                        <Link
                          href={`/campaigns/${c.id}/progress`}
                          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                        >
                          <Play className="h-3.5 w-3.5 fill-white" /> Live Monitor
                        </Link>
                      ) : (
                        <Link
                          href={`/campaigns/${c.id}/report`}
                          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <BarChart2 className="h-3.5 w-3.5" /> View Report
                        </Link>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
