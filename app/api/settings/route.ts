import { NextResponse } from 'next/server';
import { localStore } from '@/lib/storage';
import { canAddSmtpAccount } from '@/lib/plan-limits';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email') || localStore.getProfile().email;
  let profile = localStore.getProfile();

  if (email) {
    try {
      const { getProfileByEmail } = await import('@/lib/supabase/db');
      const dbProfile = await getProfileByEmail(email);
      if (dbProfile && dbProfile.email) {
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

    if (email) {
      try {
        const { getProfileByEmail } = await import('@/lib/supabase/db');
        const dbProf = await getProfileByEmail(email);
        if (dbProf) profile = dbProf;
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

    const updatedProfile = localStore.updateProfile(body);

    if (email) {
      try {
        const { updateProfileByEmail } = await import('@/lib/supabase/db');
        await updateProfileByEmail(email, body);
      } catch (e) {
        console.error('Failed to persist profile to DB:', e);
      }
    }

    return NextResponse.json({ profile: updatedProfile, message: 'Settings saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 });
  }
}
