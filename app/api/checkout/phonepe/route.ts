import { NextResponse } from 'next/server';
import { initiatePhonePePayment } from '@/lib/payments/phonepe';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planName, amount, email, mobile } = body;

    if (!amount || !email) {
      return NextResponse.json({ error: 'Missing required plan amount or email' }, { status: 400 });
    }

    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const amountInPaise = Math.round(amount * 100); // Convert ₹ to paise

    const hostUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://automailer-alpha.vercel.app';
    const redirectUrl = `${hostUrl}/api/webhooks/phonepe?orderId=${orderId}&email=${encodeURIComponent(email)}&plan=${encodeURIComponent(planName || 'pro')}`;

    const result = await initiatePhonePePayment(orderId, amountInPaise, redirectUrl);

    if (result.success && result.redirectUrl) {
      return NextResponse.json({ success: true, redirectUrl: result.redirectUrl });
    }

    return NextResponse.json({
      error: result.error || 'Failed to initiate PhonePe payment',
      debug: {
        merchantIdPresent: !!(process.env.PHONEPE_MERCHANT_ID),
        saltKeyPresent: !!(process.env.PHONEPE_SALT_KEY),
        env: process.env.PHONEPE_ENV || 'NOT_SET',
        hostUrl: hostUrl,
      }
    }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'PhonePe checkout error',
    }, { status: 500 });
  }
}
