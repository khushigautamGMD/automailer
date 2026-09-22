import { PlanTier, UserProfile } from '@/types';

export interface PlanLimitsConfig {
  name: string;
  maxEmailsPerCampaign: number;
  maxSmtpAccounts: number;
  monthlyEmails: number;
  maxContacts: number;
  allowRotation: boolean;
  badgeColor: string;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimitsConfig> = {
  demo: {
    name: 'Free Starter Plan',
    maxEmailsPerCampaign: 3000,
    maxSmtpAccounts: 2,
    monthlyEmails: 3000,
    maxContacts: 3000,
    allowRotation: true,
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  pro: {
    name: 'Pro Affiliate Plan',
    maxEmailsPerCampaign: 50000,
    maxSmtpAccounts: 5,
    monthlyEmails: 50000,
    maxContacts: 50000,
    allowRotation: true,
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  agency: {
    name: 'Agency Scale Plan',
    maxEmailsPerCampaign: 1000000,
    maxSmtpAccounts: 9999,
    monthlyEmails: 1000000,
    maxContacts: 1000000,
    allowRotation: true,
    badgeColor: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
  },
  lifetime: {
    name: 'Lifetime Access Pass',
    maxEmailsPerCampaign: 1000000,
    maxSmtpAccounts: 9999,
    monthlyEmails: 1000000,
    maxContacts: 1000000,
    allowRotation: true,
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
};

export function getUserPlan(profile?: Partial<UserProfile>): PlanTier {
  return profile?.plan || 'demo';
}

export function getUserLimits(profile?: Partial<UserProfile>): PlanLimitsConfig {
  const tier = getUserPlan(profile);
  return PLAN_LIMITS[tier] || PLAN_LIMITS.demo;
}

export function canSendMoreEmails(profile?: Partial<UserProfile>, count: number = 1): { allowed: boolean; reason?: string } {
  const limits = getUserLimits(profile);
  const sentThisMonth = profile?.emails_sent_this_month || 0;

  if (sentThisMonth + count > limits.monthlyEmails) {
    return {
      allowed: false,
      reason: `Monthly email limit reached (${sentThisMonth}/${limits.monthlyEmails}). Upgrade your plan to send more emails.`,
    };
  }

  return { allowed: true };
}

export function canAddSmtpAccount(profile?: Partial<UserProfile>, currentCount: number = 0): { allowed: boolean; reason?: string } {
  const limits = getUserLimits(profile);

  if (currentCount >= limits.maxSmtpAccounts) {
    return {
      allowed: false,
      reason: `Your ${limits.name} allows a maximum of ${limits.maxSmtpAccounts} SMTP sender account(s). Upgrade to add more accounts.`,
    };
  }

  return { allowed: true };
}

export function canImportContacts(profile?: Partial<UserProfile>, currentTotal: number = 0, newCount: number = 0): { allowed: boolean; allowedCount: number; reason?: string } {
  const limits = getUserLimits(profile);
  const totalAfter = currentTotal + newCount;

  if (totalAfter > limits.maxContacts) {
    const allowedNew = Math.max(0, limits.maxContacts - currentTotal);
    return {
      allowed: false,
      allowedCount: allowedNew,
      reason: `Your ${limits.name} cap is ${limits.maxContacts} contacts. Upgrade your plan to import all contacts.`,
    };
  }

  return { allowed: true, allowedCount: newCount };
}
