'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  MousePointerClick,
  Palette,
  LayoutTemplate,
  FileText,
  HelpCircle,
  Undo,
  Redo,
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
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [viewMode, setViewMode] = useState<'editor' | 'split' | 'preview'>('split');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmailInput, setTestEmailInput] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Link Dialog State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // CTA Button Modal State
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [btnText, setBtnText] = useState('Get Started Now');
  const [btnUrl, setBtnUrl] = useState('https://yourwebsite.com');
  const [btnColor, setBtnColor] = useState('#2563eb');

  const visualEditorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromProps = useRef(false);

  // Sample data for live preview
  const sampleVariables = {
    firstname: 'John',
    lastname: 'Doe',
    company: 'TechCorp Inc',
    email: 'john.doe@techcorp.com',
    phone: '+1-555-0192',
  };

  // Synchronize bodyHtml into visual contentEditable on initial mount and when switching back to visual mode
  useEffect(() => {
    if (visualEditorRef.current && editorMode === 'visual') {
      if (!visualEditorRef.current.innerHTML || visualEditorRef.current.innerHTML !== bodyHtml) {
        isUpdatingFromProps.current = true;
        visualEditorRef.current.innerHTML = bodyHtml || '<p>Hi {{firstname}},</p><p>Write your message here...</p>';
        isUpdatingFromProps.current = false;
      }
    }
  }, [editorMode]);

  const handleVisualInput = () => {
    if (isUpdatingFromProps.current || !visualEditorRef.current) return;
    const newHtml = visualEditorRef.current.innerHTML;
    onBodyHtmlChange(newHtml);
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (visualEditorRef.current) {
      visualEditorRef.current.focus();
    }
    document.execCommand(command, false, value);
    handleVisualInput();
  };

  const insertVariableTag = (tag: string) => {
    if (editorMode === 'visual') {
      if (visualEditorRef.current) {
        visualEditorRef.current.focus();
      }
      document.execCommand('insertText', false, tag);
      handleVisualInput();
    } else {
      onBodyHtmlChange(bodyHtml + tag);
    }
  };

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;
    if (visualEditorRef.current) {
      visualEditorRef.current.focus();
    }
    const htmlToInsert = `<a href="${linkUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">${linkText || linkUrl}</a>`;
    document.execCommand('insertHTML', false, htmlToInsert);
    handleVisualInput();
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleInsertCtaButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!btnUrl || !btnText) return;
    if (visualEditorRef.current) {
      visualEditorRef.current.focus();
    }
    const buttonHtml = `<div style="text-align: center; margin: 24px 0;"><a href="${btnUrl}" target="_blank" style="background-color: ${btnColor}; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${btnText}</a></div><p><br></p>`;
    document.execCommand('insertHTML', false, buttonHtml);
    handleVisualInput();
    setShowButtonModal(false);
  };

  const applyTemplate = (templateType: 'letter' | 'modern' | 'minimal') => {
    let tpl = '';
    if (templateType === 'letter') {
      tpl = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.6; font-size: 15px;">
  <p>Hi {{firstname}},</p>
  <p>I hope this email finds you well at <strong>{{company}}</strong>.</p>
  <p>I wanted to quickly follow up regarding our digital solutions and how we can help your team scale faster.</p>
  <p>Would you have 10 minutes for a quick chat this week?</p>
  <div style="text-align: center; margin: 28px 0;">
    <a href="https://yourwebsite.com" target="_blank" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
      👉 Schedule Quick Call
    </a>
  </div>
  <p>Best regards,<br><strong>Your Name</strong><br><span style="color: #64748b; font-size: 13px;">GrowMore Digitally</span></p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 12px 0;" />
  <p style="font-size: 11px; color: #94a3b8; text-align: center;">Sent to {{email}} • Reply to unsubscribe</p>
</div>`;
    } else if (templateType === 'modern') {
      tpl = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase;">Special Offer</span>
    <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 14px; margin-bottom: 8px;">Exclusive Update for {{firstname}}</h2>
  </div>
  <div style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
    <p>We are delighted to share exclusive features and resources tailored specifically for <strong>{{company}}</strong>.</p>
    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 0 10px 10px 0; padding: 16px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2563eb; font-size: 16px; font-weight: 700;">🚀 Key Highlights</h3>
      <p style="margin-bottom: 0; color: #475569; font-size: 13.5px;">Get access to seamless automations, priority support, and digital assets.</p>
    </div>
  </div>
  <div style="text-align: center; margin: 28px 0;">
    <a href="https://yourwebsite.com" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 30px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: 700; display: inline-block;">
      Claim Your Access Now →
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;" />
  <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">Sent to {{email}} • Reply to unsubscribe</p>
</div>`;
    } else {
      tpl = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Hello {{firstname}},</p>
  <p>Type your regular email text here without worrying about HTML code.</p>
  <p>You can add bullet points, links, bold words, and personalization easily.</p>
  <p>Cheers,<br>Your Name</p>
</div>`;
    }

    onBodyHtmlChange(tpl);
    if (visualEditorRef.current) {
      visualEditorRef.current.innerHTML = tpl;
    }
  };

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
    return (
      interpolated ||
      '<div style="font-family: sans-serif; color: #64748b; text-align: center; padding: 40px;"><em>Start typing your email message to see the live preview...</em></div>'
    );
  };

  const getRenderedSubject = () => {
    return interpolateVariables(subject || '', sampleVariables) || '(No Subject Line)';
  };

  return (
    <div className="space-y-4">
      {/* Live Spam Keywords & Deliverability Score Widget */}
      <SpamDetectorWidget subject={subject} bodyHtml={bodyHtml} />

      {/* Main Email Editor Container */}
      <GlassCard className="space-y-4">
        {/* Subject Line Input with Quick Tags */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Email Subject Line
            </label>
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <span>Quick tags:</span>
              <button
                type="button"
                onClick={() => onSubjectChange(subject + ' {{firstname}}')}
                className="font-mono text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[10px]"
              >
                + firstname
              </button>
              <button
                type="button"
                onClick={() => onSubjectChange(subject + ' {{company}}')}
                className="font-mono text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[10px]"
              >
                + company
              </button>
            </div>
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            placeholder="Special update for {{firstname}} at {{company}}"
          />
        </div>

        {/* Editor Toolbar & Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-zinc-200/80 py-2.5 dark:border-zinc-800">
          {/* Left: Normal Visual vs HTML Code Mode Switch */}
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setEditorMode('visual');
                if (visualEditorRef.current) {
                  visualEditorRef.current.innerHTML = bodyHtml;
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                editorMode === 'visual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <Type className="h-3.5 w-3.5" /> ✍️ Normal (Simple) Text
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('code')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                editorMode === 'code'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <Code className="h-3.5 w-3.5" /> HTML Code
            </button>
          </div>

          {/* Quick Starter Templates */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-zinc-400 hidden sm:inline flex items-center gap-1">
              <LayoutTemplate className="h-3 w-3" /> Starter:
            </span>
            <button
              type="button"
              onClick={() => applyTemplate('letter')}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              title="Clean direct personal letter"
            >
              ✉️ Direct Letter
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('modern')}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              title="Modern announcement card with CTA button"
            >
              🎨 Card & Button
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('minimal')}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              title="Blank plain canvas"
            >
              📄 Blank Note
            </button>
          </div>

          {/* Right: Layout View Modes */}
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'editor'
                  ? 'bg-white shadow-sm text-blue-600 dark:bg-zinc-800 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              title="Editor Only"
            >
              <FileText className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'split'
                  ? 'bg-white shadow-sm text-blue-600 dark:bg-zinc-800 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              title="Split View (Editor + Live Preview)"
            >
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'preview'
                  ? 'bg-white shadow-sm text-blue-600 dark:bg-zinc-800 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
              title="Full Preview Only"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Normal Text Rich Formatting Toolbar (Visible in Visual Mode) */}
        {editorMode === 'visual' && (
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-50/80 p-2 rounded-xl border border-zinc-200/80 dark:bg-zinc-900/50 dark:border-zinc-800">
            {/* Text Styling */}
            <div className="flex items-center gap-1 border-r border-zinc-200 pr-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => executeCommand('bold')}
                className="p-1.5 rounded-lg text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('italic')}
                className="p-1.5 rounded-lg text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('underline')}
                className="p-1.5 rounded-lg text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Underline (Ctrl+U)"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Block Elements */}
            <div className="flex items-center gap-1 border-r border-zinc-200 pr-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => executeCommand('formatBlock', '<h2>')}
                className="px-2 py-1 rounded-lg text-xs font-bold text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => executeCommand('formatBlock', '<h3>')}
                className="px-2 py-1 rounded-lg text-xs font-bold text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Heading 3"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => executeCommand('formatBlock', '<p>')}
                className="px-2 py-1 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Normal Paragraph"
              >
                P
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-1 border-r border-zinc-200 pr-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => executeCommand('insertUnorderedList')}
                className="p-1.5 rounded-lg text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Bullet List"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('insertOrderedList')}
                className="p-1.5 rounded-lg text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Numbered List"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-1 border-r border-zinc-200 pr-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => executeCommand('justifyLeft')}
                className="p-1.5 rounded-lg text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Align Left"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyCenter')}
                className="p-1.5 rounded-lg text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title="Align Center"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Link & CTA Button Modals */}
            <div className="flex items-center gap-1.5 border-r border-zinc-200 pr-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
                title="Add Hyperlink"
              >
                <Link className="h-3 w-3 text-blue-500" /> Link
              </button>
              <button
                type="button"
                onClick={() => setShowButtonModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-400"
                title="Add Call-To-Action Button"
              >
                <MousePointerClick className="h-3 w-3" /> + CTA Button
              </button>
            </div>

            {/* Personalization Merge Variables (1-Click Insertion) */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-0.5 ml-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Insert:
              </span>
              {['{{firstname}}', '{{company}}', '{{email}}', '{{phone}}'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariableTag(tag)}
                  className="rounded-md bg-zinc-200/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-700 hover:bg-blue-500 hover:text-white dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-blue-600"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Area: Visual Editor / HTML Code / Live Preview */}
        <div
          className={`grid gap-4 ${
            viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2 items-start' : 'grid-cols-1'
          }`}
        >
          {/* Main Input Area */}
          {(viewMode === 'editor' || viewMode === 'split') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 px-1">
                <span>{editorMode === 'visual' ? '✍️ Normal Visual Editor (Type naturally)' : '💻 Raw HTML Code'}</span>
                <span className="font-mono text-[11px]">{bodyHtml.length} characters</span>
              </div>

              {editorMode === 'visual' ? (
                <div
                  ref={visualEditorRef}
                  contentEditable
                  onInput={handleVisualInput}
                  className="w-full min-h-[380px] max-h-[560px] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 leading-relaxed font-sans"
                  style={{ minHeight: '380px' }}
                />
              ) : (
                <textarea
                  rows={viewMode === 'split' ? 18 : 14}
                  value={bodyHtml}
                  onChange={(e) => onBodyHtmlChange(e.target.value)}
                  placeholder="<p>Hello {{firstname}}, write your email HTML here...</p>"
                  className="w-full font-mono text-xs rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 resize-y"
                />
              )}
            </div>
          )}

          {/* Rendered Email Preview Client Box */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 px-1">
                <span>Live Email Client Preview</span>
                <div className="flex items-center gap-2">
                  {/* Device Switcher */}
                  <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setDeviceMode('desktop')}
                      className={`p-1 rounded text-xs transition-all ${
                        deviceMode === 'desktop'
                          ? 'bg-white shadow-xs text-blue-600 dark:bg-zinc-800 dark:text-blue-400'
                          : 'text-zinc-400'
                      }`}
                      title="Desktop View"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceMode('mobile')}
                      className={`p-1 rounded text-xs transition-all ${
                        deviceMode === 'mobile'
                          ? 'bg-white shadow-xs text-blue-600 dark:bg-zinc-800 dark:text-blue-400'
                          : 'text-zinc-400'
                      }`}
                      title="Mobile View (375px)"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Updated
                  </span>
                </div>
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
                      <span>
                        <strong>To:</strong> {sampleVariables.firstname} &lt;{sampleVariables.email}&gt;
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span>
                        <strong>Company:</strong> {sampleVariables.company}
                      </span>
                    </div>
                  </div>

                  {/* Rendered Body Container */}
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
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
              <button
                type="button"
                disabled={isSendingTest}
                onClick={handleSendTest}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
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

      {/* Insert Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-xs p-4">
          <form
            onSubmit={handleInsertLink}
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-3"
          >
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Link className="h-4 w-4 text-blue-500" /> Insert Hyperlink
            </h4>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Link URL (Target)</label>
              <input
                type="url"
                required
                placeholder="https://yourwebsite.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Display Text</label>
              <input
                type="text"
                placeholder="Click here to visit"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Insert Link
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Insert Call-To-Action Button Modal */}
      {showButtonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-xs p-4">
          <form
            onSubmit={handleInsertCtaButton}
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 space-y-3"
          >
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-blue-500" /> Insert Action Button (CTA)
            </h4>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Button Text</label>
              <input
                type="text"
                required
                placeholder="e.g. Schedule Call / View Product"
                value={btnText}
                onChange={(e) => setBtnText(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Destination URL</label>
              <input
                type="url"
                required
                placeholder="https://yourwebsite.com/offer"
                value={btnUrl}
                onChange={(e) => setBtnUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Button Color</label>
              <div className="flex items-center gap-2 mt-1">
                {['#2563eb', '#16a34a', '#0f172a', '#dc2626', '#7c3aed', '#ea580c'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBtnColor(c)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      btnColor === c ? 'border-zinc-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowButtonModal(false)}
                className="rounded-xl border border-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Insert Button
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
