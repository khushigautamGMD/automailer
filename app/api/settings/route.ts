import { NextResponse } from 'next/server';
import { localStore } from '@/lib/storage';
import { canAddSmtpAccount } from '@/lib/plan-limits';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get('email') || localStore.getProfile().email || '').trim().toLowerCase();
  let profile = localStore.getProfile(email);

  // Sync from Supabase cloud database if configured
  if (email && isSupabaseConfigured()) {
    try {
      const { getProfileByEmail } = await import('@/lib/supabase/db');
      const dbProfile = await getProfileByEmail(email);
      // If DB has profile for this email, sync to store and return
      if (dbProfile) {
        profile = localStore.updateProfile(dbProfile, email);
      }
    } catch (e) {
      console.error('Failed to sync profile from DB:', e);
    }
  }

  return NextResponse.json({
    profile,
    supabaseConfigured: isSupabaseConfigured(),
  });
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const body = raw.profile || raw;
    const { searchParams } = new URL(req.url);
    const email = (body.email || searchParams.get('email') || localStore.getProfile().email || '').trim().toLowerCase();
    let profile = localStore.getProfile(email);

    if (email && isSupabaseConfigured()) {
      try {
        const { getProfileByEmail } = await import('@/lib/supabase/db');
        const dbProf = await getProfileByEmail(email);
        if (dbProf) {
          profile = { ...profile, ...dbProf };
        }
      } catch (e) {}
    }

    if (Array.isArray(body.smtp_accounts)) {
      const activeOrTotalCount = body.smtp_accounts.length;
      const currentCount = (profile.smtp_accounts || []).length;
      if (activeOrTotalCount > currentCount) {
        const check = canAddSmtpAccount(profile, currentCount);
        if (!check.allowed) {
          return NextResponse.json({ error: check.reason }, { status: 403 });
        }
      }
    }

    const payload = { ...body, ...(email ? { email } : {}) };

    // Persist to localStore under user email (writes to store.json)
    const updatedProfile = localStore.updateProfile(payload, email);

    let dbStatus = 'skipped';
    if (email && isSupabaseConfigured()) {
      try {
        const { updateProfileByEmail } = await import('@/lib/supabase/db');
        const dbResult = await updateProfileByEmail(email, payload);
        dbStatus = dbResult ? 'synced' : 'failed';
      } catch (e: any) {
        console.error('Failed to persist profile to DB:', e);
        dbStatus = 'error: ' + (e?.message || String(e));
      }
    }

    return NextResponse.json({ profile: updatedProfile, message: 'Settings saved permanently', dbStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 });
  }
}
