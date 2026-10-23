'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { CsvUploader } from '@/components/contacts/CsvUploader';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { ContactList, Contact, CsvValidationResult } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { Users, Upload, Search, Plus, UserPlus, FileSpreadsheet, X, Trash2, AlertCircle } from 'lucide-react';

export default function ContactsPage() {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showImporter, setShowImporter] = useState<boolean>(false);
  const [showSingleMailModal, setShowSingleMailModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Single Mail Modal State
  const [singleEmail, setSingleEmail] = useState('');
  const [singleFirstName, setSingleFirstName] = useState('');
  const [singleLastName, setSingleLastName] = useState('');
  const [singleCompany, setSingleCompany] = useState('');
  const [singlePhone, setSinglePhone] = useState('');

  const updateLocalStorageCache = (userEmail: string | null, newLists: ContactList[], newContacts: Contact[]) => {
    if (typeof window === 'undefined') return;
    try {
      const listsStr = JSON.stringify(newLists);
      const contactsStr = JSON.stringify(newContacts);
      if (userEmail) {
        localStorage.setItem(`automailer_lists_${userEmail}`, listsStr);
        localStorage.setItem(`automailer_contacts_${userEmail}`, contactsStr);
      }
      localStorage.setItem('automailer_lists', listsStr);
      localStorage.setItem('automailer_contacts', contactsStr);
    } catch (e) {}
  };

  const fetchContactsData = async (userEmailOverride?: string | null) => {
    const emailToUse = (userEmailOverride !== undefined ? userEmailOverride : currentUserEmail)?.trim().toLowerCase() || '';

    // 1. Immediately read from localStorage cache for instant display
    let cachedLists: ContactList[] = [];
    let cachedContacts: Contact[] = [];
    if (typeof window !== 'undefined') {
      try {
        const specificListsRaw = emailToUse ? localStorage.getItem(`automailer_lists_${emailToUse}`) : null;
        const globalListsRaw = localStorage.getItem('automailer_lists');
        const listsRaw = specificListsRaw || globalListsRaw;
        if (listsRaw) {
          cachedLists = JSON.parse(listsRaw);
          if (Array.isArray(cachedLists) && cachedLists.length > 0) setLists(cachedLists);
        }

        const specificContactsRaw = emailToUse ? localStorage.getItem(`automailer_contacts_${emailToUse}`) : null;
        const globalContactsRaw = localStorage.getItem('automailer_contacts');
        const contactsRaw = specificContactsRaw || globalContactsRaw;
        if (contactsRaw) {
          cachedContacts = JSON.parse(contactsRaw);
          if (Array.isArray(cachedContacts) && cachedContacts.length > 0) setContacts(cachedContacts);
        }
      } catch (e) {}
    }

    try {
      setLoading(cachedContacts.length === 0);
      const url = '/api/contacts' + (emailToUse ? `?userEmail=${encodeURIComponent(emailToUse)}` : '');
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        const serverLists: ContactList[] = data.lists || [];
        const serverContacts: Contact[] = data.contacts || [];

        if (serverLists.length > 0 || serverContacts.length > 0) {
          setLists(serverLists);
          setContacts(serverContacts);
          updateLocalStorageCache(emailToUse, serverLists, serverContacts);
        } else if (cachedContacts.length > 0) {
          // If server was cold/empty but client had cached contacts, auto-sync cache to server!
          fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'sync_cache',
              userEmail: emailToUse,
              lists: cachedLists,
              contacts: cachedContacts,
            }),
          });
        }
      }
    } catch (err) {
      console.error('Failed to load contacts data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let resolvedEmail: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('automailer_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.email) resolvedEmail = parsed.email.trim().toLowerCase();
        }
      } catch (e) {}
    }

    if (resolvedEmail) {
      setCurrentUserEmail(resolvedEmail);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionEmail = session?.user?.email?.trim().toLowerCase();
      if (sessionEmail && sessionEmail !== resolvedEmail) {
        resolvedEmail = sessionEmail;
        setCurrentUserEmail(sessionEmail);
        fetchContactsData(sessionEmail);
      }
    });

    fetchContactsData(resolvedEmail);
  }, []);

  const handleValidationComplete = async (res: CsvValidationResult, listName: string) => {
    if (res.valid.length === 0) return;

    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: (() => {
          const fd = new FormData();
          fd.append('listName', listName || 'Imported Contact List');
          if (currentUserEmail) fd.append('userEmail', currentUserEmail);
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

      if (uploadRes.ok) {
        await fetchContactsData();
        setShowImporter(false);
      }
    } catch (err) {
      console.error('Failed to save imported CSV contacts:', err);
    }
  };

  const handleAddSingleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEmail.trim()) return;

    try {
      const targetListId = selectedListId === 'all' ? (lists[0]?.id || undefined) : selectedListId;

      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_contact',
          userEmail: currentUserEmail,
          listId: targetListId,
          email: singleEmail.trim(),
          firstName: singleFirstName.trim() || undefined,
          lastName: singleLastName.trim() || undefined,
          company: singleCompany.trim() || undefined,
          phone: singlePhone.trim() || undefined,
        }),
      });

      if (res.ok) {
        await fetchContactsData();
        setShowSingleMailModal(false);

        // Reset inputs
        setSingleEmail('');
        setSingleFirstName('');
        setSingleLastName('');
        setSingleCompany('');
        setSinglePhone('');
      }
    } catch (err) {
      console.error('Failed to add contact:', err);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const url = `/api/contacts?contactId=${contactId}` + (currentUserEmail ? `&userEmail=${encodeURIComponent(currentUserEmail)}` : '');
      const res = await fetch(url, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updated = contacts.filter((c) => c.id !== contactId);
        setContacts(updated);
        updateLocalStorageCache(currentUserEmail, lists, updated);
      }
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list and all its contacts?')) return;
    try {
      const url = `/api/contacts?listId=${listId}` + (currentUserEmail ? `&userEmail=${encodeURIComponent(currentUserEmail)}` : '');
      const res = await fetch(url, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedListId === listId) setSelectedListId('all');
        await fetchContactsData();
      }
    } catch (err) {
      console.error('Failed to delete list:', err);
    }
  };

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  const filteredContacts = contacts.filter((c) => {
    const matchesList = selectedListId === 'all' || c.list_id === selectedListId;
    const matchesQuery =
      !searchQuery ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesList && matchesQuery;
  });

  const totalPages = Math.ceil(filteredContacts.length / pageSize) || 1;
  const paginatedContacts = filteredContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
                <Users className="h-6 w-6 text-blue-500" /> Contact Lists & Mail Importer
              </h1>
              <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Store and manage up to 3,000 recipient emails • Upload CSV files or add individual mails
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowSingleMailModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:scale-[1.02]"
              >
                <UserPlus className="h-4 w-4" /> + Add Mail Manually
              </button>

              <button
                onClick={() => setShowImporter(!showImporter)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
              >
                <Upload className="h-4 w-4" /> {showImporter ? 'Close Importer' : 'Import CSV File'}
              </button>
            </div>
          </div>

          {/* Cloud Storage Status Banner */}
          {currentUserEmail ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>Cloud Storage Active:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{currentUserEmail}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Your contact lists are permanently preserved in your cloud database and will never be removed after logout or device change.
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-xl bg-blue-600/20 px-3 py-1 text-[11px] font-extrabold text-blue-600 dark:text-blue-300">
                ☁️ Permanent Cloud Storage
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <strong className="text-zinc-900 dark:text-white">Local Device Mode (Guest)</strong>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    You are not logged in. Contacts are stored only in this browser session. Sign in to permanently save your contacts to the cloud.
                  </p>
                </div>
              </div>
              <Link
                href="/login?redirect=/contacts"
                className="inline-flex items-center gap-1.5 shrink-0 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
              >
                Sign In to Save in Cloud →
              </Link>
            </div>
          )}

          {/* Collapsible Importer */}
          {showImporter && (
            <GlassCard className="border-blue-500/30">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-200 pb-3 dark:border-zinc-800 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-500" /> CSV Upload & Manual Entry Engine
              </h3>
              <div className="mt-4">
                <CsvUploader onValidationComplete={handleValidationComplete} />
              </div>
            </GlassCard>
          )}

          {/* Single Contact Modal */}
          {showSingleMailModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-emerald-400" /> Add Individual Mail
                  </h3>
                  <button
                    onClick={() => setShowSingleMailModal(false)}
                    className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleAddSingleContactSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={singleEmail}
                      onChange={(e) => setSingleEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300">First Name</label>
                      <input
                        type="text"
                        value={singleFirstName}
                        onChange={(e) => setSingleFirstName(e.target.value)}
                        placeholder="John"
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300">Last Name</label>
                      <input
                        type="text"
                        value={singleLastName}
                        onChange={(e) => setSingleLastName(e.target.value)}
                        placeholder="Doe"
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300">Company</label>
                      <input
                        type="text"
                        value={singleCompany}
                        onChange={(e) => setSingleCompany(e.target.value)}
                        placeholder="Acme Corp"
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300">Phone</label>
                      <input
                        type="text"
                        value={singlePhone}
                        onChange={(e) => setSinglePhone(e.target.value)}
                        placeholder="+1-555-0192"
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowSingleMailModal(false)}
                      className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                    >
                      Save Contact
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Search & List Filter Bar */}
          <GlassCard hoverEffect={false} className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto whitespace-nowrap pb-1 md:pb-0">
              <button
                onClick={() => setSelectedListId('all')}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                  selectedListId === 'all'
                    ? 'bg-blue-600 text-white shadow'
                    : 'border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
                }`}
              >
                All Contacts ({contacts.length})
              </button>
              {lists.map((l) => (
                <div key={l.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setSelectedListId(l.id)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      selectedListId === l.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
                    }`}
                  >
                    {l.name} ({l.total_contacts || 0})
                  </button>
                  <button
                    onClick={() => handleDeleteList(l.id)}
                    className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                    title="Delete list"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search email, name, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 pl-9 text-xs text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            </div>
          </GlassCard>

          {/* Contact Table / Empty State */}
          <GlassCard hoverEffect={false}>
            {loading ? (
              <div className="py-12 text-center text-xs font-bold text-zinc-400">Loading contacts...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-500/10">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">No contacts saved yet</h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                    Upload your recipient CSV file or add individual emails to save them directly to your account storage.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowImporter(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-700"
                  >
                    <Upload className="h-4 w-4" /> Import CSV File
                  </button>
                  <button
                    onClick={() => setShowSingleMailModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    <UserPlus className="h-4 w-4" /> Add Mail Manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-200 font-bold text-zinc-500 dark:border-zinc-800 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3">#</th>
                        <th className="py-3 px-3">Email Address</th>
                        <th className="py-3 px-3">First Name</th>
                        <th className="py-3 px-3">Last Name</th>
                        <th className="py-3 px-3">Company</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Added Date</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                      {paginatedContacts.map((c, index) => (
                        <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                          <td className="py-3 px-3 text-zinc-400 font-mono">{(currentPage - 1) * pageSize + index + 1}</td>
                          <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">{c.email}</td>
                          <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">{c.first_name || '-'}</td>
                          <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">{c.last_name || '-'}</td>
                          <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">{c.company || '-'}</td>
                          <td className="py-3 px-3"><Badge variant="green">Active</Badge></td>
                          <td className="py-3 px-3 text-zinc-500 font-mono">{formatDate(c.created_at)}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleDeleteContact(c.id)}
                              className="text-zinc-400 hover:text-rose-500 p-1"
                              title="Delete Contact"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 font-medium">
                  <div>
                    Showing <strong className="text-zinc-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</strong> - <strong className="text-zinc-900 dark:text-white">{Math.min(currentPage * pageSize, filteredContacts.length)}</strong> of <strong className="text-blue-500 font-bold">{filteredContacts.length.toLocaleString()}</strong> stored emails
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-bold text-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Prev
                      </button>
                      <span className="px-2 font-bold text-zinc-900 dark:text-white">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-bold text-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </GlassCard>
        </main>
      </div>
    </div>
  );
}

