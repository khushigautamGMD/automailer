'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { SmtpAccount } from '@/types';
import {
  Save,
  CheckCircle,
  AlertCircle,
  Send,
  Plus,
  Trash2,
  Edit2,
  Users,
  Key,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PlanLimitBanner } from '@/components/ui/PlanLimitBanner';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({
    sender_name: '',
    reply_to_email: '',
    resend_api_key: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    enable_rotation: true,
  });

  const [smtpAccounts, setSmtpAccounts] = useState<SmtpAccount[]>([]);

  // Modal State for Add & Edit
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accName, setAccName] = useState('');
  const [accUser, setAccUser] = useState('');
  const [accPass, setAccPass] = useState('');

  // Guide Toggle State
  const [showGuide, setShowGuide] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Test Email Modal / Feedback State
  const [testEmailInput, setTestEmailInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          if (data.profile.smtp_accounts) {
            setSmtpAccounts(data.profile.smtp_accounts);
          }
        }
      });
  }, []);

  const handleOpenAddModal = () => {
    setEditingAccountId(null);
    setAccName('');
    setAccUser('');
    setAccPass('');
    setShowAccountModal(true);
  };

  const handleOpenEditModal = (acc: SmtpAccount) => {
    setEditingAccountId(acc.id);
    setAccName(acc.name);
    setAccUser(acc.user);
    setAccPass(acc.pass);
    setShowAccountModal(true);
  };

  const handleSaveAccountModal = () => {
    if (!accUser || !accPass) {
      alert('Please enter Sender Email and App Password');
      return;
    }

    if (editingAccountId) {
      // Edit existing
      setSmtpAccounts(
        smtpAccounts.map((a) =>
          a.id === editingAccountId
            ? { ...a, name: accName || a.name, user: accUser, pass: accPass }
            : a
        )
      );
    } else {
      // Add new
      const newAcc: SmtpAccount = {
        id: `smtp-${Date.now()}`,
        name: accName || `Sender (${accUser.split('@')[0]})`,
        host: 'smtp.gmail.com',
        port: 587,
        user: accUser,
        pass: accPass,
        active: true,
      };
      setSmtpAccounts([...smtpAccounts, newAcc]);
    }

    setShowAccountModal(false);
  };

  const handleDeleteSmtpAccount = (id: string) => {
    setSmtpAccounts(smtpAccounts.filter((a) => a.id !== id));
  };

  const handleToggleSmtpAccount = (id: string) => {
    setSmtpAccounts(
      smtpAccounts.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            ...profile,
            smtp_accounts: smtpAccounts,
          },
        }),
      });
      if (res.ok) {
        setSaveStatus('Settings successfully saved!');
      } else {
        throw new Error('Save failed');
      }
    } catch (err: any) {
      setSaveStatus('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testEmailInput) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailInput.trim(),
          subject: '[TEST PREVIEW] Automailer Connection Test',
          bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; background-color: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="background-color: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; text-transform: uppercase;">Verified Connection</span>
              <h2 style="color: #0f172a; margin-top: 12px; margin-bottom: 4px;">🎉 SMTP Test Successful!</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 0;">Your outbound email engine is connected and ready to send campaigns.</p>
            </div>
            <div style="background-color: #f8fafc; border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.6; border: 1px solid #e2e8f0;">
              <div><strong>SMTP Host:</strong> ${profile.smtp_host || 'Default'}</div>
              <div><strong>Port:</strong> ${profile.smtp_port || 587}</div>
              <div><strong>Sender Identity:</strong> ${profile.reply_to_email || profile.smtp_user}</div>
              <div><strong>Delivered To:</strong> ${testEmailInput.trim()}</div>
            </div>
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px;">Automailer Outreach Engine • Test Delivery</p>
          </div>`,
          senderName: profile.sender_name || 'Automailer',
          senderEmail: profile.reply_to_email || (profile.smtp_user?.includes('@') ? profile.smtp_user : undefined),
          replyTo: profile.reply_to_email || profile.smtp_user,
          smtpHost: profile.smtp_host,
          smtpPort: profile.smtp_port,
          smtpUser: profile.smtp_user,
          smtpPass: profile.smtp_pass,
          smtpAccounts: smtpAccounts,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Connection Verified! Test email delivered to ${testEmailInput}.`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'SMTP Connection Failed. Verify App Password.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="pl-0 md:pl-64 transition-all">
        <Navbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                Outbound Engine & SMTP Settings
              </h1>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Configure Multi-Sender Rotation Pool, Gmail App Passwords, and Resend API
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

          {/* Plan Limits Banner */}
          <PlanLimitBanner profile={profile} />

          {saveStatus && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {saveStatus}
            </div>
          )}

          {/* Guide Card: Providers & Anti-Spam Setup (Amazon SES & Gmail) */}
          <GlassCard className="space-y-4 border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Key className="h-4 w-4 shrink-0" /> 📖 Amazon SES & SMTP Setup (Prevent Spam & Send 2 Lakh+ Emails)
              </h3>

              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 p-1 shrink-0"
              >
                {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showGuide && (
              <div className="space-y-4 pt-2 text-xs text-zinc-700 dark:text-zinc-300 border-t border-blue-500/10">
                {/* 1. Amazon SES High Deliverability Setup */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2.5 text-emerald-950 dark:text-emerald-200">
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                    🚀 How to Connect Amazon SES (Zero Spam & 2 Lakh Mails/Month)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl border border-emerald-500/20 bg-white/60 dark:bg-zinc-900/60 p-3 space-y-1">
                      <strong className="text-emerald-600 dark:text-emerald-400">Step 1: Verify Domain in AWS SES</strong>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        In AWS Console &gt; Amazon SES &gt; <strong>Verified Identities</strong> &gt; Create Identity &gt; Enter your domain (e.g. <code>yourdomain.com</code>).
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-white/60 dark:bg-zinc-900/60 p-3 space-y-1">
                      <strong className="text-emerald-600 dark:text-emerald-400">Step 2: Add 3 DNS Records (Zero Spam)</strong>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Add the <strong>DKIM (CNAME)</strong>, <strong>SPF (TXT: <code>v=spf1 include:amazonses.com ~all</code>)</strong>, and <strong>DMARC</strong> records to your domain DNS (Cloudflare/GoDaddy).
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-white/60 dark:bg-zinc-900/60 p-3 space-y-1">
                      <strong className="text-emerald-600 dark:text-emerald-400">Step 3: Move Out of Sandbox</strong>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        In Amazon SES &gt; Account Dashboard &gt; Click <strong>Request Production Access</strong> (Describe you send opted-in transactional/marketing emails for 200,000/mo).
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-white/60 dark:bg-zinc-900/60 p-3 space-y-1">
                      <strong className="text-emerald-600 dark:text-emerald-400">Step 4: Create SMTP Credentials</strong>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        In Amazon SES &gt; <strong>SMTP Settings</strong> &gt; Click <strong>Create SMTP Credentials</strong> &gt; Copy the Username & Password into the form below!
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Gmail App Password Guide */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-3 space-y-2">
                  <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                    📩 Alternatively: Using Gmail / Google Workspace SMTP
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Host: <code>smtp.gmail.com</code> | Port: <code>587</code> | Password: 16-letter App Password from <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-500 underline inline-flex items-center gap-0.5">myaccount.google.com/apppasswords <ExternalLink className="h-3 w-3" /></a>
                  </p>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Section 1: Multi-Sender Accounts Manager (With Edit & Delete) */}
          <GlassCard className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" /> Multi-Sender Account Rotation Pool
                </h3>
                <p className="text-xs text-zinc-500">
                  Rotate sender accounts in round-robin mode for 1,000+ daily email campaigns to maintain 100% clean domain reputation
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
              >
                <Plus className="h-4 w-4" /> Add Sender Account
              </button>
            </div>

            {/* Smtp Account Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {smtpAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`rounded-xl border p-4 transition-all ${
                    acc.active
                      ? 'border-blue-500/40 bg-blue-50/40 dark:border-blue-500/30 dark:bg-blue-500/10'
                      : 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-white truncate">{acc.name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSmtpAccount(acc.id)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold shrink-0 ${
                        acc.active ? 'bg-emerald-500 text-white' : 'bg-zinc-300 text-zinc-700'
                      }`}
                    >
                      {acc.active ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs font-mono text-zinc-600 dark:text-zinc-300 truncate">{acc.user}</p>
                  
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">App Password Connected</span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(acc)}
                        className="text-blue-500 hover:text-blue-600 p-1 flex items-center gap-1 text-[11px] font-bold"
                        title="Edit Account Details"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleDeleteSmtpAccount(acc.id)}
                        className="text-rose-500 hover:text-rose-600 p-1"
                        title="Delete Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Section 2: Direct Outbound SMTP */}
          <GlassCard className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Primary Outbound SMTP (Amazon SES / Gmail / Custom)
                </h3>
                <p className="text-xs text-zinc-500">Select a one-click preset or enter your custom SMTP host</p>
              </div>

              {/* Provider Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, smtp_host: 'email-smtp.ap-south-1.amazonaws.com', smtp_port: 587 })}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                >
                  ⚡ Amazon SES (Mumbai)
                </button>
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, smtp_host: 'email-smtp.us-east-1.amazonaws.com', smtp_port: 587 })}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                >
                  ⚡ Amazon SES (US)
                </button>
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, smtp_host: 'smtp.gmail.com', smtp_port: 587 })}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                >
                  Gmail
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={profile.smtp_host || 'smtp.gmail.com'}
                  onChange={(e) => setProfile({ ...profile, smtp_host: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-mono text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={profile.smtp_port || 587}
                  onChange={(e) => setProfile({ ...profile, smtp_port: parseInt(e.target.value) })}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-mono text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  SMTP Username / Sender Email (or SES Access Key)
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. AKIAIOSFODNN7EXAMPLE or sender@yourdomain.com"
                  value={profile.smtp_user || ''}
                  onChange={(e) => setProfile({ ...profile, smtp_user: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  SMTP Password (or SES Secret Key)
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="SES SMTP Password or Gmail App Password"
                  value={profile.smtp_pass || ''}
                  onChange={(e) => setProfile({ ...profile, smtp_pass: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-mono text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Sender / From Email (Verified in AWS SES)
                </label>
                <input
                  type="email"
                  placeholder="e.g. rahul@growmoredigitally.in"
                  value={profile.reply_to_email || ''}
                  onChange={(e) => setProfile({ ...profile, reply_to_email: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Goswami"
                  value={profile.sender_name || ''}
                  onChange={(e) => setProfile({ ...profile, sender_name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 max-w-md">
                  <input
                    type="email"
                    value={testEmailInput}
                    onChange={(e) => setTestEmailInput(e.target.value)}
                    placeholder="Enter email to test connection..."
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleTestConnection}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isTesting ? 'Testing Connection...' : 'Test Connection Now'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`rounded-xl border p-3 text-xs font-bold flex items-center gap-2 ${
                    testResult.success
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {testResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </GlassCard>
        </main>

        {/* Modal: Add/Edit Sender Account */}
        {showAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {editingAccountId ? 'Edit Sender Account' : 'Add New Sender Account to Pool'}
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Account Label</label>
                <input
                  type="text"
                  placeholder="e.g. Primary Gmail Sender"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Sender Email Address</label>
                <input
                  type="email"
                  placeholder="sender@gmail.com"
                  value={accUser}
                  onChange={(e) => setAccUser(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Gmail App Password (16 Letters)</label>
                <input
                  type="password"
                  placeholder="16-letter App Password"
                  value={accPass}
                  onChange={(e) => setAccPass(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAccountModal}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  {editingAccountId ? 'Save Changes' : 'Add Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
