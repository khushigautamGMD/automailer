'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { CsvUploader } from '@/components/contacts/CsvUploader';
import { EmailEditor } from '@/components/editor/EmailEditor';
import { SpeedSelector } from '@/components/campaigns/SpeedSelector';
import { Badge } from '@/components/ui/Badge';
import { SpeedPreset, ContactList, EmailTemplate, CsvValidationResult, ScheduleType, RecurrencePattern } from '@/types';
import { ArrowLeft, ArrowRight, Check, Send, Sparkles, FileSpreadsheet, Users, AlertCircle, Calendar, Clock, Repeat, ShieldCheck } from 'lucide-react';

export default function NewCampaignWizard() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  // Step 1 Form Data
  const [name, setName] = useState('New Email Campaign');
  const [subject, setSubject] = useState('Quick question regarding {{company}}');
  const [previewText, setPreviewText] = useState('Short message for your team');
  const [senderName, setSenderName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [step1Error, setStep1Error] = useState<string>('');

  // Step 2 Contact List Selection or CSV
  const [lists, setLists] = useState<ContactList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [csvResult, setCsvResult] = useState<CsvValidationResult | null>(null);
  const [listCount, setListCount] = useState<number>(0);
  const [step2Error, setStep2Error] = useState<string>('');

  // Step 3 Template & Email HTML
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>(
    `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #1e293b; line-height: 1.6;">
  <p>Hi {{firstname}},</p>
  <p>I hope you are having a productive week at {{company}}.</p>
  <p>I am reaching out to share how our digital solutions and campaign automation can help your team scale operations faster.</p>
  <p>You can check out our overview and case studies here: <a href="https://growmoredigitally.in" target="_blank" style="color: #2563eb; text-decoration: underline;">https://growmoredigitally.in</a></p>
  <p>Would you have 5 minutes for a quick chat sometime this week?</p>
  <br>
  <p>Best regards,<br><strong>Rahul Goswami</strong><br><span style="color: #64748b; font-size: 13px;">GrowMore Digitally</span></p>
</div>`
  );

  // Step 4 Speed & Dispatch Options
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>('medium');
  const [customSpeed, setCustomSpeed] = useState<number>(50);
  const [deliveryMode, setDeliveryMode] = useState<'now' | 'scheduled'>('now');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('once');
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('daily');
  const [recurrenceIntervalHours, setRecurrenceIntervalHours] = useState<number>(24);
  const [autoRetryFailed, setAutoRetryFailed] = useState<boolean>(true);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [scheduleError, setScheduleError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load initial user settings for logged-in account
    let userEmail = '';
    if (typeof window !== 'undefined') {
      try {
        const u = localStorage.getItem('automailer_user');
        if (u) userEmail = JSON.parse(u).email || '';
      } catch (e) {}
    }
    const settingsUrl = '/api/settings' + (userEmail ? `?email=${encodeURIComponent(userEmail)}` : '');
    fetch(settingsUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          if (data.profile.sender_name) setSenderName(data.profile.sender_name);
          if (data.profile.reply_to_email && data.profile.reply_to_email.includes('@')) {
            setReplyTo(data.profile.reply_to_email);
          } else if (data.profile.email && data.profile.email.includes('@')) {
            setReplyTo(data.profile.email);
          } else if (data.profile.smtp_user && data.profile.smtp_user.includes('@')) {
            setReplyTo(data.profile.smtp_user);
          }
        }
      });

    // Fetch user's real saved contact lists
    const contactsUrl = '/api/contacts' + (userEmail ? `?userEmail=${encodeURIComponent(userEmail)}` : '');
    fetch(contactsUrl)
      .then((res) => res.json())
      .then((data) => {
        const savedLists = data.lists || [];
        setLists(savedLists);
        if (savedLists.length > 0) {
          setSelectedListId(savedLists[0].id);
          setListCount(savedLists[0].total_contacts || 0);
        }
      });
  }, []);

  const handleCsvValidationComplete = async (res: CsvValidationResult, listName: string) => {
    setCsvResult(res);
    setStep2Error('');

    if (res.valid.length > 0) {
      // Auto-upload valid contacts to localStore immediately so list ID is ready!
      try {
        let userEmail = '';
        if (typeof window !== 'undefined') {
          try {
            const u = localStorage.getItem('automailer_user');
            if (u) userEmail = JSON.parse(u).email || '';
          } catch (e) {}
        }
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: (() => {
            const fd = new FormData();
            fd.append('listName', listName || `${name} List`);
            if (userEmail) fd.append('userEmail', userEmail);
            fd.append(
              'csvText',
              `email,firstname,lastname,company,phone\n` +
                res.valid
                  .map(
                    (v) =>
                      `${v.email},${v.firstname || ''},${v.lastname || ''},${v.company || ''},${v.phone || ''}`
                  )
                  .join('\n')
            );
            return fd;
          })(),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.createdList) {
          setLists([uploadData.createdList, ...lists]);
          setSelectedListId(uploadData.createdList.id);
          setListCount(res.valid.length);
        }
      } catch (err) {
        console.error('Auto upload list error:', err);
      }
    }
  };

  const handleSelectExistingList = (list: ContactList) => {
    setSelectedListId(list.id);
    setListCount(list.total_contacts || 8);
    setStep2Error('');
  };

  const handleStep2Next = () => {
    const totalCount = (csvResult && csvResult.valid.length > 0) ? csvResult.valid.length : listCount;
    if (totalCount === 0) {
      setStep2Error('The selected recipient list has 0 contacts. Please upload a CSV file or select a list with active contacts before continuing.');
      return;
    }
    setStep2Error('');
    setStep(3);
  };

  const handleSendTestEmail = async (recipient: string) => {
    const res = await fetch('/api/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient,
        subject,
        bodyHtml,
        senderName,
        replyTo,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Test send failed');
  };

  const getMinDateTimeString = () => {
    const d = new Date(Date.now() + 3 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const setPresetTime = (hoursFromNow: number, targetHour?: number) => {
    const d = new Date();
    if (targetHour !== undefined) {
      if (hoursFromNow >= 24) {
        d.setDate(d.getDate() + 1);
      }
      d.setHours(targetHour, 0, 0, 0);
      if (d.getTime() <= Date.now()) {
        d.setDate(d.getDate() + 1);
      }
    } else {
      d.setTime(d.getTime() + hoursFromNow * 3600 * 1000);
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const str = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setScheduledDateTime(str);
    setScheduleError('');
  };

  const handleLaunchCampaign = async () => {
    const totalCount = (csvResult && csvResult.valid.length > 0) ? csvResult.valid.length : listCount;
    if (totalCount === 0) {
      alert('Cannot launch campaign: 0 recipients detected. Please return to Step 2 and upload your contacts CSV.');
      return;
    }

    if (deliveryMode === 'scheduled') {
      if (!scheduledDateTime) {
        setScheduleError('Please select a date and time for the scheduled delivery.');
        return;
      }
      const scheduledEpoch = new Date(scheduledDateTime).getTime();
      if (isNaN(scheduledEpoch) || scheduledEpoch <= Date.now()) {
        setScheduleError('Please select a future date and time (at least 2 minutes from now).');
        return;
      }
    }
    setScheduleError('');

    setIsSubmitting(true);
    try {
      const targetListId = selectedListId || 'lst-1';

      let userEmail = '';
      if (typeof window !== 'undefined') {
        try {
          const u = localStorage.getItem('automailer_user');
          if (u) userEmail = JSON.parse(u).email || '';
        } catch (e) {}
      }

      const isScheduled = deliveryMode === 'scheduled';
      const scheduledIso = isScheduled ? new Date(scheduledDateTime).toISOString() : undefined;

      const createRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          user_email: userEmail,
          subject,
          preview_text: previewText,
          sender_name: senderName,
          reply_to: replyTo,
          template_id: selectedTemplateId || null,
          list_id: targetListId,
          body_html: bodyHtml,
          speed_preset: speedPreset,
          emails_per_minute: customSpeed,
          scheduled_at: scheduledIso,
          schedule_type: isScheduled ? scheduleType : undefined,
          recurrence_pattern: isScheduled && scheduleType === 'recurring' ? recurrencePattern : undefined,
          recurrence_interval_hours: recurrenceIntervalHours,
          auto_retry_failed: autoRetryFailed,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Failed to create campaign');

      const createdCampaign = createData.campaign;
      const campaignId = createdCampaign.id;

      // Save to localStorage immediately so it survives any serverless cold start
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('automailer_campaigns');
          const existing = stored ? JSON.parse(stored) : [];
          const updated = [createdCampaign, ...existing.filter((c: any) => c.id !== campaignId)];
          localStorage.setItem('automailer_campaigns', JSON.stringify(updated));
        } catch (e) {}
      }

      if (isScheduled) {
        alert(`Campaign "${name}" has been successfully scheduled! Delivery is automated.`);
        router.push('/schedule');
      } else {
        // Immediately launch sending queue process
        await fetch(`/api/campaigns/${campaignId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
        });

        router.push(`/campaigns/${campaignId}/progress`);
      }
    } catch (err: any) {
      alert(`Error launching campaign: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="pl-0 md:pl-64 transition-all">
        <Navbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                Campaign Creator Wizard
              </h1>
              <p className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Configure deliverability, recipient list, and personalized digital product content
              </p>
            </div>
          </div>

          {/* Stepper Progress Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { num: 1, title: 'Details' },
              { num: 2, title: 'Recipients & CSV' },
              { num: 3, title: 'Template & Link' },
              { num: 4, title: 'Speed & Launch' },
            ].map((s) => (
              <button
                key={s.num}
                onClick={() => s.num < step && setStep(s.num)}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl p-2.5 sm:p-3 text-[11px] sm:text-xs font-bold transition-all ${
                  step === s.num
                    ? 'bg-blue-600 text-white shadow-md'
                    : step > s.num
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900'
                }`}
              >
                {step > s.num ? <Check className="h-3.5 w-3.5" /> : <span>{s.num}.</span>}
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>

          {/* STEP 1: Details */}
          {step === 1 && (
            <GlassCard className="space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 pb-3 dark:border-zinc-800">
                Step 1: Campaign Configuration
              </h3>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Sender / Reply-To Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@growmoredigitally.in"
                    value={replyTo}
                    onChange={(e) => {
                      setReplyTo(e.target.value);
                      setStep1Error('');
                    }}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    💡 If sending via Amazon SES, use your verified sender email (e.g. <code>@growmoredigitally.in</code>)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Preview Text (Inbox Snippet)
                </label>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              {step1Error && (
                <p className="text-xs font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {step1Error}
                </p>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!name.trim()) {
                      setStep1Error('Please enter a Campaign Name.');
                      return;
                    }
                    if (!senderName.trim()) {
                      setStep1Error('Please enter a Sender Name.');
                      return;
                    }
                    if (!replyTo.trim() || !replyTo.includes('@')) {
                      setStep1Error('Please enter a valid Sender/Reply-To Email address (e.g. rahul@growmoredigitally.in).');
                      return;
                    }
                    setStep1Error('');
                    setStep(2);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                >
                  Next: Select Recipients <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </GlassCard>
          )}

          {/* STEP 2: Recipients */}
          {step === 2 && (
            <GlassCard className="space-y-6">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 pb-3 dark:border-zinc-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" /> Step 2: Select Recipient List or Upload Contacts
              </h3>

              {/* Option A: Choose from existing lists */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Option A: Choose Saved Contact List
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lists.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleSelectExistingList(l)}
                      className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                        selectedListId === l.id
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-500/10'
                          : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{l.name}</h4>
                        <p className="text-[11px] text-zinc-500">{l.description || 'Saved contact list'}</p>
                      </div>
                      <Badge variant="blue">{l.total_contacts} Contacts</Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Option B: CSV Upload & Manual Add */}
              <div className="space-y-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Option B: Upload CSV File or Add Single Mail
                </label>
                <CsvUploader onValidationComplete={handleCsvValidationComplete} />
              </div>

              {/* Selected List Confirmation Badge */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Recipient Target Configured
                </span>
                <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                  {listCount} Active Email Recipients Ready
                </span>
              </div>

              {step2Error && (
                <p className="text-xs font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {step2Error}
                </p>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                >
                  Next: Design Email Content <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </GlassCard>
          )}

          {/* STEP 3: Template & Editor */}
          {step === 3 && (
            <GlassCard className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Step 3: Personalization & Email Content
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  🎯 Primary Inbox Optimized Template Active
                </span>
              </div>

              {/* Primary Inbox Guidance Banner */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 p-3.5 text-xs text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <span>💡 How to land in the Primary Inbox (instead of &quot;Promotions&quot; or &quot;All Mail&quot;):</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                  <li><strong>Human Conversational Style:</strong> Left-aligned text with standard paragraphs bypasses Gmail&apos;s promotional tab filters.</li>
                  <li><strong>Avoid Heavy Marketing Elements:</strong> Big colorful buttons, badges, and unsubscribe footers trigger Gmail&apos;s &quot;Promotions&quot; category.</li>
                  <li><strong>Natural Links:</strong> Use standard inline links (e.g. <code>https://yourwebsite.com</code>) rather than 200px wide graphic buttons.</li>
                </ul>
              </div>

              <EmailEditor
                subject={subject}
                bodyHtml={bodyHtml}
                onSubjectChange={setSubject}
                onBodyHtmlChange={setBodyHtml}
                onSendTestEmail={handleSendTestEmail}
              />

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                >
                  Next: Configure Speed & Send <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </GlassCard>
          )}

          {/* STEP 4: Speed Selector & Launch */}
          {step === 4 && (
            <GlassCard className="space-y-6">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 pb-3 dark:border-zinc-800">
                Step 4: Speed Control & Delivery Scheduling
              </h3>

              <SpeedSelector
                selectedPreset={speedPreset}
                customSpeed={customSpeed}
                onPresetChange={setSpeedPreset}
                onCustomSpeedChange={setCustomSpeed}
              />

              {/* Delivery Timing Options: Now vs Scheduled */}
              <div className="space-y-3 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Delivery Timing
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('now');
                      setScheduleError('');
                    }}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      deliveryMode === 'now'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-500/10'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900'
                    }`}
                  >
                    <Send className={`h-5 w-5 mt-0.5 shrink-0 ${deliveryMode === 'now' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'}`} />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">🚀 Send Immediately</h4>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                        Queue and start dispatching emails right now via SMTP with live delivery monitoring.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode('scheduled');
                      if (!scheduledDateTime) {
                        setPresetTime(1); // Default to +1 hour
                      }
                      setScheduleError('');
                    }}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      deliveryMode === 'scheduled'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-500/10'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900'
                    }`}
                  >
                    <Calendar className={`h-5 w-5 mt-0.5 shrink-0 ${deliveryMode === 'scheduled' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'}`} />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">📅 Schedule for Later</h4>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                        Pick a date and time. Automailer will automatically start sending when the time arrives.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Scheduled DateTime Picker & Quick Presets */}
                {deliveryMode === 'scheduled' && (
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/5 p-4 space-y-4">
                    {/* Schedule Type Selection: Once vs Recurring */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Select Automation Schedule Type
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setScheduleType('once')}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                            scheduleType === 'once'
                              ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                          }`}
                        >
                          <Clock className="h-4 w-4 shrink-0" />
                          <div>
                            <div>One-Time Dispatch</div>
                            <div className={`text-[10px] font-normal ${scheduleType === 'once' ? 'text-blue-100' : 'text-zinc-400'}`}>
                              Send once at the scheduled date & time
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setScheduleType('recurring')}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                            scheduleType === 'recurring'
                              ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                          }`}
                        >
                          <Repeat className="h-4 w-4 shrink-0" />
                          <div>
                            <div>Automated Recurring</div>
                            <div className={`text-[10px] font-normal ${scheduleType === 'recurring' ? 'text-blue-100' : 'text-zinc-400'}`}>
                              Repeats every day, weekday, or week automatically
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* If Recurring, choose recurrence frequency */}
                    {scheduleType === 'recurring' && (
                      <div className="space-y-2 rounded-xl bg-white dark:bg-zinc-900 p-3.5 border border-zinc-200 dark:border-zinc-800">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Repeat className="h-3.5 w-3.5 text-blue-500" /> Choose Repeat Frequency
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { key: 'daily', label: 'Every Day' },
                            { key: 'weekdays', label: 'Weekdays (Mon-Fri)' },
                            { key: 'weekly', label: 'Every Week' },
                            { key: 'monthly', label: 'Every Month' },
                          ].map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setRecurrencePattern(item.key as RecurrencePattern)}
                              className={`p-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                                recurrencePattern === item.key
                                  ? 'border-blue-600 bg-blue-50 text-blue-600 font-bold dark:bg-blue-500/20 dark:text-blue-300'
                                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-blue-500" />
                        {scheduleType === 'recurring' ? 'First Scheduled Dispatch Date & Time' : 'Select Dispatch Date & Time'}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        Timezone: {typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Local'}
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(Date.now() + 15 * 60 * 1000);
                          const pad = (n: number) => String(n).padStart(2, '0');
                          setScheduledDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                          setScheduleError('');
                        }}
                        className="rounded-lg border border-blue-500/30 bg-white dark:bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors shadow-xs"
                      >
                        ⏱ In 15 Mins
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetTime(1)}
                        className="rounded-lg border border-blue-500/30 bg-white dark:bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors shadow-xs"
                      >
                        ⏱ In 1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetTime(24, 9)}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
                      >
                        ☀️ Tomorrow 9:00 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetTime(24, 18)}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
                      >
                        🌙 Tomorrow 6:00 PM
                      </button>
                    </div>

                    <div>
                      <input
                        type="datetime-local"
                        min={getMinDateTimeString()}
                        value={scheduledDateTime}
                        onChange={(e) => {
                          setScheduledDateTime(e.target.value);
                          setScheduleError('');
                        }}
                        className="w-full sm:w-auto rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      />
                    </div>

                    {/* Guarantee Every Mail Sends Checkbox */}
                    <div className="pt-2 border-t border-blue-500/20">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoRetryFailed}
                          onChange={(e) => setAutoRetryFailed(e.target.checked)}
                          className="mt-0.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700"
                        />
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            Guarantee Every Mail Sends Every Time
                          </span>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Ensures 100% of contact recipients receive the email on every scheduled run. Automatically triggers multi-sender pool failover and instant retry if an outbound connection fails.
                          </p>
                        </div>
                      </label>
                    </div>

                    {scheduleError && (
                      <p className="text-xs font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 shrink-0" /> {scheduleError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Status Summary Banner */}
              {deliveryMode === 'now' ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Ready for Immediate Launch
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    Target List: <strong>{listCount} Recipient Emails</strong>. Each email will be sent via your verified Gmail SMTP provider with rate limiting and live monitoring.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Ready for Automated Scheduled Dispatch
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    Target List: <strong>{listCount} Recipient Emails</strong>.
                    {scheduledDateTime ? (
                      <> This campaign will automatically begin sending on <strong>{new Date(scheduledDateTime).toLocaleString()}</strong>.</>
                    ) : (
                      <> Please select a schedule date and time above.</>
                    )}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full sm:w-auto rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleLaunchCampaign}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer ${
                    deliveryMode === 'scheduled'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/30'
                  }`}
                >
                  {deliveryMode === 'scheduled' ? (
                    <>
                      <Calendar className="h-4 w-4" />
                      <span>{isSubmitting ? 'Scheduling Campaign...' : `Schedule Campaign (${listCount} Recipients)`}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>{isSubmitting ? 'Launching Campaign...' : `Start Sending to ${listCount} Recipients Now`}</span>
                    </>
                  )}
                </button>
              </div>
            </GlassCard>
          )}
        </main>
      </div>
    </div>
  );
}
