import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { UserProfile, PlanTier, SmtpAccount, ContactList, Contact, Campaign } from '@/types';

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
export async function getProfileByEmail(email: string): Promise<UserProfile | null> {
  if (!email || !isSupabaseConfigured()) {
    return null;
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
        return null;
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
    return null;
  }
}

/**
 * Update a user profile in the database.
 */
export async function updateProfileByEmail(
  email: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  if (!email || !isSupabaseConfigured()) return null;

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
        return null;
      }
      return dbToProfile(upserted as DbProfile);
    }

    return dbToProfile(data as DbProfile);
  } catch (err) {
    console.error('DB updateProfile error:', err);
    return null;
  }
}

/**
 * Increment the emails_sent_this_month counter atomically.
 */
export async function incrementEmailsSent(email: string, count: number = 1): Promise<number> {
  if (!email || !isSupabaseConfigured()) return 0;

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
export async function upgradePlan(email: string, plan: PlanTier): Promise<UserProfile | null> {
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

/**
 * ========================================================
 * Contact Lists & Contacts Cloud DB Methods
 * ========================================================
 */

export async function getListsByUser(userEmail: string): Promise<ContactList[]> {
  if (!userEmail || !isSupabaseConfigured()) return [];
  const cleanEmail = userEmail.trim().toLowerCase();

  // 1. Try dedicated contact_lists table
  try {
    const { data, error } = await supabase
      .from('contact_lists')
      .select('*')
      .eq('user_email', cleanEmail)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        tags: Array.isArray(row.tags) ? row.tags : [],
        total_contacts: row.total_contacts || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    }
  } catch (err) {}

  // 2. Fallback to profiles.saved_lists JSONB column
  try {
    const { data } = await supabase
      .from('profiles')
      .select('saved_lists')
      .eq('email', cleanEmail)
      .single();

    if (data?.saved_lists && Array.isArray(data.saved_lists)) {
      return data.saved_lists;
    }
  } catch (err) {}

  return [];
}

export async function getContactsByUser(userEmail: string, listId?: string): Promise<Contact[]> {
  if (!userEmail || !isSupabaseConfigured()) return [];
  const cleanEmail = userEmail.trim().toLowerCase();

  // 1. Try dedicated contacts table
  try {
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('user_email', cleanEmail);

    if (listId && listId !== 'all') {
      query = query.eq('list_id', listId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        list_id: row.list_id,
        email: row.email,
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        company: row.company || '',
        phone: row.phone || '',
        status: row.status || 'active',
        custom_fields: row.custom_fields || {},
        created_at: row.created_at,
      }));
    }
  } catch (err) {}

  // 2. Fallback to profiles.saved_contacts JSONB column
  try {
    const { data } = await supabase
      .from('profiles')
      .select('saved_contacts')
      .eq('email', cleanEmail)
      .single();

    if (data?.saved_contacts && Array.isArray(data.saved_contacts)) {
      if (!listId || listId === 'all') return data.saved_contacts;
      return data.saved_contacts.filter((c: any) => c.list_id === listId);
    }
  } catch (err) {}

  return [];
}

export async function getContactsByListId(listId: string): Promise<Contact[]> {
  if (!listId || !isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        list_id: row.list_id,
        email: row.email,
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        company: row.company || '',
        phone: row.phone || '',
        status: row.status || 'active',
        custom_fields: row.custom_fields || {},
        created_at: row.created_at,
      }));
    }
  } catch (err) {}
  return [];
}

export async function saveContactsToDb(userEmail: string, listId: string, newContacts: Contact[]): Promise<void> {
  if (!userEmail || !isSupabaseConfigured() || newContacts.length === 0) return;
  const cleanEmail = userEmail.trim().toLowerCase();

  // 1. Insert into contacts table if available
  try {
    const dbRows = newContacts.map((c) => ({
      id: c.id,
      user_email: cleanEmail,
      list_id: listId,
      email: c.email,
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      company: c.company || '',
      phone: c.phone || '',
      status: c.status || 'active',
      custom_fields: c.custom_fields || {},
    }));

    await supabase.from('contacts').upsert(dbRows);

    // Update list count in contact_lists
    const { count } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', cleanEmail)
      .eq('list_id', listId);

    if (typeof count === 'number') {
      await supabase
        .from('contact_lists')
        .update({ total_contacts: count, updated_at: new Date().toISOString() })
        .eq('id', listId)
        .eq('user_email', cleanEmail);
    }
  } catch (err) {}

  // 2. Backup into profiles.saved_contacts
  try {
    const { data } = await supabase
      .from('profiles')
      .select('saved_contacts')
      .eq('email', cleanEmail)
      .single();

    const existing: Contact[] = (data?.saved_contacts && Array.isArray(data.saved_contacts)) ? data.saved_contacts : [];
    const newIds = new Set(newContacts.map((c) => c.id));
    const merged = [...newContacts, ...existing.filter((c) => !newIds.has(c.id))];

    await supabase
      .from('profiles')
      .update({ saved_contacts: merged })
      .eq('email', cleanEmail);
  } catch (err) {}
}

export async function saveListToDb(userEmail: string, list: ContactList): Promise<void> {
  if (!userEmail || !isSupabaseConfigured()) return;
  const cleanEmail = userEmail.trim().toLowerCase();

  try {
    await supabase.from('contact_lists').upsert({
      id: list.id,
      user_email: cleanEmail,
      name: list.name,
      description: list.description || '',
      tags: list.tags || [],
      total_contacts: list.total_contacts || 0,
      created_at: list.created_at,
    });
  } catch (err) {}

  try {
    const { data } = await supabase
      .from('profiles')
      .select('saved_lists')
      .eq('email', cleanEmail)
      .single();

    const existing: ContactList[] = (data?.saved_lists && Array.isArray(data.saved_lists)) ? data.saved_lists : [];
    const filtered = existing.filter((l) => l.id !== list.id);
    const updated = [list, ...filtered];

    await supabase
      .from('profiles')
      .update({ saved_lists: updated })
      .eq('email', cleanEmail);
  } catch (err) {}
}

export async function deleteContactFromDb(userEmail: string, contactId: string): Promise<void> {
  if (!userEmail || !isSupabaseConfigured() || !contactId) return;
  const cleanEmail = userEmail.trim().toLowerCase();

  try {
    await supabase.from('contacts').delete().eq('id', contactId).eq('user_email', cleanEmail);
  } catch (err) {}

  try {
    const { data } = await supabase
      .from('profiles')
      .select('saved_contacts')
      .eq('email', cleanEmail)
      .single();

    if (data?.saved_contacts && Array.isArray(data.saved_contacts)) {
      const updated = data.saved_contacts.filter((c: any) => c.id !== contactId);
      await supabase.from('profiles').update({ saved_contacts: updated }).eq('email', cleanEmail);
    }
  } catch (err) {}
}

export async function deleteListFromDb(userEmail: string, listId: string): Promise<void> {
  if (!userEmail || !isSupabaseConfigured() || !listId) return;
  const cleanEmail = userEmail.trim().toLowerCase();

  try {
    await supabase.from('contacts').delete().eq('list_id', listId).eq('user_email', cleanEmail);
    await supabase.from('contact_lists').delete().eq('id', listId).eq('user_email', cleanEmail);
  } catch (err) {}

  try {
    const { data } = await supabase
      .from('profiles')
      .select('saved_lists, saved_contacts')
      .eq('email', cleanEmail)
      .single();

    if (data) {
      const updatedLists = (data.saved_lists || []).filter((l: any) => l.id !== listId);
      const updatedContacts = (data.saved_contacts || []).filter((c: any) => c.list_id !== listId);
      await supabase
        .from('profiles')
        .update({ saved_lists: updatedLists, saved_contacts: updatedContacts })
        .eq('email', cleanEmail);
    }
  } catch (err) {}
}

/**
 * ========================================================
 * Campaign Cloud Persistence Methods
 * Persists campaign history across serverless cold starts.
 * ========================================================
 */

export async function getCampaignsByUser(userEmail: string): Promise<Campaign[]> {
  if (!userEmail || !isSupabaseConfigured()) return [];
  const cleanEmail = userEmail.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email_signature')
      .eq('email', cleanEmail)
      .single();

    if (!error && data?.email_signature && typeof data.email_signature === 'string') {
      const trimmed = data.email_signature.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed as Campaign[];
        } else if (parsed && Array.isArray(parsed.campaigns)) {
          return parsed.campaigns as Campaign[];
        }
      }
    }
  } catch (err) {
    console.error('Error fetching campaigns from DB:', err);
  }

  return [];
}

export async function saveCampaignsToDb(userEmail: string, campaigns: Campaign[]): Promise<void> {
  if (!userEmail || !isSupabaseConfigured() || !Array.isArray(campaigns)) return;
  const cleanEmail = userEmail.trim().toLowerCase();

  try {
    const sanitized = campaigns.slice(0, 50).map((c) => ({
      id: c.id,
      name: c.name,
      user_email: cleanEmail,
      subject: c.subject,
      preview_text: c.preview_text || '',
      sender_name: c.sender_name,
      reply_to: c.reply_to,
      template_id: c.template_id || null,
      list_id: c.list_id || null,
      body_html: c.body_html || '',
      status: c.status,
      speed_preset: c.speed_preset,
      emails_per_minute: c.emails_per_minute || 50,
      total_recipients: c.total_recipients || 0,
      sent_count: c.sent_count || 0,
      failed_count: c.failed_count || 0,
      open_count: c.open_count || 0,
      click_count: c.click_count || 0,
      bounced_count: c.bounced_count || 0,
      unsubscribed_count: c.unsubscribed_count || 0,
      scheduled_at: c.scheduled_at,
      schedule_type: c.schedule_type,
      recurrence_pattern: c.recurrence_pattern,
      recurrence_interval_hours: c.recurrence_interval_hours,
      next_run_at: c.next_run_at,
      last_executed_at: c.last_executed_at,
      execution_count: c.execution_count,
      auto_retry_failed: c.auto_retry_failed,
      created_at: c.created_at,
    }));

    await supabase
      .from('profiles')
      .update({ email_signature: JSON.stringify(sanitized) })
      .eq('email', cleanEmail);
  } catch (err) {
    console.error('Error saving campaigns to DB:', err);
  }
}

export async function getAllScheduledCampaignsFromDb(): Promise<Campaign[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, email_signature');

    if (error || !Array.isArray(data)) return [];

    const allScheduled: Campaign[] = [];
    for (const row of data) {
      if (row.email && row.email_signature) {
        try {
          const parsed = JSON.parse(row.email_signature);
          const list: Campaign[] = Array.isArray(parsed) ? parsed : (parsed?.campaigns || []);
          if (Array.isArray(list) && list.length > 0) {
            // Sync into memory store
            const { localStore } = await import('@/lib/storage');
            localStore.syncUserCampaigns(row.email, list);
            for (const c of list) {
              if (c && c.status === 'scheduled') {
                allScheduled.push(c);
              }
            }
          }
        } catch {}
      }
    }
    return allScheduled;
  } catch (err) {
    console.error('Failed to sync scheduled campaigns from DB:', err);
    return [];
  }
}

export async function getCampaignByIdFromDb(id: string): Promise<Campaign | null> {
  if (!id || !isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, email_signature');

    if (error || !Array.isArray(data)) return null;

    for (const row of data) {
      if (row.email && row.email_signature) {
        try {
          const parsed = JSON.parse(row.email_signature);
          const list: Campaign[] = Array.isArray(parsed) ? parsed : (parsed?.campaigns || []);
          const match = list.find((c) => c && c.id === id);
          if (match) {
            const { localStore } = await import('@/lib/storage');
            localStore.syncUserCampaigns(row.email, list);
            return match;
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error(`Failed to find campaign ${id} in DB:`, err);
  }
  return null;
}
