'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Zap, Mail, MessageSquare, Clock, Send, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, Check } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Technical Question');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const inquiryOptions = [
    { label: 'General Technical Question', value: 'General Technical Question' },
    { label: 'SMTP / Gmail Setup Assistance', value: 'SMTP / Gmail Setup Assistance' },
    { label: 'Billing, Subscriptions & Plans', value: 'Billing, Subscriptions & Plans' },
    { label: 'Feature Request / Feedback', value: 'Feature Request / Feedback' },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    }, 800);
  };

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
              Automailer Customer Support
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Contact Our Technical Team
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto font-medium">
              Have questions about multi-sender configuration, CSV list parsing, or billing? We&apos;re here to assist.
            </p>
          </div>
        </section>

        {/* Main Content Area */}
        <main className="max-w-5xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Left Col: Contact Form */}
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Send Us a Message</h2>
                <p className="text-xs text-zinc-600">Fill out the form below and our team will get back to you within 24 hours.</p>
              </div>

              {submitted ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-emerald-700">Message Received!</h3>
                  <p className="text-xs text-emerald-600 max-w-md mx-auto">
                    Thank you for reaching out. A technical support agent has received your inquiry and will reply to <strong>{email}</strong> shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Custom Premium Dropdown Selector */}
                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Inquiry Type</label>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-900 shadow-sm flex items-center justify-between hover:border-zinc-300 focus:border-blue-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <span>{subject}</span>
                      <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                        {inquiryOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSubject(opt.value);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                              subject === opt.value
                                ? 'bg-blue-50 text-blue-700 font-bold'
                                : 'text-zinc-800 hover:bg-zinc-100 hover:text-zinc-900'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {subject === opt.value && <Check className="h-4 w-4 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Message</label>
                    <textarea
                      rows={5}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can we help you today?"
                      className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? 'Sending Message...' : 'Send Message Now'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Right Col: Info Cards */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" /> Response Timeframe
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Our customer support operates 24/7. Technical queries regarding Gmail App Passwords or SMTP rate limits are addressed within 1–2 hours.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-600" /> Need Instant Answers?
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Check our Frequently Asked Questions section on the home page for quick guides on CSV parsing and sender account rotation.
                </p>
                <Link href="/#faq" className="inline-block text-xs font-bold text-blue-600 hover:underline">
                  View Home FAQ →
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
