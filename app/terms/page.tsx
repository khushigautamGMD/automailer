import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Zap, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Automailer Bulk Email Outreach SaaS',
  description: 'Automailer Terms & Conditions: Account usage rules, rate limiting responsibilities, billing policies, and acceptable use guidelines.',
};

export default function TermsPage() {
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
              User Agreement
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Terms & Conditions
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto font-medium">
              Please read these terms carefully before utilizing Automailer cloud platform services.
            </p>
          </div>
        </section>

        {/* Main Content Area - White Background */}
        <main className="max-w-4xl mx-auto px-4 py-16 space-y-12 text-xs sm:text-sm text-zinc-700 leading-relaxed">
          {/* Section 1: Service Agreement */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> 1. Acceptance of Terms
            </h2>
            <p>
              By accessing or creating an account on Automailer (&quot;Service&quot;), you agree to be bound by these Terms & Conditions. Automailer provides a cloud-based email campaign dispatch interface allowing users to configure SMTP connections and dispatch contact lists.
            </p>
          </section>

          {/* Section 2: Account Responsibilities */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">2. Account Credentials & Outbound Senders</h2>
            <p>
              You are responsible for configuring accurate SMTP server details or Gmail App Passwords inside your account settings. Automailer processes dispatches strictly according to your selected rate limits and sender account settings.
            </p>
          </section>

          {/* Section 3: Acceptable Use Policy */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" /> 3. Acceptable Use & Prohibited Activities
            </h2>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-2">
              <p className="font-bold text-zinc-900">Prohibited Actions:</p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-600">
                <li>Sending illegal malware, scam links, or deceptive phishing emails.</li>
                <li>Purchasing harvested email lists without recipient consent.</li>
                <li>Attempting to bypass platform rate controls or perform unauthorized security probes.</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Subscriptions & Billing */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">4. Subscriptions, Payments & Access</h2>
            <p>
              Automailer plan purchases provide immediate digital access to cloud campaign dispatches and contact list storage features. All fees are processed in INR/USD as indicated on the Pricing page.
            </p>
          </section>

          {/* Section 5: Limitation of Liability */}
          <section className="space-y-3 border-t border-zinc-200 pt-8">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">5. Limitation of Liability</h2>
            <p>
              Automailer provides tools to monitor email deliverability scores and sender rotation. However, inbox delivery rates depend on third-party receiving providers (e.g. Gmail, Yahoo, Outlook) and user-supplied email copy. Automailer is not liable for account suspensions caused by third-party mail providers.
            </p>
          </section>

          <section className="rounded-2xl bg-zinc-950 text-white p-6 space-y-3 text-center">
            <h3 className="text-lg font-bold">Questions About Terms?</h3>
            <p className="text-xs text-zinc-400">
              For billing questions or legal terms clarification, reach out to our team.
            </p>
            <Link href="/contact" className="inline-block text-xs font-bold text-blue-400 hover:underline">
              Contact Support →
            </Link>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}
