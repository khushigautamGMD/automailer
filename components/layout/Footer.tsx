'use client';

import React from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 text-zinc-400 font-sans text-xs">
      {/* Top Footer Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center">
              <img src="/logo.png" alt="Automailer" className="h-14 w-auto object-contain max-h-14" />
            </Link>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
              Automailer is a cloud outreach platform featuring multi-sender pool rotation, real-time deliverability checking, and persistent contact list storage.
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400 pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Cloud Engines Active
              </span>
              <span>•</span>
              <span>256-Bit SSL Encrypted</span>
            </div>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Product</h4>
            <ul className="space-y-2.5 text-zinc-400">
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing & Plans
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Dashboard Demo
                </Link>
              </li>
              <li>
                <Link href="/campaigns/new" className="hover:text-white transition-colors">
                  Campaign Creator
                </Link>
              </li>
              <li>
                <Link href="/templates" className="hover:text-white transition-colors">
                  Email Frameworks
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="hover:text-white transition-colors">
                  CSV List Manager
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Company</h4>
            <ul className="space-y-2.5 text-zinc-400">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Customer Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Legal & Policy</h4>
            <ul className="space-y-2.5 text-zinc-400">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy#anti-spam" className="hover:text-white transition-colors">
                  Anti-Spam Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Footer Bar */}
      <div className="border-t border-zinc-900 bg-zinc-950 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <p>© {new Date().getFullYear()} Automailer. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-zinc-300 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
