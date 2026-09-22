'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Menu, X, ArrowRight, UserCheck, LayoutDashboard, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('automailer_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.email) setUserEmail(parsed.email);
        } catch (e) {}
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        // Sync Supabase session to localStorage so all pages see the login
        if (typeof window !== 'undefined') {
          localStorage.setItem('automailer_user', JSON.stringify({
            email: session.user.email,
            isLoggedIn: true,
            loginTime: Date.now(),
          }));
        }
      }
    });
  }, []);

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('automailer_user');
    }
    await supabase.auth.signOut();
    setUserEmail(null);
    window.location.href = '/';
  };

  const navItems = [
    { label: 'Features', href: '/#features' },
    { label: 'About Us', href: '/about' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <img src="/logo.png" alt="Automailer" className="h-14 sm:h-16 w-auto object-contain max-h-16" />
        </Link>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors py-1 ${
                  isActive
                    ? 'text-blue-400 font-bold border-b-2 border-blue-500'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Actions (Desktop) */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {userEmail ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all whitespace-nowrap"
              >
                Log In
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl bg-blue-600 px-4.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all whitespace-nowrap flex items-center gap-1.5"
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex sm:hidden items-center gap-2">
          {userEmail ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300"
            >
              Log In
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-semibold py-1.5 px-2 rounded-lg ${
                  pathname === item.href ? 'bg-blue-600/10 text-blue-400 font-bold' : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
