'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { formatDate, calculatePercentage } from '@/lib/utils';
import { Campaign, EmailLog, ScheduleType, RecurrencePattern } from '@/types';
import { Plus, BarChart2, Play, AlertCircle, RefreshCw, Layers, ChevronDown, ChevronUp, Users, Building2, Trash2, Send, Clock, Calendar, Repeat, Edit3, X } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [campaignLogs, setCampaignLogs] = useState<Record<string, EmailLog[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<Record<string, boolean>>({});

  // Reschedule modal state
  const [rescheduleTarget, setRescheduleTarget] = useState<Campaign | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editType, setEditType] = useState<ScheduleType>('once');
  const [editPattern, setEditPattern] = useState<RecurrencePattern>('daily');
  const [editIntervalHours, setEditIntervalHours] = useState<number>(24);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string>('');

  const handleOpenRescheduleModal = (c: Campaign) => {
    setRescheduleTarget(c);
    const target = c.next_run_at || c.scheduled_at || new Date(Date.now() + 3600 * 1000).toISOString();
    const d = new Date(target);
    const pad = (n: number) => String(n).padStart(2, '0');
    setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setEditType(c.schedule_type || 'once');
    setEditPattern(c.recurrence_pattern || 'daily');
    setEditIntervalHours(c.recurrence_interval_hours || 24);
    setModalError('');
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleTarget || !editDate) return;
    setModalSaving(true);
    try {
      const scheduledIso = new Date(editDate).toISOString();
      const res = await fetch(`/api/campaigns/${rescheduleTarget.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          scheduled_at: scheduledIso,
          schedule_type: editType,
          recurrence_pattern: editType === 'recurring' ? editPattern : undefined,
          recurrence_interval_hours: editIntervalHours,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reschedule');
      }
      setRescheduleTarget(null);
      loadCampaigns();
    } catch (err: any) {
      setModalError(err.message || 'Reschedule failed');
    } finally {
      setModalSaving(false);
    }
  };

  const handleSendNow = async (id: string) => {
    try {
      await fetch(`/api/campaigns/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_now' }),
      });
      loadCampaigns();
    } catch (err) {
      console.error('Send now failed:', err);
    }
  };

  const handleCancelSchedule = async (id: string) => {
    try {
      await fetch(`/api/campaigns/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_schedule' }),
      });
      loadCampaigns();
    } catch (err) {
      console.error('Cancel schedule failed:', err);
    }
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from your campaign history?`)) {
      return;
    }

    try {
      let userEmail = '';
      try {
        const u = localStorage.getItem('automailer_user');
        if (u) userEmail = JSON.parse(u).email || '';
      } catch (e) {}

      const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
      await fetch(`/api/campaigns/${id}${query}`, { method: 'DELETE' });

      const updated = campaigns.filter((c) => c.id !== id);
      setCampaigns(updated);

      if (typeof window !== 'undefined') {
        localStorage.setItem('automailer_campaigns', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  const handleToggleExpand = async (id: string) => {
    if (expandedCampaignId === id) {
      setExpandedCampaignId(null);
      return;
    }
    setExpandedCampaignId(id);

    if (!campaignLogs[id]) {
      setLoadingLogs((prev) => ({ ...prev, [id]: true }));
      try {
        let userEmail = '';
        try {
          const u = localStorage.getItem('automailer_user');
          if (u) userEmail = JSON.parse(u).email || '';
        } catch (e) {}
        const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
        const res = await fetch(`/api/campaigns/${id}${query}`);
        const data = await res.json();
        setCampaignLogs((prev) => ({ ...prev, [id]: data.logs || [] }));
      } catch (err) {
        console.error('Failed to fetch campaign logs:', err);
      } finally {
        setLoadingLogs((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  // Synchronize server response with browser localStorage
  const syncWithLocalStorage = (serverCampaigns: Campaign[]) => {
    try {
      const localRaw = localStorage.getItem('automailer_campaigns');
      const localList: Campaign[] = localRaw ? JSON.parse(localRaw) : [];

      const map = new Map<string, Campaign>();
      // 1. Put local campaigns first
      for (const c of localList) {
        if (c && c.id) map.set(c.id, c);
      }
      // 2. Server campaigns override or add
      for (const c of serverCampaigns) {
        if (c && c.id) {
          map.set(c.id, { ...(map.get(c.id) || {}), ...c });
        }
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );

      localStorage.setItem('automailer_campaigns', JSON.stringify(merged));
      setCampaigns(merged);

      // 3. Push to server if local had items missing from server cache
      if (serverCampaigns.length < merged.length) {
        let userEmail = '';
        try {
          const u = localStorage.getItem('automailer_user');
          if (u) userEmail = JSON.parse(u).email || '';
        } catch (e) {}

        fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync_cache', user_email: userEmail, campaigns: merged }),
        }).catch(() => {});
      }
    } catch (e) {
      setCampaigns(serverCampaigns);
    }
  };

  const loadCampaigns = async () => {
    setIsRefreshing(true);
    let userEmail = '';
    try {
      const u = localStorage.getItem('automailer_user');
      if (u) userEmail = JSON.parse(u).email || '';
    } catch (e) {}

    const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
    try {
      // Trigger sweep for any due scheduled campaigns so they fire seamlessly
      fetch('/api/cron/scheduled').catch(() => {});

      const res = await fetch(`/api/campaigns${query}`);
      const data = await res.json();
      const serverList: Campaign[] = data.campaigns || [];
      syncWithLocalStorage(serverList);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Immediate read from localStorage so UI renders instantly with zero flicker
    try {
      const localRaw = localStorage.getItem('automailer_campaigns');
      if (localRaw) {
        const cached: Campaign[] = JSON.parse(localRaw);
        if (Array.isArray(cached) && cached.length > 0) {
          setCampaigns(cached);
        }
      }
    } catch (e) {}

    loadCampaigns();
  }, []);

  // Calculate live counts per status tab
  const counts = {
    all: campaigns.length,
    sending: campaigns.filter((c) => c.status === 'sending').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
    draft: campaigns.filter((c) => c.status === 'draft').length,
    paused: campaigns.filter((c) => c.status === 'paused').length,
  };

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
          {/* Header & Action Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                Campaign History & Management
              </h1>
              <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Track live dispatches, completed reports, and deliverability metrics
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadCampaigns}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 shadow-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                title="Refresh campaigns"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <Link
                href="/campaigns/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" /> Create New Campaign
              </Link>
            </div>
          </div>

          {/* Filter Bar with Status Tabs & Live Counts */}
          <div className="flex gap-2 border-b border-zinc-200/80 pb-3 dark:border-zinc-800 overflow-x-auto whitespace-nowrap">
            {[
              { key: 'all', label: 'All', count: counts.all },
              { key: 'sending', label: 'Sending', count: counts.sending },
              { key: 'completed', label: 'Completed', count: counts.completed },
              { key: 'scheduled', label: 'Scheduled', count: counts.scheduled },
              { key: 'draft', label: 'Draft', count: counts.draft },
              { key: 'paused', label: 'Paused', count: counts.paused },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold capitalize transition-all shrink-0 ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                    filter === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Campaign List Grid */}
          <div className="space-y-4">
            {filteredCampaigns.length === 0 ? (
              <GlassCard className="text-center py-12 space-y-3">
                <AlertCircle className="mx-auto h-8 w-8 text-zinc-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {filter === 'all' ? 'No campaigns found' : `No ${filter} campaigns found`}
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  {filter === 'sending' && counts.completed > 0
                    ? `You currently have 0 active sending campaigns. Your ${counts.completed} campaign(s) have already completed sending and are listed under the "Completed" tab.`
                    : filter !== 'all' && counts.all > 0
                    ? `You have ${counts.all} campaign(s) in other tabs. Switch to "All" to view your entire campaign history.`
                    : 'Create your first bulk campaign to start sending!'}
                </p>

                {/* Helpful shortcut switch buttons */}
                {filter === 'sending' && counts.completed > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setFilter('completed')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                    >
                      View Completed Campaigns ({counts.completed})
                    </button>
                  </div>
                )}

                {filter !== 'all' && filter !== 'sending' && counts.all > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setFilter('all')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      <Layers className="h-3.5 w-3.5" /> View All Campaigns ({counts.all})
                    </button>
                  </div>
                )}
              </GlassCard>
            ) : (
              filteredCampaigns.map((c) => {
                const isExpanded = expandedCampaignId === c.id;
                const logs = campaignLogs[c.id] || [];
                const isLoading = loadingLogs[c.id];

                return (
                  <GlassCard key={c.id} className="space-y-4 transition-all">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-white">{c.name}</h3>
                          {c.status === 'completed' && <Badge variant="green" dot>Completed</Badge>}
                          {c.status === 'sending' && <Badge variant="blue" dot>Sending</Badge>}
                          {c.status === 'paused' && <Badge variant="amber">Paused</Badge>}
                          {c.status === 'draft' && <Badge variant="zinc">Draft</Badge>}
                          {c.status === 'scheduled' && (
                            <>
                              <Badge variant="blue" dot>
                                📅 Scheduled: {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                              </Badge>
                              {c.schedule_type === 'recurring' && (
                                <Badge variant="purple">
                                  <Repeat className="h-3 w-3 mr-1 inline" />
                                  {c.recurrence_pattern ? `Repeats ${c.recurrence_pattern}` : 'Recurring'}
                                </Badge>
                              )}
                            </>
                          )}
                          <Badge variant="purple">{c.speed_preset.replace('_', ' ')} speed</Badge>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Subject: &quot;{c.subject}&quot; • Created {formatDate(c.created_at)}
                          {c.status === 'scheduled' && c.scheduled_at && (
                            <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
                              (Will send {new Date(c.scheduled_at) > new Date() ? `in ${Math.round((new Date(c.scheduled_at).getTime() - Date.now()) / (60 * 1000))} min` : 'soon'})
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto justify-between md:justify-end border-t pt-3 md:border-0 md:pt-0 border-zinc-100 dark:border-zinc-800">
                        <div className="text-left md:text-right">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {c.sent_count} / {c.total_recipients} Sent
                          </span>
                          <p className="text-[11px] text-zinc-500">
                            {calculatePercentage(c.sent_count, c.total_recipients)}% complete
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Toggle View Companies & Recipients button */}
                          <button
                            type="button"
                            onClick={() => handleToggleExpand(c.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer"
                            title="Show all companies and recipient emails who received this mail"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{isExpanded ? 'Hide Recipients' : `Recipients (${c.sent_count})`}</span>
                            <span className="sm:hidden">{isExpanded ? 'Hide' : `(${c.sent_count})`}</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>

                          {c.status === 'scheduled' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSendNow(c.id)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:scale-[1.02] transition-transform cursor-pointer"
                                title="Send this scheduled campaign right now"
                              >
                                <Send className="h-3.5 w-3.5" /> Send Now
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRescheduleModal(c)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                                title="Change scheduled time or recurrence"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-blue-500" /> Reschedule
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelSchedule(c.id)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 transition-all cursor-pointer"
                                title="Cancel scheduled dispatch and save as draft"
                              >
                                <Clock className="h-3.5 w-3.5" /> Cancel Schedule
                              </button>
                            </>
                          ) : c.status === 'sending' ? (
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

                          {/* Delete Campaign Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCampaign(c.id, c.name)}
                            className="inline-flex items-center justify-center p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 transition-all cursor-pointer"
                            title="Remove / Delete this old campaign"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Recipient & Company Table */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            <span>Recipients & Companies Dispatched ({logs.length})</span>
                          </h4>
                          <span className="text-[11px] text-zinc-500 font-medium">
                            Dispatched via Gmail SMTP
                          </span>
                        </div>

                        {isLoading ? (
                          <div className="py-6 text-center text-xs text-zinc-500">
                            Loading company & recipient audit details...
                          </div>
                        ) : logs.length === 0 ? (
                          <div className="py-6 text-center text-xs text-zinc-500 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
                            No dispatch records found for this campaign yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                                <tr>
                                  <th className="py-2.5 px-3">Company</th>
                                  <th className="py-2.5 px-3">Recipient Name</th>
                                  <th className="py-2.5 px-3">Recipient Email</th>
                                  <th className="py-2.5 px-3">Status</th>
                                  <th className="py-2.5 px-3">Sent Time</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                                {logs.map((log) => {
                                  const company = log.variables?.company || log.variables?.company_name || 'Client';
                                  const name = log.recipient_name || `${log.variables?.firstname || ''} ${log.variables?.lastname || ''}`.trim() || '-';
                                  return (
                                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                                      <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                        <span>{company}</span>
                                      </td>
                                      <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                                        {name}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                                        {log.recipient_email}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {log.status === 'sent' && <Badge variant="green">Sent</Badge>}
                                        {log.status === 'sending' && <Badge variant="blue" dot>Sending...</Badge>}
                                        {log.status === 'failed' && <Badge variant="rose">Failed</Badge>}
                                        {log.status === 'pending' && <Badge variant="zinc">Pending</Badge>}
                                      </td>
                                      <td className="py-2.5 px-3 text-zinc-500 font-mono text-[11px]">
                                        {formatDate(log.sent_at)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </GlassCard>
                );
              })
            )}
          </div>

          {/* Quick Reschedule Modal Dialog */}
          {rescheduleTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span>Reschedule: {rescheduleTarget.name}</span>
                  </h3>
                  <button
                    onClick={() => setRescheduleTarget(null)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Schedule Type Selection: Once vs Recurring */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Schedule Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditType('once')}
                      className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                        editType === 'once'
                          ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" /> One-Time Dispatch
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType('recurring')}
                      className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                        editType === 'recurring'
                          ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      <Repeat className="h-3.5 w-3.5" /> Automated Recurring
                    </button>
                  </div>
                </div>

                {/* Recurring Frequency Patterns */}
                {editType === 'recurring' && (
                  <div className="space-y-2 rounded-xl bg-blue-50/50 dark:bg-blue-500/5 p-3 border border-blue-500/20">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Recurrence Frequency
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { key: 'daily', label: 'Every Day' },
                        { key: 'weekdays', label: 'Weekdays (Mon-Fri)' },
                        { key: 'weekly', label: 'Every Week' },
                        { key: 'monthly', label: 'Every Month' },
                        { key: 'hourly', label: 'Every Hour' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setEditPattern(item.key as RecurrencePattern)}
                          className={`p-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                            editPattern === item.key
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date & Time Picker */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {editType === 'recurring' ? 'Next Scheduled Run Date & Time' : 'Scheduled Date & Time'}
                  </label>
                  <input
                    type="datetime-local"
                    value={editDate}
                    onChange={(e) => {
                      setEditDate(e.target.value);
                      setModalError('');
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                {modalError && (
                  <p className="text-xs font-bold text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> {modalError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setRescheduleTarget(null)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={modalSaving}
                    onClick={handleSaveReschedule}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {modalSaving ? 'Saving...' : 'Save & Reschedule'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
