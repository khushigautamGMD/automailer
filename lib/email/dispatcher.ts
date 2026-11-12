import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { interpolateVariables, htmlToPlainText } from '@/lib/utils';
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
  allowSimulation?: boolean;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  senderUsed?: string;
  provider: 'resend' | 'smtp' | 'simulation';
}

// Global Transporter Connection Pool for Keep-Alive & High Deliverability
const transporterPool = new Map<string, nodemailer.Transporter>();

function getPooledTransporter(host: string, port: number, user: string, pass: string): nodemailer.Transporter {
  const poolKey = `${host}:${port}:${user}`;
  const existing = transporterPool.get(poolKey);
  if (existing) {
    return existing;
  }

  const isSecure = port === 465;
  const transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 1, // Safe serial sending per sender account to prevent Gmail/SES rate drops
    maxMessages: 100, // Recycle connection every 100 messages to prevent stale sockets
    rateLimit: 5, // Limit burst rate to 5 emails/second max per transport
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  transporterPool.set(poolKey, transporter);
  return transporter;
}

export function closeTransporterPool(host?: string, port?: number, user?: string) {
  if (host && port && user) {
    const key = `${host}:${port}:${user}`;
    const t = transporterPool.get(key);
    if (t) {
      try {
        t.close();
      } catch {}
      transporterPool.delete(key);
    }
  } else {
    for (const [, t] of transporterPool.entries()) {
      try {
        t.close();
      } catch {}
    }
    transporterPool.clear();
  }
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
    allowSimulation = false,
  } = payload;

  // Personalize Subject & HTML
  const personalizedSubject = interpolateVariables(subject, variables);
  const personalizedHtml = interpolateVariables(bodyHtml, variables);

  // 1. SMTP Account Candidates Selection (Round-Robin with Automatic Multi-Account Failover)
  const candidateAccounts: Array<{ user: string; pass: string; host: string; port: number }> = [];

  if (smtpAccounts && smtpAccounts.length > 0) {
    const activePool = smtpAccounts.filter((a) => a.active && a.user && a.pass);
    if (activePool.length > 0) {
      // Rotate pool starting at senderIndex, followed by other active senders as failovers
      for (let offset = 0; offset < activePool.length; offset++) {
        const item = activePool[(senderIndex + offset) % activePool.length];
        candidateAccounts.push({
          user: item.user.trim(),
          pass: item.pass.trim().replace(/\s+/g, ''),
          host: item.host.trim() || 'smtp.gmail.com',
          port: item.port || 587,
        });
      }
    }
  }

  // Fallback to primary / environment SMTP credentials if candidate list is empty
  if (candidateAccounts.length === 0) {
    const fallbackUser = (smtpUser || process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
    const fallbackPass = (smtpPass || process.env.SMTP_PASS || process.env.GMAIL_PASS || '').trim().replace(/\s+/g, '');
    const fallbackHost = (smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const fallbackPort = smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587);
    if (fallbackUser && fallbackPass) {
      candidateAccounts.push({
        user: fallbackUser,
        pass: fallbackPass,
        host: fallbackHost,
        port: fallbackPort,
      });
    }
  }

  // Iterate candidate SMTP accounts with failover to guarantee delivery
  if (candidateAccounts.length > 0) {
    let lastAccountError = '';

    for (let cIdx = 0; cIdx < candidateAccounts.length; cIdx++) {
      const candidate = candidateAccounts[cIdx];
      const activeUser = candidate.user;
      const activePass = candidate.pass;
      const activeHost = candidate.host;
      const activePort = candidate.port;

      const isGmail =
        activeHost.toLowerCase().includes('gmail.com') ||
        activeUser.toLowerCase().endsWith('@gmail.com') ||
        activeUser.toLowerCase().endsWith('@googlemail.com');

      const finalHost = activeHost || (isGmail ? 'smtp.gmail.com' : 'smtp.office365.com');

      const fromAddress = isGmail
        ? activeUser
        : (
            (payload.senderEmail && payload.senderEmail.includes('@') ? payload.senderEmail : undefined) ||
            (replyTo && replyTo.includes('@') ? replyTo : undefined) ||
            (activeUser.includes('@') ? activeUser : undefined) ||
            (finalHost.includes('amazonaws.com') ? 'rahul@growmoredigitally.in' : 'newsletter@yourdomain.com')
          ).trim();

      const validReplyTo = (replyTo && replyTo.includes('@'))
        ? replyTo
        : (payload.senderEmail && payload.senderEmail.includes('@') ? payload.senderEmail : fromAddress);

      const cleanSenderName = (senderName || 'Automailer').replace(/"/g, '').trim();
      const plainText = htmlToPlainText(personalizedHtml);

      // Automated Retry Loop with Exponential Backoff
      const MAX_RETRIES = 3;
      let accountSucceeded = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const transporter = getPooledTransporter(finalHost, activePort, activeUser, activePass);

          const info = await transporter.sendMail({
            from: `"${cleanSenderName}" <${fromAddress}>`,
            to: to,
            replyTo: validReplyTo,
            subject: personalizedSubject,
            text: plainText,
            html: personalizedHtml,
            headers: {
              'X-Auto-Response-Suppress': 'OOF, AutoReply',
            },
          });

          return { success: true, messageId: info.messageId, senderUsed: fromAddress, provider: 'smtp' };
        } catch (err: any) {
          lastAccountError = err.message || 'SMTP dispatch failed';

          const isTransient = /ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|socket hang up|421|451|454|timeout/i.test(lastAccountError);

          // If transient network or rate-limiting issue, reset pooled transport and retry with backoff
          if (isTransient && attempt < MAX_RETRIES) {
            closeTransporterPool(finalHost, activePort, activeUser);
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
            continue;
          }
          break; // Try next failover candidate account
        }
      }

      // If there are other candidate accounts in the pool, log failover attempt
      if (!accountSucceeded && cIdx < candidateAccounts.length - 1) {
        console.warn(`[Dispatcher] Sender ${activeUser} encountered error, failing over to ${candidateAccounts[cIdx + 1].user}...`);
      }
    }

    let friendlyError = lastAccountError;
    if (friendlyError.includes('535') || friendlyError.includes('Username and Password not accepted') || friendlyError.includes('Invalid login') || friendlyError.includes('Authentication credentials invalid')) {
      friendlyError = `SMTP Credentials Rejected! Check your Gmail App Password or AWS SES SMTP credentials in Settings.`;
    } else if (friendlyError.includes('554') || friendlyError.includes('Email address is not verified') || friendlyError.includes('Message rejected') || friendlyError.includes('MessageRejected') || friendlyError.includes('not verified')) {
      friendlyError = `Verification Error: Sender or recipient "${to}" is not verified. If using AWS SES Sandbox, recipient must be verified.`;
    } else if (friendlyError.includes('ENOTFOUND') || friendlyError.includes('EAI_AGAIN')) {
      friendlyError = `SMTP Host could not be reached. Check network connection and hostname.`;
    } else if (friendlyError.includes('ETIMEDOUT') || friendlyError.includes('ECONNREFUSED')) {
      friendlyError = `Connection to SMTP host timed out. Ensure port 587 is open.`;
    }

    return { success: false, error: friendlyError, senderUsed: candidateAccounts[0].user, provider: 'smtp' };
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
      const plainText = htmlToPlainText(personalizedHtml);

      const data = await resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [to],
        replyTo: replyTo || fromEmail,
        subject: personalizedSubject,
        text: plainText,
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

  // If simulation is explicitly requested, allow it; otherwise fail explicitly so user knows credentials are missing
  if (allowSimulation) {
    return {
      success: true,
      messageId: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      senderUsed: activeUser || 'simulation',
      provider: 'simulation',
    };
  }

  return {
    success: false,
    error: 'No active SMTP credentials configured. Please configure your Gmail or Amazon SES credentials in Settings before sending.',
    provider: 'smtp',
  };
}
