'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SpamDetectorWidget } from './SpamDetector';
import { Send, Eye, Code, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [testEmailInput, setTestEmailInput] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

        {/* Tab Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'editor'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <Code className="h-3.5 w-3.5" /> HTML Code Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Live Rendered Preview
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-500">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Supported: &#123;&#123;firstname&#125;&#125;, &#123;&#123;lastname&#125;&#125;, &#123;&#123;company&#125;&#125;, &#123;&#123;email&#125;&#125;, &#123;&#123;phone&#125;&#125;</span>
          </div>
        </div>

        {activeTab === 'editor' ? (
          <div>
            <textarea
              rows={12}
              value={bodyHtml}
              onChange={(e) => onBodyHtmlChange(e.target.value)}
              className="w-full font-mono text-xs rounded-xl border border-zinc-200 bg-white p-3.5 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950 min-h-[300px]">
            <div
              className="prose dark:prose-invert max-w-none text-xs"
              dangerouslySetInnerHTML={{
                __html: bodyHtml
                  .replace(/\{\{firstname\}\}/g, 'John')
                  .replace(/\{\{lastname\}\}/g, 'Doe')
                  .replace(/\{\{company\}\}/g, 'TechCorp Inc')
                  .replace(/\{\{email\}\}/g, 'john.doe@techcorp.com')
                  .replace(/\{\{phone\}\}/g, '+1-555-0192'),
              }}
            />
          </div>
        )}

        {/* Send Instant Test Email Section */}
        {onSendTestEmail && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="email"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                placeholder="Enter email for instant preview test..."
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
