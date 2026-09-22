'use client';

import React from 'react';
import { Tag, Sparkles } from 'lucide-react';

interface VariablePickerProps {
  onInsertVariable: (tag: string) => void;
  customVariables?: string[];
}

const defaultVariables = [
  { tag: '{{firstname}}', label: 'First Name' },
  { tag: '{{lastname}}', label: 'Last Name' },
  { tag: '{{company}}', label: 'Company Name' },
  { tag: '{{email}}', label: 'Email Address' },
];

export function VariablePicker({ onInsertVariable, customVariables = [] }: VariablePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      <span className="flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-400">
        <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Insert Variables:
      </span>

      {defaultVariables.map((item) => (
        <button
          key={item.tag}
          type="button"
          onClick={() => onInsertVariable(item.tag)}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-all hover:bg-blue-100 hover:border-blue-300 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
        >
          <Tag className="h-3 w-3" />
          <span>{item.tag}</span>
        </button>
      ))}

      {customVariables.map((varName) => {
        const formattedTag = `{{${varName}}}`;
        return (
          <button
            key={formattedTag}
            type="button"
            onClick={() => onInsertVariable(formattedTag)}
            className="inline-flex items-center gap-1 rounded-lg border border-purple-500/20 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 transition-all hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300"
          >
            <Tag className="h-3 w-3" />
            <span>{formattedTag}</span>
          </button>
        );
      })}
    </div>
  );
}
