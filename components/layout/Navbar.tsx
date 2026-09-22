'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Sparkles, Send } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 md:px-8 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/80 mt-14 md:mt-0">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          ● Gmail SMTP & Resend Active
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>New Campaign</span>
        </Link>
      </div>
    </header>
  );
}
