import { NextResponse } from 'next/server';
import { checkPhonePeStatus } from '@/lib/payments/phonepe';
import { localStore } from '@/lib/storage';
import { PlanTier } from '@/types';

const PRODUCTION_URL = 'https://automailer-alpha.vercel.app';

function getHostUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL;
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const email = searchParams.get('email');
    const planName = searchParams.get('plan') || 'Pro Affiliate Plan';

    let isSuccess = false;

    if (orderId) {
      isSuccess = await checkPhonePeStatus(orderId);
    }

    const hostUrl = getHostUrl();

    if (isSuccess) {
      // Map plan name to PlanTier
      let activatedPlan: PlanTier = 'pro';
      const pNameLower = planName.toLowerCase();
      if (pNameLower.includes('agency')) {
        activatedPlan = 'agency';
      } else if (pNameLower.includes('lifetime')) {
        activatedPlan = 'lifetime';
      }

      // Upgrade user profile plan tier in store
      localStore.updateProfile({
        plan: activatedPlan,
        email: email || localStore.getProfile().email,
      });

      // Persist plan upgrade to database
      if (email) {
        try {
          const { upgradePlan } = await import('@/lib/supabase/db');
          await upgradePlan(email, activatedPlan);
        } catch (e) {
          console.error('Failed to persist plan upgrade to Supabase:', e);
        }
      }

      return NextResponse.redirect(`${hostUrl}/dashboard?payment=success&plan=${activatedPlan}&email=${encodeURIComponent(email || '')}`, 303);
    } else {
      return NextResponse.redirect(`${hostUrl}/dashboard?payment=pending&email=${encodeURIComponent(email || '')}`, 303);
    }
  } catch (err) {
    const hostUrl = getHostUrl();
    return NextResponse.redirect(`${hostUrl}/dashboard?payment=error`, 303);
  }
}

export async function GET(req: Request) {
  return POST(req);
}
