'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { Campaign, RecurrencePattern, ScheduleType } from '@/types';
import {
  CalendarClock,
  Clock,
  Calendar,
  Send,
  Plus,
  RefreshCw,
  AlertCircle,
  Play,
  RotateCw,
  Edit3,
  X,
  CheckCircle2,
  Users,
  Building2,
  Trash2,
  Repeat,
  Zap,
} from 'lucide-react';

export default function SchedulePage() {
  const [scheduledCampaigns, setScheduledCampaigns] = useState<Campaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nowEpoch, setNowEpoch] = useState<number>(Date.now());

  // Reschedule Modal State
  const [rescheduleTarget, setRescheduleTarget] = useState<Campaign | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editType, setEditType] = useState<ScheduleType>('once');
  const [editPattern, setEditPattern] = useState<RecurrencePattern>('daily');
  const [editIntervalHours, setEditIntervalHours] = useState<number>(24);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string>('');

  // Update clock every second for live countdown timers
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setNowEpoch(Date.now());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const loadCampaigns = async () => {
    setIsRefreshing(true);
    let userEmail = '';
    try {
      const u = localStorage.getItem('automailer_user');
      if (u) userEmail = JSON.parse(u).email || '';
    } catch (e) {}

    const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
    try {
      // Trigger scheduler sweep with user context
      await fetch(`/api/cron/scheduled${query}`).catch(() => {});

      const res = await fetch(`/api/campaigns${query}`);
      const data = await res.json();
      const list: Campaign[] = data.campaigns || [];
      setAllCampaigns(list);

      const scheduledList = list.filter((c) => c.status === 'scheduled');
      scheduledList.sort((a, b) => {
        const timeA = new Date(a.next_run_at || a.scheduled_at || 0).getTime();
        const timeB = new Date(b.next_run_at || b.scheduled_at || 0).getTime();
        return timeA - timeB;
      });
      setScheduledCampaigns(scheduledList);
    } catch (err) {
      console.error('Failed to load scheduled campaigns:', err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();

    // Listen for background scheduler tick broadcast
    const handleUpdate = () => {
      loadCampaigns();
    };
    window.addEventListener('automailer:campaigns_updated', handleUpdate);
    return () => window.removeEventListener('automailer:campaigns_updated', handleUpdate);
  }, []);

  const handleSendNow = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to dispatch "${name}" right now? Every email in the list will be sent immediately.`)) {
      return;
    }
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

  const handleCancelSchedule = async (id: string, name: string) => {
    if (!confirm(`Cancel the scheduled delivery for "${name}"? The campaign will be saved as draft.`)) {
      return;
    }
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

  const handleOpenRescheduleModal = (c: Campaign) => {
    setRescheduleTarget(c);
    const existingTarget = c.next_run_at || c.scheduled_at || new Date(Date.now() + 3600 * 1000).toISOString();
    const d = new Date(existingTarget);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setEditDate(localIso);
    setEditType(c.schedule_type || 'once');
    setEditPattern(c.recurrence_pattern || 'daily');
    setEditIntervalHours(c.recurrence_interval_hours || 24);
    setModalError('');
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleTarget) return;
    if (!editDate) {
      setModalError('Please select a valid scheduled date & time.');
      return;
    }
    const epoch = new Date(editDate).getTime();
    if (isNaN(epoch)) {
      setModalError('Invalid date & time.');
      return;
    }

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
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to reschedule');
      }

      setRescheduleTarget(null);
      loadCampaigns();
    } catch (err: any) {
      setModalError(err.message || 'Failed to update schedule');
    } finally {
      setModalSaving(false);
    }
  };

  const formatCountdown = (isoString?: string) => {
    if (!isoString) return 'Pending';
    const target = new Date(isoString).getTime();
    const diff = target - nowEpoch;

    if (diff <= 0) {
      return 'Due now (dispatching...)';
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `in ${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `in ${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `in ${minutes}m ${seconds}s`;
    }
    return `in ${seconds}s`;
  };

  const formatFrequencyLabel = (type?: ScheduleType, pattern?: RecurrencePattern, hours?: number) => {
    if (type !== 'recurring') {
      return 'One-Time Dispatch';
    }
    switch (pattern) {
      case 'hourly':
        return 'Every Hour';
      case 'weekdays':
        return 'Every Weekday (Mon-Fri)';
      case 'weekly':
        return 'Every Week';
      case 'monthly':
        return 'Every Month';
      case 'custom_hours':
        return `Every ${hours || 24} Hours`;
      case 'daily':
      default:
        return 'Every Day';
    }
  };

  const totalQueuedRecipients = scheduledCampaigns.reduce((sum, c) => sum + (c.total_recipients || 0), 0);
  const totalRecurring = scheduledCampaigns.filter((c) => c.schedule_type === 'recurring').length;
  const nextUp = scheduledCampaigns[0];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="pl-0 md:pl-64 transition-all">
        <Navbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-6 w-6 text-blue-500" />
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                  Scheduled Mails & Automation
                </h1>
              </div>
              <p className="mt-1 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Automated one-time and recurring email schedules with 100% reliable on-time delivery
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadCampaigns}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-600 shadow-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                title="Refresh and sweep schedules"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sweep Now</span>
              </button>

              <Link
                href="/campaigns/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" /> Schedule New Campaign
              </Link>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Active Schedules
                </span>
                <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500">
                  <CalendarClock className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                {scheduledCampaigns.length}
              </p>
              <p className="text-[11px] text-zinc-500">Queued for automated dispatch</p>
            </GlassCard>

            <GlassCard className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Next Delivery
                </span>
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono truncate">
                {nextUp ? formatCountdown(nextUp.next_run_at || nextUp.scheduled_at) : 'None pending'}
              </p>
              <p className="text-[11px] text-zinc-500 truncate">
                {nextUp ? nextUp.name : 'All schedules dispatched'}
              </p>
            </GlassCard>

            <GlassCard className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Recurring Automated
                </span>
                <div className="rounded-xl bg-purple-500/10 p-2 text-purple-500">
                  <Repeat className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                {totalRecurring}
              </p>
              <p className="text-[11px] text-zinc-500">Repeat cycles configured</p>
            </GlassCard>

            <GlassCard className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Recipients Queued
                </span>
                <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {totalQueuedRecipients}
              </p>
              <p className="text-[11px] text-zinc-500">Across active scheduled lists</p>
            </GlassCard>
          </div>

          {/* Guarantee Banner */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Guaranteed Delivery Engine Active
                </h4>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5">
                  Scheduled campaigns automatically sweep every 15 seconds. On every scheduled trigger, 100% of recipient contacts receive the email with automated multi-sender failover and instant retries.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Scheduler Active
            </span>
          </div>

          {/* Main Scheduled Campaigns Table / Card List */}
          <GlassCard hoverEffect={false}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>Active Scheduled Queue ({scheduledCampaigns.length})</span>
              </h3>
              <span className="text-xs text-zinc-500">
                Sorted by upcoming dispatch time
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {loading ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  Loading scheduled queue...
                </div>
              ) : scheduledCampaigns.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <CalendarClock className="mx-auto h-10 w-10 text-zinc-400" />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    No scheduled campaigns currently pending
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    You do not have any campaigns scheduled to send. You can schedule any campaign for a future date, time, or recurring daily/weekly cycle!
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/campaigns/new"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" /> Create Scheduled Mail
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[760px]">
                    <thead className="border-b border-zinc-200 bg-zinc-50/80 font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Campaign & Subject</th>
                        <th className="py-3 px-4">Next Run Time</th>
                        <th className="py-3 px-4">Schedule Pattern</th>
                        <th className="py-3 px-4">Recipients</th>
                        <th className="py-3 px-4">Speed</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                      {scheduledCampaigns.map((c) => {
                        const targetTime = c.next_run_at || c.scheduled_at;
                        const isRecurring = c.schedule_type === 'recurring';

                        return (
                          <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-zinc-900 dark:text-white text-sm">
                                {c.name}
                              </div>
                              <div className="text-[11px] text-zinc-500 line-clamp-1">
                                &quot;{c.subject}&quot;
                              </div>
                              <div className="text-[10px] text-zinc-400 mt-0.5">
                                From: {c.sender_name} ({c.reply_to})
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="font-mono">{formatCountdown(targetTime)}</span>
                              </div>
                              <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                {targetTime ? new Date(targetTime).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {isRecurring ? (
                                <Badge variant="purple">
                                  <Repeat className="h-3 w-3 mr-1 inline" />
                                  {formatFrequencyLabel(c.schedule_type, c.recurrence_pattern, c.recurrence_interval_hours)}
                                </Badge>
                              ) : (
                                <Badge variant="blue">One-Time</Badge>
                              )}
                              {c.execution_count ? (
                                <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                                  Executed {c.execution_count} time{c.execution_count > 1 ? 's' : ''}
                                </div>
                              ) : null}
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-zinc-900 dark:text-white">
                                {c.total_recipients}
                              </span>
                              <span className="text-zinc-500 text-[11px] ml-1">recipients</span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-mono text-zinc-600 dark:text-zinc-300">
                                {c.emails_per_minute}/min
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSendNow(c.id, c.name)}
                                  className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:scale-[1.02] transition-transform cursor-pointer"
                                  title="Dispatch right now without waiting"
                                >
                                  <Send className="h-3 w-3" />
                                  <span>Send Now</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenRescheduleModal(c)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                                  title="Change date, time, or recurrence pattern"
                                >
                                  <Edit3 className="h-3 w-3 text-blue-500" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCancelSchedule(c.id, c.name)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 cursor-pointer"
                                  title="Cancel schedule and revert to draft"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Quick Reschedule Modal */}
          {rescheduleTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-blue-500" />
                    <span>Edit Schedule: {rescheduleTarget.name}</span>
                  </h3>
                  <button
                    onClick={() => setRescheduleTarget(null)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Delivery Mode: Once vs Recurring */}
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

                {/* Recurring Pattern Options */}
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
                    {editType === 'recurring' ? 'First Scheduled Run Date & Time' : 'Scheduled Date & Time'}
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
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={modalSaving}
                    onClick={handleSaveReschedule}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {modalSaving ? 'Saving...' : 'Save & Update Schedule'}
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
