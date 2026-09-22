'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Zap, ArrowRight, AlertTriangle } from 'lucide-react';
import { UserProfile } from '@/types';
import { getUserLimits } from '@/lib/plan-limits';

interface PlanLimitBannerProps {
  profile?: Partial<UserProfile>;
  showProgressBar?: boolean;
}

export function PlanLimitBanner({ profile, showProgressBar = true }: PlanLimitBannerProps) {
  const limits = getUserLimits(profile);
  const planTier = profile?.plan || 'demo';
  const sentThisMonth = profile?.emails_sent_this_month || 0;
  const monthlyLimit = limits.monthlyEmails;

  const isDemo = planTier === 'demo';
  const usagePercentage = Math.min(100, Math.round((sentThisMonth / monthlyLimit) * 100));
  const isNearLimit = usagePercentage >= 80;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 shadow-lg backdrop-blur-md space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-blue-400">
            {isDemo ? <Sparkles className="h-5 w-5 text-emerald-400" /> : <Zap className="h-5 w-5 text-blue-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">Current Plan:</h4>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border ${limits.badgeColor}`}>
                {limits.name}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {`${sentThisMonth.toLocaleString()} / ${monthlyLimit.toLocaleString()} monthly emails used.`}
            </p>
          </div>
        </div>

        {(isDemo || isNearLimit) && (
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
          >
            <span>{isDemo ? 'Upgrade Full Access' : 'Upgrade Plan'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {showProgressBar && !isDemo && (
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
            <span>Monthly Usage Cap</span>
            <span className={usagePercentage >= 90 ? 'text-amber-400 font-bold' : 'text-zinc-300'}>
              {usagePercentage}% ({sentThisMonth.toLocaleString()} / {monthlyLimit.toLocaleString()})
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                usagePercentage >= 90
                  ? 'bg-amber-500'
                  : usagePercentage >= 75
                  ? 'bg-blue-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>
      )}

      {isDemo && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
          <AlertTriangle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Free Starter Plan active (3,000 contacts & emails capacity). Upgrade to Pro to unlock 50,000 emails & unlimited features!</span>
        </div>
      )}
    </div>
  );
}
