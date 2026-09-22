'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { EmailEditor } from '@/components/editor/EmailEditor';
import { EmailTemplate } from '@/types';
import { FileCode, Plus, Copy, Trash2, Edit3, Sparkles, Check, Eye } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Marketing');

  useEffect(() => {
    // Initial templates
    const seed: EmailTemplate[] = [
      {
        id: 'tpl-1',
        name: 'Business Proposal & Introduction',
        subject: 'Tailored Digital Solutions for {{company}}',
        preview_text: 'Custom proposal from GrowMore Digitally',
        category: 'Sales',
        variables: ['firstname', 'lastname', 'company', 'email'],
        created_at: new Date().toISOString(),
        body_html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #2563eb;">Hello {{firstname}},</h2>
  <p>I hope this email finds you well. I am reaching out to share how we can support <strong>{{company}}</strong>.</p>
  <p>Our team at GrowMore Digitally specializes in bespoke digital solutions and campaign automation.</p>
  <br/>
  <p>Best regards,<br/>GrowMore Digitally Team</p>
</div>`,
      },
      {
        id: 'tpl-2',
        name: 'Client Follow-Up Note',
        subject: 'Quick question regarding {{company}}',
        preview_text: 'Following up on our recent discussion',
        category: 'Follow-Up',
        variables: ['firstname', 'company'],
        created_at: new Date().toISOString(),
        body_html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <p>Hi {{firstname}},</p>
  <p>Following up on my previous message regarding {{company}}.</p>
  <p>Let me know if you would be open for a quick 10 minute discussion this week!</p>
</div>`,
      },
    ];
    setTemplates(seed);
  }, []);

  const handleCreateNew = () => {
    setActiveTemplate(null);
    setName('New Custom Template');
    setSubject('Special Update for {{company}}');
    setCategory('General');
    setBodyHtml(`<div><p>Hi {{firstname}},</p><p>Write your template content here...</p></div>`);
    setIsEditing(true);
  };

  const handleEditTemplate = (tpl: EmailTemplate) => {
    setActiveTemplate(tpl);
    setName(tpl.name);
    setSubject(tpl.subject);
    setCategory(tpl.category);
    setBodyHtml(tpl.body_html);
    setIsEditing(true);
  };

  const handleDuplicate = (tpl: EmailTemplate) => {
    const dup: EmailTemplate = {
      ...tpl,
      id: `tpl-${Date.now()}`,
      name: `${tpl.name} (Copy)`,
      created_at: new Date().toISOString(),
    };
    setTemplates([dup, ...templates]);
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
  };

  const handleSave = () => {
    if (activeTemplate) {
      setTemplates(
        templates.map((t) =>
          t.id === activeTemplate.id
            ? { ...t, name, subject, category, body_html: bodyHtml }
            : t
        )
      );
    } else {
      const created: EmailTemplate = {
        id: `tpl-${Date.now()}`,
        name,
        subject,
        body_html: bodyHtml,
        category,
        variables: ['firstname', 'lastname', 'company', 'email'],
        created_at: new Date().toISOString(),
      };
      setTemplates([created, ...templates]);
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="pl-0 md:pl-64 transition-all">
        <Navbar />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <FileCode className="h-6 w-6 text-purple-500" /> Template Library
              </h1>
              <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Design, duplicate, and save HTML email templates with dynamic tags
              </p>
            </div>

            <button
              onClick={handleCreateNew}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Create Template
            </button>
          </div>

          {isEditing ? (
            <GlassCard className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {activeTemplate ? 'Edit Template' : 'Create New Template'}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 sm:flex-none rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 sm:flex-none rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
                  >
                    Save Template
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <EmailEditor
                subject={subject}
                bodyHtml={bodyHtml}
                onSubjectChange={setSubject}
                onBodyHtmlChange={setBodyHtml}
              />
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => (
                <GlassCard key={tpl.id} className="flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <Badge variant="purple">{tpl.category}</Badge>
                      <span className="text-[11px] text-zinc-400 font-mono">4 Tags</span>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-white">{tpl.name}</h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Subject: &quot;{tpl.subject}&quot;
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-[11px] text-zinc-600 line-clamp-3 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                    {tpl.body_html.replace(/<[^>]*>?/gm, '')}
                  </div>

                    <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPreviewingTemplate(tpl)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          <Eye className="h-3.5 w-3.5" /> Preview
                        </button>
                        <button
                          onClick={() => handleEditTemplate(tpl)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicate(tpl)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Duplicate Template"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10"
                          title="Delete Template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

            {/* Template Live Preview Modal */}
            {previewingTemplate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-purple-400">Template Preview</span>
                      <h3 className="text-base font-bold text-white">{previewingTemplate.name}</h3>
                      <p className="text-xs text-zinc-400">Subject: {previewingTemplate.subject}</p>
                    </div>
                    <button
                      onClick={() => setPreviewingTemplate(null)}
                      className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Rendered Canvas */}
                  <div className="p-4 sm:p-6 overflow-y-auto bg-zinc-100 dark:bg-zinc-950 flex justify-center">
                    <div className="w-full max-w-[600px] rounded-2xl bg-white text-zinc-900 shadow-xl overflow-hidden border border-zinc-200">
                      <div className="p-4 sm:p-6" dangerouslySetInnerHTML={{
                        __html: previewingTemplate.body_html
                          .replace(/\{\{firstname\}\}/gi, 'John')
                          .replace(/\{\{lastname\}\}/gi, 'Doe')
                          .replace(/\{\{company\}\}/gi, 'TechCorp Inc')
                          .replace(/\{\{email\}\}/gi, 'john.doe@techcorp.com')
                          .replace(/\{\{phone\}\}/gi, '+1-555-0192')
                      }} />
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Personalized sample variables applied (John @ TechCorp)</span>
                    <button
                      onClick={() => {
                        const target = previewingTemplate;
                        setPreviewingTemplate(null);
                        handleEditTemplate(target);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Open in Editor
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
