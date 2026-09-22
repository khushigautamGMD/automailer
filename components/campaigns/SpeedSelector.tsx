'use client';

import React from 'react';
import { SpeedPreset } from '@/types';
import { cn } from '@/lib/utils';
import { Gauge, Zap, Turtle, Shield, Rocket } from 'lucide-react';

interface SpeedSelectorProps {
  selectedPreset: SpeedPreset;
  customSpeed: number;
  onPresetChange: (preset: SpeedPreset) => void;
  onCustomSpeedChange: (speed: number) => void;
}

const presets: { id: SpeedPreset; name: string; speed: string; desc: string; icon: any; color: string }[] = [
  { id: 'very_slow', name: 'Very Slow', speed: '10/min', desc: 'Maximum deliverability protection', icon: Turtle, color: 'text-emerald-500' },
  { id: 'slow', name: 'Slow', speed: '25/min', desc: 'Recommended for cold domain warming', icon: Shield, color: 'text-blue-500' },
  { id: 'medium', name: 'Medium', speed: '50/min', desc: 'Standard business bulk speed', icon: Gauge, color: 'text-indigo-500' },
  { id: 'fast', name: 'Fast', speed: '100/min', desc: 'High volume transactional dispatch', icon: Zap, color: 'text-amber-500' },
  { id: 'custom', name: 'Custom Rate', speed: 'User Choice', desc: 'Set custom rate limit per minute', icon: Rocket, color: 'text-purple-500' },
];

export function SpeedSelector({
  selectedPreset,
  customSpeed,
  onPresetChange,
  onCustomSpeedChange,
}: SpeedSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-zinc-900 dark:text-white">
        Sending Speed & Rate Limiting
      </label>
      
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {presets.map((p) => {
          const Icon = p.icon;
          const isSelected = selectedPreset === p.id;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={cn(
                'relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200',
                isSelected
                  ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-500/10'
                  : 'border-zinc-200/80 bg-white/50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700'
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Icon className={cn('h-5 w-5', p.color)} />
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {p.speed}
                  </span>
                </div>
                <h4 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">{p.name}</h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-snug">{p.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedPreset === 'custom' && (
        <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <label className="block text-xs font-semibold text-purple-700 dark:text-purple-300">
            Custom Rate (Emails per Minute)
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="500"
              value={customSpeed}
              onChange={(e) => onCustomSpeedChange(parseInt(e.target.value) || 10)}
              className="w-32 rounded-lg border border-purple-300 bg-white px-3 py-2 text-sm font-bold text-zinc-900 shadow-sm focus:border-purple-500 focus:outline-none dark:border-purple-800 dark:bg-zinc-900 dark:text-white"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Interval delay: ~{Math.round((60 * 1000) / (customSpeed || 1))}ms per email dispatch
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
