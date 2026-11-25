import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://seojzxgnxwwcmamlylgc.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_tjs5TjayD8B6L0rwqubpGA_l57nWF9v';

const globalForSupabase = globalThis as unknown as {
  __automailerSupabaseDownUntil?: number;
};

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
  if (
    globalForSupabase.__automailerSupabaseDownUntil &&
    Date.now() < globalForSupabase.__automailerSupabaseDownUntil
  ) {
    return false;
  }
  return true;
}

// Guard every Supabase HTTP request with a 4-second timeout and 60s DNS/network circuit-breaker
const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    globalForSupabase.__automailerSupabaseDownUntil = 0;
    return res;
  } catch (err: any) {
    const code = err?.cause?.code || err?.code || '';
    const msg = String(err?.message || '');
    if (
      code === 'ENOTFOUND' ||
      code === 'ECONNREFUSED' ||
      code === 'EAI_AGAIN' ||
      msg.includes('ENOTFOUND') ||
      err?.name === 'AbortError'
    ) {
      globalForSupabase.__automailerSupabaseDownUntil = Date.now() + 60_000;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase: SupabaseClient = createClient(getSupabaseUrl(), getSupabaseKey(), {
  global: {
    fetch: fetchWithTimeout,
  },
});
