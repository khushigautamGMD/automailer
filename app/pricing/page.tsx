'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase/client';
import {
  Zap,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Lock,
  ArrowRight,
  ShieldAlert,
  Check,
  X,
  Mail,
} from 'lucide-react';

import { useRouter, useSearchParams } from 'next/navigation';

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white text-sm font-medium">
          Loading Pricing...
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Checkout Modal State
  const [activePlanKey, setActivePlanKey] = useState<'pro' | 'agency' | 'lifetime' | null>(null);

  const plans = {
    pro: { name: 'Pro Affiliate Plan', price: 499, period: '/ month', desc: 'Ideal for affiliate marketers sending up to 50,000 emails/month' },
    agency: { name: 'Agency Scale Plan', price: 1499, period: '/ month', desc: 'For scaling agencies with unlimited emails & multi-sender pools' },
    lifetime: { name: 'Lifetime Access Pass', price: 2999, period: 'one-time', desc: 'Pay once, get lifetime 100% online cloud access forever' },
  };

  // Check login session & open requested plan modal if returning from login
  useEffect(() => {
    let savedEmail = '';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('automailer_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.isLoggedIn || parsed.email) {
            setIsLoggedIn(true);
            savedEmail = parsed.email || '';
            setUserEmail(savedEmail);
          }
        } catch (e) {}
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setIsLoggedIn(true);
        if (!savedEmail) {
          setUserEmail(session.user.email);
        }
      }
    });

    const targetPlan = searchParams.get('plan') as 'pro' | 'agency' | 'lifetime' | null;
    if (targetPlan && (targetPlan === 'pro' || targetPlan === 'agency' || targetPlan === 'lifetime')) {
      setActivePlanKey(targetPlan);
    }
  }, [searchParams]);

  const handleOpenCheckoutModal = (planKey: 'pro' | 'agency' | 'lifetime') => {
    // Check if user is logged in
    const stored = typeof window !== 'undefined' ? localStorage.getItem('automailer_user') : null;
    const isUserAuth = isLoggedIn || !!stored;

    if (!isUserAuth) {
      // Redirect to login page with redirect URL pointing back to /pricing?plan=planKey
      router.push(`/login?redirect=${encodeURIComponent('/pricing?plan=' + planKey)}`);
      return;
    }

    setActivePlanKey(planKey);
    setErrorMessage('');
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlanKey) return;

    if (!userEmail) {
      setErrorMessage('Please enter your email address to receive account access details.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    const targetPlan = plans[activePlanKey];

    try {
      const res = await fetch('/api/checkout/phonepe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: targetPlan.name,
          amount: targetPlan.price,
          email: userEmail,
          mobile: userPhone || '9999999999',
        }),
      });

      const data = await res.json();

      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data.error || 'Failed to initialize secure checkout');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment checkout error. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project')
      ) {
        const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/pricing' + (activePlanKey ? '?plan=' + activePlanKey : ''))}`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: callbackUrl,
          },
        });
        if (error) throw error;
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-blue-500 selection:text-white relative overflow-hidden flex flex-col justify-between">
      <div>
        {/* Dynamic Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/20 blur-[160px] opacity-70 rounded-full pointer-events-none" />

        {/* Top Header Navigation */}
        <Header />

        {/* Main Pricing Hero */}
        <main className="max-w-6xl mx-auto px-4 py-12 sm:py-16 space-y-12 relative z-10">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-400 shadow-sm">
              <Sparkles className="h-4 w-4 text-blue-400" /> Instant Account Setup & Lifetime Support
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
              Choose Your <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Automailer Plan</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 font-medium max-w-2xl mx-auto">
              100% Web-Based Email Campaign Automation platform for Affiliate Marketers. Scale your outreach with multi-sender rotation & live deliverability scoring.
            </p>
          </div>

          {/* Free Demo Trial Card Banner */}
          <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900/90 to-zinc-900/90 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> Free Account Required To Test Demo
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Try Automailer Demo Risk-Free</h3>
              <p className="text-xs text-zinc-400 max-w-xl">
                Test the live campaign dispatcher, spam score analyzer, and sender pool rotation with 10 test emails per campaign. Free demo access is tied to your account.
              </p>
            </div>
            <Link
              href={isLoggedIn ? "/dashboard" : "/login?redirect=/dashboard"}
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all"
            >
              <span>{isLoggedIn ? "Go to Dashboard (Demo Active)" : "Start Free Test Drive"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-4">
            {/* Plan 1: Pro Affiliate */}
            <div className="rounded-3xl border border-blue-500/40 bg-gradient-to-b from-blue-950/40 via-zinc-900/90 to-zinc-900/90 p-7 flex flex-col justify-between space-y-6 relative overflow-hidden ring-2 ring-blue-500/30 shadow-2xl shadow-blue-500/10 hover:border-blue-400/60 transition-all group">
              <div className="space-y-4">
                <div className="flex items-center justify-between min-h-[26px]">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{plans.pro.name}</h3>
                  <span className="rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-extrabold uppercase text-white tracking-wider shadow-md shadow-blue-500/30 shrink-0">
                    MOST POPULAR
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed min-h-[36px]">{plans.pro.desc}</p>
                
                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">₹{plans.pro.price.toLocaleString()}</span>
                  <span className="text-xs font-bold text-zinc-400">{plans.pro.period}</span>
                </div>

                <ul className="space-y-3 pt-5 border-t border-zinc-800/80 text-xs text-zinc-300 font-medium">
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> Multi-Sender SMTP Rotation Pool (5 Accounts)</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> Live Spam Detector & Inbox Score %</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> 50,000 Emails / Month Limit</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> All Affiliate Email Copy Templates</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> 100% Online Cloud SaaS (No Download)</li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenCheckoutModal('pro')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-blue-500/25 hover:scale-[1.02] hover:shadow-blue-500/40 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Get Pro Access Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Plan 2: Agency Scale */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-7 flex flex-col justify-between space-y-6 hover:border-zinc-700/80 transition-all group">
              <div className="space-y-4">
                <div className="flex items-center justify-between min-h-[26px]">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{plans.agency.name}</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed min-h-[36px]">{plans.agency.desc}</p>

                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">₹{plans.agency.price.toLocaleString()}</span>
                  <span className="text-xs font-bold text-zinc-400">{plans.agency.period}</span>
                </div>

                <ul className="space-y-3 pt-5 border-t border-zinc-800/80 text-xs text-zinc-300 font-medium">
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> Unlimited Sender Accounts</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> Unlimited Bulk Campaigns</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> Custom Domain Tracking</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> Priority 24/7 VIP Support</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-400 shrink-0" /> Dedicated Onboarding Manager</li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenCheckoutModal('agency')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800/90 px-6 py-4 text-sm font-bold text-white hover:bg-zinc-700 hover:border-zinc-600 transition-all cursor-pointer"
              >
                <span>Upgrade to Agency</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Plan 3: Lifetime Pass */}
            <div className="rounded-3xl border border-purple-500/40 bg-gradient-to-b from-purple-950/40 via-zinc-900/90 to-zinc-900/90 p-7 flex flex-col justify-between space-y-6 hover:border-purple-400/60 transition-all group">
              <div className="space-y-4">
                <div className="flex items-center justify-between min-h-[26px]">
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">{plans.lifetime.name}</h3>
                  <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-0.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider shrink-0">
                    BEST VALUE
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed min-h-[36px]">{plans.lifetime.desc}</p>

                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-purple-400">₹{plans.lifetime.price.toLocaleString()}</span>
                  <span className="text-xs font-bold text-zinc-400">{plans.lifetime.period}</span>
                </div>

                <ul className="space-y-3 pt-5 border-t border-zinc-800/80 text-xs text-zinc-300 font-medium">
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Lifetime Cloud SaaS Access</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Zero Monthly Subscriptions</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-purple-400 shrink-0" /> All Future Feature Updates Included</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Dedicated Account Setup Guide</li>
                  <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-purple-400 shrink-0" /> Priority Server Routing</li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenCheckoutModal('lifetime')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-purple-500/25 hover:scale-[1.02] hover:shadow-purple-500/40 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Claim Lifetime Access</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Security & Supported Payment Badges */}
          <div className="pt-8 border-t border-zinc-800/80 text-center space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> 256-Bit SSL Encrypted Checkout
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-blue-400" /> Instant Automatic Access
              </span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-purple-400" /> Supports All UPI Apps, Cards & NetBanking
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* Checkout Modal Popup */}
      {activePlanKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl space-y-5">
            <button
              onClick={() => setActivePlanKey(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Account Activation</span>
              <h3 className="text-xl font-bold text-white">{plans[activePlanKey].name}</h3>
              <p className="text-xs text-zinc-400">Total: <strong className="text-white">₹{plans[activePlanKey].price}</strong> {plans[activePlanKey].period}</p>
            </div>

            {/* Social Logins */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all cursor-pointer shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-zinc-900 px-2 text-zinc-500 font-bold">Or enter details</span></div>
            </div>

            <form onSubmit={handleCheckout} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Email Address <span className="text-rose-400">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-medium text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Phone Number <span className="text-zinc-500 font-normal">(For order receipt)</span></label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-medium text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                <span>{isProcessing ? 'Connecting to Payment Gateway...' : 'Proceed to Secure Payment'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
