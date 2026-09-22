import { NextResponse } from 'next/server';
import { sendIndividualEmail } from '@/lib/email/dispatcher';
import { localStore } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, bodyHtml, senderName, replyTo } = body;

    if (!to || !subject || !bodyHtml) {
      return NextResponse.json({ error: 'Missing recipient, subject, or HTML body' }, { status: 400 });
    }

    const profile = localStore.getProfile();

    const dispatchResult = await sendIndividualEmail({
      to,
      senderName: senderName || profile.sender_name || 'Automailer',
      senderEmail: profile.reply_to_email || (profile.smtp_user?.includes('@') ? profile.smtp_user : undefined),
      replyTo: replyTo || profile.reply_to_email || 'support@yourdomain.com',
      subject: `[TEST PREVIEW] ${subject}`,
      bodyHtml,
      variables: {
        firstname: 'TestUser',
        lastname: 'Sample',
        company: 'Sample Co',
        email: to,
      },
      resendApiKey: profile.resend_api_key,
      smtpHost: profile.smtp_host,
      smtpPort: profile.smtp_port,
      smtpUser: profile.smtp_user,
      smtpPass: profile.smtp_pass,
    });

    if (dispatchResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${to} via ${dispatchResult.provider.toUpperCase()} provider!`,
        provider: dispatchResult.provider,
      });
    } else {
      return NextResponse.json({ success: false, error: dispatchResult.error }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Test email failed' }, { status: 500 });
  }
}
