import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://seojzxgnxwwcmamlylgc.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_tjs5TjayD8B6L0rwqubpGA_l57nWF9v';

export function getSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (envUrl && envUrl.startsWith('https://') && !envUrl.includes('placeholder') && !envUrl.includes('your-supabase-project')) {
    return envUrl;
  }
  return DEFAULT_SUPABASE_URL;
}

export function getSupabaseKey(): string {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (envKey && !envKey.includes('placeholder') && !envKey.includes('your-supabase-anon-key')) {
    return envKey;
  }
  return DEFAULT_SUPABASE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return true;
}

// Guard every Supabase HTTP request with an 8-second timeout so slow/unreachable DB calls never hang UI or API routes
const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase: SupabaseClient = createClient(getSupabaseUrl(), getSupabaseKey(), {
  global: {
    fetch: fetchWithTimeout,
  },
});
