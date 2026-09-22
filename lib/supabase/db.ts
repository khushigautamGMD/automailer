import { supabase } from '@/lib/supabase/client';
import { UserProfile, PlanTier, SmtpAccount } from '@/types';

/**
 * Database-backed profile storage using Supabase.
 * Persists plan tier, email counters, and SMTP config across Vercel cold starts.
 */

interface DbProfile {
  id: string;
  email: string;
  plan: PlanTier;
  emails_sent_this_month: number;
  month_reset_at: string;
  full_name: string;
  company_name: string;
  sender_name: string;
  reply_to_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_accounts: SmtpAccount[];
  enable_rotation: boolean;
  default_rate_limit: number;
  email_signature: string;
  created_at: string;
  updated_at: string;
}

function dbToProfile(row: DbProfile): UserProfile {
  return {
    id: row.id,
    email: row.email,
    plan: row.plan as PlanTier,
    emails_sent_this_month: row.emails_sent_this_month,
    full_name: row.full_name,
    company_name: row.company_name,
    sender_name: row.sender_name,
    reply_to_email: row.reply_to_email,
    smtp_host: row.smtp_host,
    smtp_port: row.smtp_port,
    smtp_user: row.smtp_user,
    smtp_pass: row.smtp_pass,
    smtp_accounts: row.smtp_accounts || [],
    enable_rotation: row.enable_rotation,
    default_rate_limit: row.default_rate_limit,
    email_signature: row.email_signature,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Get or create a user profile by email.
 * Auto-resets monthly email counter if a new month has started.
 */
export async function getProfileByEmail(email: string): Promise<UserProfile> {
  if (!email) {
    return getDefaultProfile();
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      // Profile doesn't exist yet — create it
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ email, plan: 'demo', emails_sent_this_month: 0 })
        .select()
        .single();

      if (insertError || !newProfile) {
        console.error('Failed to create profile in DB:', insertError);
        return getDefaultProfile(email);
      }

      return dbToProfile(newProfile as DbProfile);
    }

    // Auto-reset monthly counter if new month
    const profile = dbToProfile(data as DbProfile);
    const resetDate = new Date(data.month_reset_at || data.created_at);
    const now = new Date();
    if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
      await supabase
        .from('profiles')
        .update({ emails_sent_this_month: 0, month_reset_at: now.toISOString() })
        .eq('email', email);
      profile.emails_sent_this_month = 0;
    }

    return profile;
  } catch (err) {
    console.error('DB getProfile error:', err);
    return getDefaultProfile(email);
  }
}

/**
 * Update a user profile in the database.
 */
export async function updateProfileByEmail(
  email: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  if (!email) return getDefaultProfile();

  try {
    // Map UserProfile fields to DB column names
    const dbUpdates: Record<string, any> = {};
    if (updates.plan !== undefined) dbUpdates.plan = updates.plan;
    if (updates.emails_sent_this_month !== undefined) dbUpdates.emails_sent_this_month = updates.emails_sent_this_month;
    if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name;
    if (updates.company_name !== undefined) dbUpdates.company_name = updates.company_name;
    if (updates.sender_name !== undefined) dbUpdates.sender_name = updates.sender_name;
    if (updates.reply_to_email !== undefined) dbUpdates.reply_to_email = updates.reply_to_email;
    if (updates.smtp_host !== undefined) dbUpdates.smtp_host = updates.smtp_host;
    if (updates.smtp_port !== undefined) dbUpdates.smtp_port = updates.smtp_port;
    if (updates.smtp_user !== undefined) dbUpdates.smtp_user = updates.smtp_user;
    if (updates.smtp_pass !== undefined) dbUpdates.smtp_pass = updates.smtp_pass;
    if (updates.smtp_accounts !== undefined) dbUpdates.smtp_accounts = updates.smtp_accounts;
    if (updates.enable_rotation !== undefined) dbUpdates.enable_rotation = updates.enable_rotation;
    if (updates.default_rate_limit !== undefined) dbUpdates.default_rate_limit = updates.default_rate_limit;
    if (updates.email_signature !== undefined) dbUpdates.email_signature = updates.email_signature;
    if (updates.email !== undefined) dbUpdates.email = updates.email;

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('email', email)
      .select()
      .single();

    if (error || !data) {
      // If profile doesn't exist yet, upsert it
      const { data: upserted, error: upsertError } = await supabase
        .from('profiles')
        .upsert({ email, ...dbUpdates })
        .select()
        .single();

      if (upsertError || !upserted) {
        console.error('DB updateProfile error:', upsertError);
        return getDefaultProfile(email);
      }
      return dbToProfile(upserted as DbProfile);
    }

    return dbToProfile(data as DbProfile);
  } catch (err) {
    console.error('DB updateProfile error:', err);
    return getDefaultProfile(email);
  }
}

/**
 * Increment the emails_sent_this_month counter atomically.
 */
export async function incrementEmailsSent(email: string, count: number = 1): Promise<number> {
  if (!email) return 0;

  try {
    // Use RPC or manual increment
    const { data } = await supabase
      .from('profiles')
      .select('emails_sent_this_month')
      .eq('email', email)
      .single();

    const currentCount = data?.emails_sent_this_month || 0;
    const newCount = currentCount + count;

    await supabase
      .from('profiles')
      .update({ emails_sent_this_month: newCount })
      .eq('email', email);

    return newCount;
  } catch (err) {
    console.error('DB incrementEmailsSent error:', err);
    return 0;
  }
}

/**
 * Upgrade user plan after successful payment.
 */
export async function upgradePlan(email: string, plan: PlanTier): Promise<UserProfile> {
  return updateProfileByEmail(email, { plan });
}

function getDefaultProfile(email: string = ''): UserProfile {
  return {
    id: 'local-fallback',
    email,
    plan: 'demo',
    emails_sent_this_month: 0,
    full_name: '',
    company_name: '',
    sender_name: '',
    reply_to_email: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_accounts: [],
    enable_rotation: true,
    default_rate_limit: 50,
    email_signature: '',
  };
}
