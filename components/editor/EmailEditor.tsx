'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SpamDetectorWidget } from './SpamDetector';
import { interpolateVariables } from '@/lib/utils';
import {
  Send,
  Eye,
  Code,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Smartphone,
  Monitor,
  Columns,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

interface EmailEditorProps {
  subject: string;
  bodyHtml: string;
  onSubjectChange: (val: string) => void;
  onBodyHtmlChange: (val: string) => void;
  onSendTestEmail?: (recipient: string) => Promise<void>;
}

export function EmailEditor({
  subject,
  bodyHtml,
  onSubjectChange,
  onBodyHtmlChange,
  onSendTestEmail,
}: EmailEditorProps) {
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split'>('split');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmailInput, setTestEmailInput] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sample data for live preview
  const [sampleVariables, setSampleVariables] = useState<Record<string, string>>({
    firstname: 'John',
    lastname: 'Doe',
    company: 'TechCorp Inc',
    email: 'john.doe@techcorp.com',
    phone: '+1-555-0192',
  });

  const handleSendTest = async () => {
    if (!testEmailInput || !onSendTestEmail) return;
    setIsSendingTest(true);
    setTestStatus(null);
    try {
      await onSendTestEmail(testEmailInput);
      setTestStatus({ type: 'success', message: `Test email successfully sent to ${testEmailInput}!` });
    } catch (err: any) {
      setTestStatus({ type: 'error', message: err.message || 'Failed to send test email' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const getRenderedHtml = () => {
    const interpolated = interpolateVariables(bodyHtml || '', sampleVariables);
    return interpolated || '<div style="font-family: sans-serif; color: #64748b; text-align: center; padding: 40px;"><em>Start typing in the HTML editor to see live email preview...</em></div>';
  };

  const getRenderedSubject = () => {
    return interpolateVariables(subject || '', sampleVariables) || '(No Subject Line)';
  };

  return (
    <div className="space-y-4">
      {/* Live Spam Keywords & Deliverability Score Widget */}
      <SpamDetectorWidget subject={subject} bodyHtml={bodyHtml} />

      {/* Editor & Preview Toggle Card */}
      <GlassCard className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Email Subject Line (Supports Personalization Tags e.g. &#123;&#123;firstname&#125;&#125;, &#123;&#123;company&#125;&#125;)
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            placeholder="Exclusive Offer for {{firstname}} at {{company}}"
          />
        </div>

        {/* View Mode Controls & Device Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'editor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <Code className="h-3.5 w-3.5" /> HTML Editor
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'split'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <Columns className="h-3.5 w-3.5" /> Split View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'preview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Full Preview
            </button>
          </div>

          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    deviceMode === 'desktop'
                      ? 'bg-white shadow-sm text-blue-600 dark:bg-zinc-800 dark:text-blue-400'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    deviceMode === 'mobile'
                      ? 'bg-white shadow-sm text-blue-600 dark:bg-zinc-800 dark:text-blue-400'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  title="Mobile Preview (375px)"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-zinc-500">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Live Variable Preview</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Area (Editor / Preview / Split View) */}
        <div
          className={`grid gap-4 ${
            viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2 items-start' : 'grid-cols-1'
          }`}
        >
          {/* HTML Code Editor */}
          {(viewMode === 'editor' || viewMode === 'split') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 px-1">
                <span>HTML Code Source</span>
                <span className="font-mono text-[11px]">{bodyHtml.length} characters</span>
              </div>
              <textarea
                rows={viewMode === 'split' ? 18 : 14}
                value={bodyHtml}
                onChange={(e) => onBodyHtmlChange(e.target.value)}
                placeholder="<div style='font-family: sans-serif;'><h1>Hello {{firstname}},</h1>...</div>"
                className="w-full font-mono text-xs rounded-xl border border-zinc-200 bg-white p-3.5 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 resize-y"
              />
            </div>
          )}

          {/* Rendered Email Preview Client Box */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 px-1">
                <span>Live Email Client Preview ({deviceMode === 'mobile' ? 'Mobile 375px' : 'Desktop'})</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Updated
                </span>
              </div>

              {/* Email Envelope Container */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-100/70 p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col items-center justify-start overflow-hidden">
                <div
                  className={`w-full transition-all duration-300 rounded-xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 overflow-hidden ${
                    deviceMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[620px]'
                  }`}
                >
                  {/* Fake Email Client Header */}
                  <div className="border-b border-zinc-100 bg-zinc-50/90 px-4 py-3 text-xs space-y-1 text-zinc-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 text-sm">{getRenderedSubject()}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Just Now</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 flex flex-wrap items-center gap-2">
                      <span><strong>To:</strong> {sampleVariables.firstname} &lt;{sampleVariables.email}&gt;</span>
                      <span className="text-zinc-300">•</span>
                      <span><strong>Company:</strong> {sampleVariables.company}</span>
                    </div>
                  </div>

                  {/* Rendered Body Container (Always Clean White Canvas for authentic email styling) */}
                  <div className="p-4 sm:p-6 bg-white text-zinc-900 min-h-[320px] overflow-auto">
                    <div
                      className="email-preview-content text-left"
                      dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Send Instant Test Email Section */}
        {onSendTestEmail && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="email"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                placeholder="Enter recipient email for real inbox test..."
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
              <button
                type="button"
                disabled={isSendingTest}
                onClick={handleSendTest}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSendingTest ? 'Sending...' : 'Send Test Mail'}</span>
              </button>
            </div>

            {testStatus && (
              <span
                className={`text-xs font-bold flex items-center gap-1 ${
                  testStatus.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                {testStatus.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {testStatus.message}
              </span>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

