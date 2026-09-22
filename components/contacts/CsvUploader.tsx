'use client';

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, FileText, UserPlus, Trash2, Plus } from 'lucide-react';
import { parseAndValidateCsv } from '@/lib/csv-parser';
import { CsvValidationResult, ParsedCsvRow } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface CsvUploaderProps {
  onValidationComplete: (result: CsvValidationResult, listName: string) => void;
}

export function CsvUploader({ onValidationComplete }: CsvUploaderProps) {
  const [listName, setListName] = useState('Imported Contact List');
  const [result, setResult] = useState<CsvValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'paste' | 'manual'>('file');
  const [pasteContent, setPasteContent] = useState('');

  // Accumulated Manual Contacts list state
  const [accumulatedContacts, setAccumulatedContacts] = useState<ParsedCsvRow[]>([]);

  // Manual Single Email Form state
  const [manualEmail, setManualEmail] = useState('');
  const [manualFirstName, setManualFirstName] = useState('');
  const [manualLastName, setManualLastName] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // Bulk Multiple Email Textarea state
  const [bulkEmailsText, setBulkEmailsText] = useState('');

  const [importFeedback, setImportFeedback] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  const updateAndNotify = (validRows: ParsedCsvRow[]) => {
    // Deduplicate accumulated contacts by email
    const emailMap = new Map<string, ParsedCsvRow>();
    validRows.forEach((r) => {
      if (r.email && r.email.includes('@')) {
        emailMap.set(r.email.toLowerCase().trim(), r);
      }
    });

    const uniqueValid = Array.from(emailMap.values());
    setAccumulatedContacts(uniqueValid);

    const valResult: CsvValidationResult = {
      valid: uniqueValid,
      duplicates: [],
      invalid: [],
      headers: ['email', 'firstname', 'lastname', 'company', 'phone'],
      totalParsed: uniqueValid.length,
    };

    setResult(valResult);
    onValidationComplete(valResult, listName);
  };

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const processSelectedFile = (file: File) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      setImportFeedback({
        message: `Excel binary spreadsheet "${file.name}" detected. Please save your Excel sheet as "CSV (Comma delimited) (*.csv)" or copy and paste the rows into the "Paste Raw CSV" tab.`,
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      const res = parseAndValidateCsv(text);
      setLoading(false);

      if (res.valid.length > 0) {
        setImportFeedback({
          message: `Successfully imported ${res.valid.length} valid email(s) from "${file.name}".${
            res.duplicates.length > 0 ? ` (${res.duplicates.length} duplicate(s) removed)` : ''
          }${res.invalid.length > 0 ? ` (${res.invalid.length} invalid line(s) skipped)` : ''}`,
          type: 'success',
        });
      } else {
        setImportFeedback({
          message: `No valid email addresses found in "${file.name}". Total rows parsed: ${res.totalParsed}. Please check header names or format.`,
          type: 'error',
        });
      }

      updateAndNotify([...accumulatedContacts, ...res.valid]);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handlePasteProcess = () => {
    if (!pasteContent.trim()) return;
    setLoading(true);
    const res = parseAndValidateCsv(pasteContent);
    setLoading(false);

    if (res.valid.length > 0) {
      setImportFeedback({
        message: `Successfully parsed ${res.valid.length} valid email address(es).${
          res.duplicates.length > 0 ? ` (${res.duplicates.length} duplicate(s) removed)` : ''
        }${res.invalid.length > 0 ? ` (${res.invalid.length} invalid line(s) skipped)` : ''}`,
        type: 'success',
      });
    } else {
      setImportFeedback({
        message: `No valid email addresses found in pasted text. Total parsed: ${res.totalParsed}.`,
        type: 'error',
      });
    }

    updateAndNotify([...accumulatedContacts, ...res.valid]);
    setPasteContent('');
  };

  const handleManualAddProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) return;

    const newContact: ParsedCsvRow = {
      email: manualEmail.trim(),
      firstname: manualFirstName.trim(),
      lastname: manualLastName.trim(),
      company: manualCompany.trim(),
      phone: manualPhone.trim(),
    };

    updateAndNotify([...accumulatedContacts, newContact]);

    // Clear single form inputs
    setManualEmail('');
    setManualFirstName('');
    setManualLastName('');
    setManualCompany('');
    setManualPhone('');
  };

  const handleBulkAddEmails = () => {
    if (!bulkEmailsText.trim()) return;
    
    // Split by commas, newlines, or spaces
    const rawTokens = bulkEmailsText.split(/[\n,\s]+/);
    const newRows: ParsedCsvRow[] = [];

    rawTokens.forEach((token) => {
      const clean = token.trim();
      if (clean && clean.includes('@')) {
        newRows.push({
          email: clean,
          firstname: '',
          lastname: '',
          company: '',
          phone: '',
        });
      }
    });

    if (newRows.length > 0) {
      updateAndNotify([...accumulatedContacts, ...newRows]);
      setBulkEmailsText('');
    }
  };

  const handleRemoveContact = (emailToRemove: string) => {
    const filtered = accumulatedContacts.filter((c) => c.email.toLowerCase() !== emailToRemove.toLowerCase());
    updateAndNotify(filtered);
  };

  const loadSampleCsv = () => {
    const sample = `email,firstname,lastname,company,phone
john.doe@techcorp.com,John,Doe,TechCorp,+1-555-0192
mary.smith@innovate.io,Mary,Smith,Innovate.io,+1-555-0143
alex.jones@globalnet.com,Alex,Jones,GlobalNet,+1-555-0188
sarah.connor@cyberdyne.org,Sarah,Connor,Cyberdyne,+1-555-0176
bruce.wayne@wayneent.com,Bruce,Wayne,Wayne Enterprises,+1-555-0199
diana.prince@themyscira.gov,Diana,Prince,Themyscira Ltd,+1-555-0122
clark.kent@dailyplanet.com,Clark,Kent,Daily Planet,+1-555-0155
peter.parker@dailybugle.com,Peter,Parker,Daily Bugle,+1-555-0133`;
    const res = parseAndValidateCsv(sample);
    updateAndNotify(res.valid);
  };

  return (
    <div className="space-y-6">
      {/* List Name & Tab Selection */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            List Name
          </label>
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="e.g. Q3 Outreach List"
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
        </div>

        <div className="flex items-end gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === 'manual'
                ? 'bg-blue-600 text-white shadow-md'
                : 'border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
            }`}
          >
            + Add Multiple Mails
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === 'paste'
                ? 'bg-blue-600 text-white shadow-md'
                : 'border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
            }`}
          >
            Paste Raw CSV
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === 'file'
                ? 'bg-blue-600 text-white shadow-md'
                : 'border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
            }`}
          >
            Upload File
          </button>
        </div>
      </div>

      {/* Import Feedback Banner */}
      {importFeedback && (
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between gap-3 text-xs font-semibold ${
            importFeedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : importFeedback.type === 'error'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {importFeedback.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
            )}
            <span>{importFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportFeedback(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="space-y-4">
          {/* Section 1: Single Email Add Form */}
          <form onSubmit={handleManualAddProcess} className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-500" /> Add Individual Recipient Email
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-extrabold">
                {accumulatedContacts.length} Mails Added So Far
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="e.g. client@example.com"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  First Name
                </label>
                <input
                  type="text"
                  value={manualFirstName}
                  onChange={(e) => setManualFirstName(e.target.value)}
                  placeholder="e.g. John"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Company Name
                </label>
                <input
                  type="text"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Add This Email
              </button>
            </div>
          </form>

          {/* Section 2: Quick Bulk Paste Email Addresses */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Or Paste Multiple Email Addresses At Once (Separated by commas or newlines):
            </label>
            <textarea
              rows={3}
              value={bulkEmailsText}
              onChange={(e) => setBulkEmailsText(e.target.value)}
              placeholder="gaurav7504@gmail.com, thedarkarchive654@gmail.com, client3@company.com"
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleBulkAddEmails}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
              >
                + Add All Copied Emails
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'file' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 scale-[1.01]'
              : 'border-zinc-300 bg-zinc-50/50 hover:border-blue-400 dark:border-zinc-800 dark:bg-zinc-900/30'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <Upload className="h-6 w-6" />
          </div>
          <h4 className="mt-4 text-sm font-bold text-zinc-900 dark:text-white">
            Drag & Drop CSV File Here
          </h4>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Supports <code className="text-blue-600 font-mono">.csv, .txt, .tsv</code> files containing columns like <code className="text-blue-600 font-mono">Customer Email, Email, First Name, Company</code>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,.xlsx,.xls,.CSV,.TXT,.TSV"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4" /> Browse CSV File
            </button>

            <button
              type="button"
              onClick={loadSampleCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 shadow-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <FileText className="h-4 w-4 text-blue-500" /> Load Sample Data
            </button>
          </div>
        </div>
      )}

      {activeTab === 'paste' && (
        <div className="space-y-3">
          <textarea
            rows={5}
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder="email,firstname,lastname,company&#10;john@example.com,John,Doe,ABC Inc"
            className="w-full rounded-xl border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
          <div className="flex justify-between">
            <button
              type="button"
              onClick={loadSampleCsv}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              <FileText className="h-3.5 w-3.5" /> Insert Sample CSV
            </button>
            <button
              type="button"
              onClick={handlePasteProcess}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700"
            >
              Parse CSV Text
            </button>
          </div>
        </div>
      )}

      {/* Accumulated Recipients List Table */}
      {accumulatedContacts.length > 0 && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Active Campaign Recipients ({accumulatedContacts.length} Total Emails)
            </h4>
            <Badge variant="green">{accumulatedContacts.length} Emails Ready</Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100/80 font-bold text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Recipient Email</th>
                  <th className="px-3 py-2">First Name</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {accumulatedContacts.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                    <td className="px-3 py-2 text-zinc-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-zinc-900 dark:text-white">{row.email}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{row.firstname || '-'}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{row.company || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(row.email)}
                        className="text-rose-500 hover:text-rose-600 p-1"
                        title="Remove email"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
