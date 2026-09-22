import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Zap, ShieldCheck, Users, Globe, Cpu, ArrowRight, Layers, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | Automailer Bulk Email Outreach Platform',
  description: 'Learn about Automailer cloud platform architecture, multi-sender rotation technology, and commitment to primary inbox deliverability.',
  openGraph: {
    title: 'About Automailer | High-Deliverability Outreach SaaS',
    description: 'Learn about Automailer cloud platform architecture and multi-sender rotation technology.',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <div>
        {/* Header Navigation */}
        <Header />

        {/* Dark Hero Banner */}
        <section className="bg-zinc-950 text-white py-16 sm:py-24 px-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-600/15 blur-[120px] pointer-events-none rounded-full" />
          <div className="max-w-4xl mx-auto space-y-4 relative z-10">
            <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-3.5 py-1 text-xs font-bold text-blue-400">
              About Automailer Platform
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Engineered for High-Volume Email Deliverability
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
              Automailer was built to empower teams and outreach specialists with cloud-native multi-sender rotation, real-time spam keyword checking, and persistent contact list storage.
            </p>
          </div>
        </section>

        {/* Main Content - White Background */}
        <main className="max-w-5xl mx-auto px-4 py-16 space-y-16">
          {/* Mission & Vision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Our Core Mission</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                Ending Shared IP Spam Penalties
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Traditional autoresponders route all client emails through congested, shared server IP pools. When a single bad sender flags the pool, every marketer on that server suffers from low inbox rates.
              </p>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Automailer changes this by enabling multi-sender account rotation (Gmail App Passwords or custom dedicated SMTP accounts). Volume is dynamically distributed across clean accounts to guarantee primary inbox delivery.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-8 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" /> Platform Principles
              </h3>
              <ul className="space-y-3 text-xs text-zinc-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>100% Cloud SaaS Access:</strong> Log in securely from any device without desktop software installations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Persistent Recipient Data:</strong> CSV uploads and custom contact lists are saved permanently in your private account store.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero-Downtime Infrastructure:</strong> Powered by Next.js edge runtime and isolated Nodemailer outbound workers.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Architecture Pillars */}
          <div className="space-y-8">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">The Technology Behind Automailer</h2>
              <p className="text-xs text-zinc-600">Built from the ground up for privacy, deliverability, and rate control.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-3 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">Round-Robin Rotation</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Cycles outbound dispatches across connected sender accounts to prevent rate limit flags.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-3 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">Real-Time Keyword Analyzer</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Evaluates email subject lines and body copy against high-risk spam filters prior to launch.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-3 shadow-xs">
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">Rate Limiting Control</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Customizable sending speeds (10 to 100 emails/min) matching sending provider guidelines.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Box */}
          <div className="rounded-3xl bg-zinc-950 text-white p-8 sm:p-10 text-center space-y-4 shadow-xl">
            <h3 className="text-2xl font-bold tracking-tight">Experience Cloud Email Outreach</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Start configuring your multi-sender pool and launching high-inbox campaigns today.
            </p>
            <div className="pt-2">
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg hover:bg-blue-700 transition-all">
                <span>View Plans & Pricing</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
