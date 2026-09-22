'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Send,
  Users,
  FileCode,
  Settings,
  Mail,
  Zap,
  Menu,
  X,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Send },
  { name: 'Contacts & CSV', href: '/contacts', icon: Users },
  { name: 'Templates', href: '/templates', icon: FileCode },
  { name: 'Settings & SMTP', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore if offline
    }
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Top Header Toggle Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-zinc-200 bg-white/90 backdrop-blur-md px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex items-center">
          <img src="/logo.png" alt="Automailer" className="h-11 w-auto object-contain max-h-11" />
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200/80 bg-white/90 backdrop-blur-xl transition-transform duration-300 dark:border-zinc-800/80 dark:bg-zinc-950/90 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 pt-16 md:pt-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="hidden md:flex h-16 items-center px-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <Link href="/dashboard" className="flex items-center">
            <img src="/logo.png" alt="Automailer" className="h-13 w-auto object-contain max-h-13" />
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Info & Logout Action */}
        <div className="p-4 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-3.5 w-3.5" /> High Inbox Engine
            </div>
            <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              Multi-Sender Rotation Active
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2 text-xs font-bold text-zinc-600 shadow-xs hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-rose-400 transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
