import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Zap, ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy & Anti-Spam Policy | Automailer',
  description: 'Automailer Privacy Policy: Learn how we protect recipient data, encrypt contact storage, and enforce strict anti-spam compliance standards.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <div>
        {/* Header Navigation */}
        <Header />

        {/* Dark Hero Banner */}
        <section className="bg-zinc-950 text-white py-16 sm:py-20 px-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-blue-600/15 blur-[120px] pointer-events-none rounded-full" />
          <div className="max-w-3xl mx-auto space-y-3 relative z-10">
            <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-3.5 py-1 text-xs font-bold text-blue-400">
              Legal & Compliance
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Privacy Policy & Data Security
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto font-medium">
              Last updated: August 2026. Automailer is committed to protecting user privacy, contact encryption, and anti-spam standards.
            </p>
          </div>
        </section>

        {/* Main Content Area - White Background */}
        <main className="max-w-4xl mx-auto px-4 py-16 space-y-12 text-xs sm:text-sm text-zinc-700 leading-relaxed">
          {/* Section 1: Overview */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" /> 1. Information We Collect
            </h2>
            <p>
              When you create an account or use Automailer SaaS services, we collect minimal operational information required to provide multi-sender email dispatch features:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-600">
              <li><strong>Account Credentials:</strong> Email address and encrypted password via Supabase Auth.</li>
              <li><strong>Outbound Sender Configurations:</strong> User-provided Gmail App Passwords and custom SMTP credentials saved to your private profile store.</li>
              <li><strong>Recipient CSV Contact Lists:</strong> Recipient email addresses and personalization tags uploaded by you into your account storage.</li>
            </ul>
          </section>

          {/* Section 2: Data Encryption & Protection */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" /> 2. Data Protection & Non-Disclosure Guarantee
            </h2>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-2">
              <p className="font-bold text-zinc-900">🔒 We NEVER sell, share, or monetize your contact lists.</p>
              <p className="text-zinc-600">
                All CSV files, contact lists, and email campaign logs uploaded to your Automailer account remain strictly your private property. Our system architecture isolates recipient data per account.
              </p>
            </div>
          </section>

          {/* Section 3: Anti-Spam Policy */}
          <section id="anti-spam" className="space-y-3 pt-4 border-t border-zinc-200">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> 3. Anti-Spam Policy & CAN-SPAM Compliance
            </h2>
            <p>
              Automailer strictly enforces opt-in email marketing guidelines and compliance with international anti-spam regulations (CAN-SPAM Act, GDPR):
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-600">
              <li>Users must ensure all uploaded email addresses were collected via legitimate opt-in consent.</li>
              <li>Every outbound campaign must contain a valid sender identity and an unsubscribe mechanism.</li>
              <li>Accounts found engaging in illegal phishing, malicious scam campaigns, or unsolicited spam harvesting will be permanently terminated.</li>
            </ul>
          </section>

          {/* Section 4: Cookies & Analytics */}
          <section className="space-y-3 border-t border-zinc-200 pt-8">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">4. Cookies & Local Storage</h2>
            <p>
              Automailer uses essential browser local storage and authentication cookies to maintain active user login sessions, remember user interface settings, and persist draft email campaign progress.
            </p>
          </section>

          {/* Section 5: Contact Us Regarding Privacy */}
          <section className="rounded-2xl bg-zinc-950 text-white p-6 space-y-3 text-center">
            <h3 className="text-lg font-bold">Have Privacy Questions?</h3>
            <p className="text-xs text-zinc-400">
              If you have any questions regarding our Privacy Policy or data storage encryption, contact our compliance team.
            </p>
            <Link href="/contact" className="inline-block text-xs font-bold text-blue-400 hover:underline">
              Contact Compliance Team →
            </Link>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}
