import { NextResponse } from 'next/server';
import { sendIndividualEmail } from '@/lib/email/dispatcher';
import { localStore } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      to,
      subject,
      bodyHtml,
      senderName,
      senderEmail,
      replyTo,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpAccounts,
      resendApiKey,
    } = body;

    if (!to || !subject || !bodyHtml) {
      return NextResponse.json({ error: 'Missing recipient, subject, or HTML body' }, { status: 400 });
    }

    const profile = localStore.getProfile();

    const activeUser = smtpUser || profile.smtp_user;
    const activePass = smtpPass || profile.smtp_pass;
    const activeHost = smtpHost || profile.smtp_host;
    const activePort = smtpPort || profile.smtp_port;
    const activeSenderEmail = senderEmail || profile.reply_to_email || (activeUser?.includes('@') ? activeUser : undefined);

    if (!activeUser || !activePass) {
      return NextResponse.json(
        {
          success: false,
          error: 'No SMTP credentials configured. Please enter your SMTP Host, Username/Key, and Password.',
        },
        { status: 400 }
      );
    }

    const dispatchResult = await sendIndividualEmail({
      to,
      senderName: senderName || profile.sender_name || 'Automailer',
      senderEmail: activeSenderEmail,
      replyTo: replyTo || profile.reply_to_email || activeSenderEmail || 'support@yourdomain.com',
      subject: subject.startsWith('[TEST PREVIEW]') ? subject : `[TEST PREVIEW] ${subject}`,
      bodyHtml,
      variables: {
        firstname: 'TestUser',
        lastname: 'Sample',
        company: 'Sample Co',
        email: to,
        phone: '+1-555-0192',
      },
      resendApiKey: resendApiKey || profile.resend_api_key,
      smtpHost: activeHost,
      smtpPort: activePort,
      smtpUser: activeUser,
      smtpPass: activePass,
      smtpAccounts: smtpAccounts || profile.smtp_accounts,
    });

    if (dispatchResult.success) {
      // Also update localStore so saved state stays in sync
      if (smtpUser || smtpPass) {
        localStore.updateProfile({
          smtp_host: activeHost,
          smtp_port: activePort,
          smtp_user: activeUser,
          smtp_pass: activePass,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Test email successfully delivered to ${to} via ${dispatchResult.provider.toUpperCase()} provider!`,
        provider: dispatchResult.provider,
        senderUsed: dispatchResult.senderUsed,
      });
    } else {
      return NextResponse.json({ success: false, error: dispatchResult.error }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Test email failed' }, { status: 500 });
  }
}
