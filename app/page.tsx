'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Zap,
  ShieldCheck,
  Users,
  Send,
  Sparkles,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  Lock,
  ArrowRight,
  HelpCircle,
  FileCode,
  Sliders,
  ChevronDown,
  ChevronUp,
  Layers,
  Cpu,
  Check,
  X,
} from 'lucide-react';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does Multi-Sender Pool rotation work?',
      a: 'Automailer allows you to connect multiple Gmail or custom SMTP sender accounts. When sending a campaign, Automailer automatically rotates through your connected senders in a round-robin cycle, keeping individual domain send volume within safe limits and maintaining clean sender reputation.',
    },
    {
      q: 'Do I need any desktop installation or technical setup?',
      a: 'No. Automailer is 100% web-based cloud software. You can log in from any web browser on your phone, tablet, or computer to manage contacts, build email templates, and launch campaigns.',
    },
    {
      q: 'What happens when I upload a CSV file of contacts?',
      a: 'When you upload a CSV or text file, Automailer instantly parses headers (Email, First Name, Company, Phone), validates email syntax, removes duplicates, and saves the recipient list directly to your account storage.',
    },
    {
      q: 'Can I test my email deliverability before dispatching?',
      a: 'Yes. Automailer includes a real-time Spam Keyword Detector that evaluates your subject lines and body copy against high-risk spam triggers, giving you a live Primary Inbox Score % and one-click test send capability.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* SECTION 1: Top Navbar & Hero Header (Dark Slate Contrast) */}
      <div className="bg-zinc-950 text-white relative overflow-hidden">
        {/* Ambient Gradient Glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/10 blur-[130px] opacity-70 pointer-events-none rounded-full" />

        {/* Top Header Navigation */}
        <Header />

        {/* Clean & Simple Hero Section */}
        <section className="relative pt-16 sm:pt-24 pb-20 sm:pb-28 px-4 max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-400">
            <Sparkles className="h-4 w-4 text-blue-400" /> Multi-Sender Email Dispatch Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.12]">
            Send Bulk Email Campaigns{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Straight to Primary Inboxes
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Rotate sender pools, detect spam keywords in real-time, and dispatch recipient CSV lists with cloud deliverability control.
          </p>

          {/* Hero Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all"
            >
              <span>Get Started Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-8 py-3.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all"
            >
              <span>View Dashboard Demo</span>
            </Link>
          </div>
        </section>
      </div>

      {/* SECTION 2: White Background - Detailed Product Features & Capabilities */}
      <section className="py-20 px-4 max-w-7xl mx-auto bg-white space-y-16">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-600 border border-blue-100">
            Enterprise Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
            Built for Reliable, Scalable Email Outreach
          </h2>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Automailer combines sender account rotation, CSV contact list persistence, and real-time deliverability checking into a clean cloud platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs hover:shadow-lg hover:border-blue-200 transition-all">
            <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Multi-Sender Account Rotation</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Connect multiple Gmail or SMTP accounts. Automailer rotates senders automatically per campaign email to distribute volume and maintain clean domain reputation.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs hover:shadow-lg hover:border-blue-200 transition-all">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Live Spam Keyword Analysis</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Scans your subject line and email body in real-time for trigger phrases, calculating an instant Inbox Score % before you send.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs hover:shadow-lg hover:border-blue-200 transition-all">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <FileCode className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Persistent CSV Account Storage</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Upload recipient CSV files or add emails manually. All contact lists are automatically parsed, validated, and saved permanently to your user account.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs hover:shadow-lg hover:border-blue-200 transition-all">
            <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Sliders className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Rate-Controlled Dispatch</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Control sending speeds (10, 25, 50, or 100 emails/min) with built-in rate limiting to match your sending provider requirements.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs hover:shadow-lg hover:border-blue-200 transition-all">
            <div className="h-11 w-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <BarChart2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Live Campaign Monitoring</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Track campaign status in real time with dispatches, delivery counts, open rates, and logs visible inside your personal dashboard.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs hover:shadow-lg hover:border-blue-200 transition-all">
            <div className="h-11 w-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900">Personalized Tag Interpolation</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Seamlessly personalize subject lines and HTML bodies using tags like <code className="text-blue-600">&#123;&#123;firstname&#125;&#125;</code>, <code className="text-blue-600">&#123;&#123;company&#125;&#125;</code>, and custom fields.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: DARK Background - 3-Step Process */}
      <section className="py-20 px-4 bg-zinc-950 text-white border-y border-zinc-800">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Simple 3-Step Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              How Automailer Works
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Get your campaign ready and sending in under 3 minutes with zero technical hassle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-6 space-y-3 shadow-lg">
              <span className="text-2xl font-black text-blue-400 font-mono">01</span>
              <h3 className="text-base font-bold text-white">Configure Sender Settings</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Add your Gmail App Password or SMTP credentials in Settings to create your active sender pool.
              </p>
            </div>

            <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-6 space-y-3 shadow-lg">
              <span className="text-2xl font-black text-blue-400 font-mono">02</span>
              <h3 className="text-base font-bold text-white">Import CSV Recipients</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Upload your contact list or paste email addresses. Your contacts are saved safely to your account.
              </p>
            </div>

            <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-6 space-y-3 shadow-lg">
              <span className="text-2xl font-black text-blue-400 font-mono">03</span>
              <h3 className="text-base font-bold text-white">Launch & Monitor</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Set dispatch speed and click launch. Watch live progress and deliverability metrics directly in your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: White Background - Comparison Table */}
      <section className="py-20 px-4 max-w-6xl mx-auto bg-white space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
            Why Teams Choose Automailer
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-xl mx-auto">
            A purpose-built solution designed for flexibility, deliverability, and full data control.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="border-b border-zinc-200 bg-zinc-50 font-bold text-zinc-700 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Capability</th>
                <th className="py-4 px-6 text-zinc-500">Generic Email Tools</th>
                <th className="py-4 px-6 text-blue-600 font-extrabold">Automailer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              <tr>
                <td className="py-4 px-6 font-bold text-zinc-900">Multi-Sender Pool Rotation</td>
                <td className="py-4 px-6 text-zinc-400">Single sender domain only</td>
                <td className="py-4 px-6 text-emerald-600 font-bold flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" /> Multi-SMTP Round Robin Rotation
                </td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-zinc-900">CSV Contact Persistence</td>
                <td className="py-4 px-6 text-zinc-400">Session transient or strict list limits</td>
                <td className="py-4 px-6 text-emerald-600 font-bold flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" /> Permanent Account CSV Storage
                </td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-zinc-900">Live Spam Risk Analysis</td>
                <td className="py-4 px-6 text-zinc-400">None or external paid add-ons</td>
                <td className="py-4 px-6 text-emerald-600 font-bold flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" /> Built-In Real-Time Spam Score
                </td>
              </tr>
              <tr>
                <td className="py-4 px-6 font-bold text-zinc-900">Rate Limiting Control</td>
                <td className="py-4 px-6 text-zinc-400">Fixed rate limits</td>
                <td className="py-4 px-6 text-emerald-600 font-bold flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" /> Customizable Speed (10–100/min)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 5: DARK Background - Frequently Asked Questions */}
      <section className="py-20 px-4 bg-zinc-950 text-white border-t border-zinc-800">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs sm:text-sm text-zinc-400">Everything you need to know about Automailer.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-lg">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between gap-4"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="h-4 w-4 text-blue-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />}
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: High-Contrast Premium CTA Banner */}
      <section className="py-20 px-4 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-zinc-950 text-white p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-2xl mx-auto">
            Ready to Streamline Your Email Outreach?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            Access your clean, professional email outreach platform now.
          </p>

          <div className="pt-2">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all"
            >
              <span>Explore Plans & Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Comprehensive Footer */}
      <Footer />
    </div>
  );
}
