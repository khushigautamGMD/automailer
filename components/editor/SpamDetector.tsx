'use client';

import React from 'react';
import { analyzeSpamKeywords } from '@/lib/spam-detector';
import { ShieldCheck, ShieldAlert, AlertTriangle, Sparkles } from 'lucide-react';

interface SpamDetectorProps {
  subject: string;
  bodyHtml: string;
}

export function SpamDetectorWidget({ subject, bodyHtml }: SpamDetectorProps) {
  const result = analyzeSpamKeywords(subject, bodyHtml);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {result.score >= 90 ? (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          ) : result.score >= 75 ? (
            <ShieldCheck className="h-5 w-5 text-blue-500" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          )}
          <span className="text-xs font-bold text-zinc-900 dark:text-white">
            Primary Inbox Score
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-black ${
              result.score >= 90
                ? 'text-emerald-600 dark:text-emerald-400'
                : result.score >= 75
                ? 'text-blue-600 dark:text-blue-400'
                : result.score >= 55
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {result.score}%
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
              result.score >= 90
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : result.score >= 75
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : result.score >= 55
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            {result.rating}
          </span>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full transition-all duration-300 ${
            result.score >= 90
              ? 'bg-emerald-500'
              : result.score >= 75
              ? 'bg-blue-500'
              : result.score >= 55
              ? 'bg-amber-500'
              : 'bg-rose-500'
          }`}
          style={{ width: `${result.score}%` }}
        />
      </div>

      {result.detectedWords.length === 0 ? (
        <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" /> 0 Spam trigger keywords detected. High deliverability guaranteed!
        </p>
      ) : (
        <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> {result.detectedWords.length} Spam keywords detected:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {result.detectedWords.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300"
              >
                <span className="font-bold line-through mr-1">{item.word}</span>
                <span className="font-semibold text-zinc-500">➜ Try: {item.suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
