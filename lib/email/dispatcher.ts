import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { interpolateVariables } from '@/lib/utils';
import { SmtpAccount } from '@/types';

export interface SendEmailPayload {
  to: string;
  senderName: string;
  senderEmail?: string;
  replyTo?: string;
  subject: string;
  bodyHtml: string;
  variables: Record<string, string | undefined>;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpAccounts?: SmtpAccount[];
  senderIndex?: number;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  senderUsed?: string;
  provider: 'resend' | 'smtp' | 'simulation';
}

export async function sendIndividualEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  const {
    to,
    senderName,
    replyTo,
    subject,
    bodyHtml,
    variables,
    resendApiKey,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpAccounts,
    senderIndex = 0,
  } = payload;

  // Personalize Subject & HTML
  const personalizedSubject = interpolateVariables(subject, variables);
  const personalizedHtml = interpolateVariables(bodyHtml, variables);
  // 1. SMTP Account Selection (Round-Robin Pool or Primary Amazon SES / Gmail)
  let activeUser = (smtpUser || process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  let activePass = (smtpPass || process.env.SMTP_PASS || process.env.GMAIL_PASS || '').trim().replace(/\s+/g, '');
  let activeHost = (smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  let activePort = smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587);

  if (smtpAccounts && smtpAccounts.length > 0) {
    const activePool = smtpAccounts.filter((a) => a.active);
    if (activePool.length > 0) {
      const selected = activePool[senderIndex % activePool.length];
      activeUser = selected.user.trim();
      activePass = selected.pass.trim().replace(/\s+/g, '');
      activeHost = selected.host.trim();
      activePort = selected.port;
    }
  }

  if (activeUser && activePass) {
    const finalHost = activeHost || (activeUser.toLowerCase().endsWith('@gmail.com') ? 'smtp.gmail.com' : 'smtp.office365.com');

    try {
      const transporter = nodemailer.createTransport({
        host: finalHost,
        port: activePort,
        secure: activePort === 465,
        auth: {
          user: activeUser,
          pass: activePass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const fromAddress = (
        (payload.senderEmail && payload.senderEmail.includes('@') ? payload.senderEmail : undefined) ||
        (activeUser.includes('@') ? activeUser : undefined) ||
        (replyTo && replyTo.includes('@') ? replyTo : undefined) ||
        'newsletter@yourdomain.com'
      ).trim();

      const validReplyTo = (replyTo && replyTo.includes('@')) ? replyTo : fromAddress;

      const info = await transporter.sendMail({
        from: `"${senderName}" <${fromAddress}>`,
        to: to,
        replyTo: validReplyTo,
        subject: personalizedSubject,
        html: personalizedHtml,
      });

      return { success: true, messageId: info.messageId, senderUsed: fromAddress, provider: 'smtp' };
    } catch (err: any) {
      let friendlyError = err.message || 'SMTP dispatch failed';
      if (friendlyError.includes('535') || friendlyError.includes('Username and Password not accepted') || friendlyError.includes('Invalid login') || friendlyError.includes('Authentication credentials invalid')) {
        friendlyError = `SMTP Credentials Rejected for ${activeUser}! Check that your AWS SES SMTP Username (starts with AKIA...) and SMTP Password are correct.`;
      } else if (friendlyError.includes('Email address is not verified') || friendlyError.includes('MessageRejected') || friendlyError.includes('not verified')) {
        friendlyError = `Amazon SES Sandbox Limitation: The recipient "${to}" or sender "${fromAddress}" is not verified in AWS SES. In Sandbox mode, verify both emails in AWS SES Console > Verified Identities (or Request Production Access).`;
      } else if (friendlyError.includes('ENOTFOUND') || friendlyError.includes('EAI_AGAIN')) {
        friendlyError = `SMTP Host "${finalHost}" could not be reached. Check your internet connection and SMTP Host address.`;
      } else if (friendlyError.includes('ETIMEDOUT') || friendlyError.includes('ECONNREFUSED')) {
        friendlyError = `Connection to ${finalHost}:${activePort} timed out. Make sure port ${activePort} is open (recommended: 587 for TLS).`;
      }
      return { success: false, error: friendlyError, senderUsed: activeUser, provider: 'smtp' };
    }
  }

  // 2. Resend API Engine (Fallback only if valid non-placeholder key is provided)
  const activeResendKey = resendApiKey || process.env.RESEND_API_KEY;
  const isRealResendKey =
    activeResendKey &&
    activeResendKey.startsWith('re_') &&
    !activeResendKey.includes('123456789') &&
    !activeResendKey.includes('your_resend_api_key');

  if (isRealResendKey) {
    try {
      const resend = new Resend(activeResendKey);
      const fromEmail = payload.senderEmail || 'onboarding@resend.dev';

      const data = await resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [to],
        replyTo: replyTo || fromEmail,
        subject: personalizedSubject,
        html: personalizedHtml,
      });

      if (data.error) {
        return { success: false, error: `Resend Error: ${data.error.message}`, provider: 'resend' };
      }

      return { success: true, messageId: data.data?.id, senderUsed: fromEmail, provider: 'resend' };
    } catch (err: any) {
      return { success: false, error: `Resend Dispatch Failed: ${err.message}`, provider: 'resend' };
    }
  }

  return {
    success: true,
    messageId: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    senderUsed: activeUser,
    provider: 'simulation',
  };
}
