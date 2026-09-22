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
import { SpeedPreset, ContactList, EmailTemplate, CsvValidationResult } from '@/types';
import { ArrowLeft, ArrowRight, Check, Send, Sparkles, FileSpreadsheet, Users, AlertCircle } from 'lucide-react';

export default function NewCampaignWizard() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);

  // Step 1 Form Data
  const [name, setName] = useState('New Email Campaign');
  const [subject, setSubject] = useState('Exclusive Access & Recipient Details for {{firstname}} at {{company}}');
  const [previewText, setPreviewText] = useState('Get access to our product suite');
  const [senderName, setSenderName] = useState('');
  const [replyTo, setReplyTo] = useState('');

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
    `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase;">Exclusive Announcement</span>
    <h2 style="color: #0f172a; font-size: 24px; font-weight: 800; margin-top: 16px; margin-bottom: 8px;">Hello {{firstname}},</h2>
  </div>

  <div style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
    <p>We are thrilled to connect with you and your team at <strong>{{company}}</strong>!</p>
    
    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 0 12px 12px 0; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2563eb; font-size: 18px; font-weight: 700;">🚀 Premium Features</h3>
      <p style="margin-bottom: 12px; color: #475569; font-size: 14px;">Gain instant access to automated workflows, templates, and solutions.</p>
    </div>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://yourproductlink.com" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 700; display: inline-block;">
      👉 Get Access Now
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
  <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
    Sent to {{email}} • Reply to unsubscribe.
  </p>
</div>`
  );

  // Step 4 Speed & Dispatch Options
  const [speedPreset, setSpeedPreset] = useState<SpeedPreset>('medium');
  const [customSpeed, setCustomSpeed] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load initial user settings and saved contact lists
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          if (data.profile.sender_name) setSenderName(data.profile.sender_name);
          if (data.profile.reply_to_email || data.profile.smtp_user) {
            setReplyTo(data.profile.reply_to_email || data.profile.smtp_user);
          }
        }
      });

    // Fetch user's real saved contact lists
    fetch('/api/contacts')
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
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: (() => {
            const fd = new FormData();
            fd.append('listName', listName || `${name} List`);
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
    if (!selectedListId && (!csvResult || csvResult.valid.length === 0)) {
      setStep2Error('Please select an existing list or add at least 1 valid contact email!');
      return;
    }
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

  const handleLaunchCampaign = async () => {
    setIsSubmitting(true);
    try {
      const targetListId = selectedListId || 'lst-1';

      const createRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject,
          preview_text: previewText,
          sender_name: senderName,
          reply_to: replyTo,
          template_id: selectedTemplateId || null,
          list_id: targetListId,
          body_html: bodyHtml,
          speed_preset: speedPreset,
          emails_per_minute: customSpeed,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Failed to create campaign');

      const campaignId = createData.campaign.id;

      // Immediately launch sending queue process
      await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      router.push(`/campaigns/${campaignId}/progress`);
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
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
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

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
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
              <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 pb-3 dark:border-zinc-800">
                Step 3: Personalization & Digital Product Link
              </h3>

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
                Step 4: Speed Control & Dispatch
              </h3>

              <SpeedSelector
                selectedPreset={speedPreset}
                customSpeed={customSpeed}
                onPresetChange={setSpeedPreset}
                onCustomSpeedChange={setCustomSpeed}
              />

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Ready for Immediate Launch
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Target List: <strong>{listCount} Recipient Emails</strong>. Each email will be sent via your verified Gmail SMTP provider with rate limiting and live monitoring.
                </p>
              </div>

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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:scale-[1.02] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'Launching Campaign...' : `Start Sending to ${listCount} Recipients Now`}</span>
                </button>
              </div>
            </GlassCard>
          )}
        </main>
      </div>
    </div>
  );
}
