import { NextResponse } from 'next/server';
import { localStore } from '@/lib/storage';
import { canAddSmtpAccount } from '@/lib/plan-limits';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email') || localStore.getProfile().email;
  let profile = localStore.getProfile();

  // Only attempt Supabase sync if Supabase is properly configured
  if (email && isSupabaseConfigured()) {
    try {
      const { getProfileByEmail } = await import('@/lib/supabase/db');
      const dbProfile = await getProfileByEmail(email);
      // Only merge if DB profile exists and has non-empty credentials so local credentials are never wiped
      if (dbProfile && (dbProfile.smtp_user || dbProfile.smtp_pass || (dbProfile.smtp_accounts && dbProfile.smtp_accounts.length > 0))) {
        profile = localStore.updateProfile(dbProfile);
      }
    } catch (e) {
      console.error('Failed to sync profile from DB:', e);
    }
  }

  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const body = raw.profile || raw;
    const email = body.email || localStore.getProfile().email;
    let profile = localStore.getProfile();

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

    // Persist to localStore (which immediately writes to disk store.json)
    const updatedProfile = localStore.updateProfile(body);

    // Also persist to Supabase if configured
    if (email && isSupabaseConfigured()) {
      try {
        const { updateProfileByEmail } = await import('@/lib/supabase/db');
        await updateProfileByEmail(email, body);
      } catch (e) {
        console.error('Failed to persist profile to DB:', e);
      }
    }

    return NextResponse.json({ profile: updatedProfile, message: 'Settings saved permanently' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 });
  }
}
