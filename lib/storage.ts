import fs from 'fs';
import path from 'path';
import { Campaign, ContactList, Contact, EmailTemplate, EmailLog, UserProfile, SmtpAccount } from '@/types';

const DEFAULT_SMTP_ACCOUNTS: SmtpAccount[] = [];

// Clean initial production profile state
const DEFAULT_PROFILE: UserProfile = {
  id: 'usr-1',
  email: '',
  plan: 'demo',
  emails_sent_this_month: 0,
  full_name: '',
  company_name: '',
  sender_name: '',
  reply_to_email: '',
  resend_api_key: '',
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  smtp_accounts: DEFAULT_SMTP_ACCOUNTS,
  enable_rotation: true,
  default_rate_limit: 50,
  email_signature: '',
};

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-affiliate-review',
    name: 'Product Review & Feature Breakdown',
    subject: 'Honest Breakdown: Is {{company}} missing out on this tool?',
    preview_text: 'Complete breakdown and live feature overview inside',
    category: 'Product Outreach',
    variables: ['firstname', 'lastname', 'company', 'email'],
    created_at: new Date().toISOString(),
    body_html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase;">Software Review</span>
    <h2 style="color: #0f172a; font-size: 24px; font-weight: 800; margin-top: 16px;">Hello {{firstname}},</h2>
    <p style="font-size: 15px; color: #64748b;">Here is our overview for team members at <strong>{{company}}</strong>.</p>
  </div>

  <div style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
    <p>If you have been looking for an automated system to scale operations at <strong>{{company}}</strong>, this tool is a game changer.</p>
    
    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 0 12px 12px 0;">
      <h3 style="margin-top: 0; color: #2563eb; font-size: 18px;">🔥 Why This Tool Beats The Competition</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>⚡ 10x Faster Workflow Execution</li>
        <li>⚡ Automated Lead Nurturing & Instant Follow-ups</li>
        <li>⚡ Zero Technical Setup Required</li>
      </ul>
    </div>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://yourlink.com" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 700; display: inline-block;">
      👉 Read Full Overview & Get Access
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
  <p style="font-size: 13px; color: #94a3b8; text-align: center;">Automated Outreach • Sent to {{email}}</p>
</div>`,
  },
  {
    id: 'tpl-digital-product-personalized',
    name: 'Personalized Product Launch & Recipient Details',
    subject: 'Exclusive Access & Recipient Details for {{firstname}} {{lastname}} at {{company}}',
    preview_text: 'Your personalized product access and details',
    category: 'Product Sales',
    variables: ['firstname', 'lastname', 'company', 'email', 'phone'],
    created_at: new Date().toISOString(),
    body_html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
  
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase;">Exclusive Release</span>
    <h2 style="color: #0f172a; font-size: 24px; font-weight: 800; margin-top: 16px; margin-bottom: 8px;">Hello {{firstname}} {{lastname}},</h2>
  </div>

  <div style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
    <p>We are thrilled to present our flagship solution customized specifically for you and your team at <strong>{{company}}</strong>!</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h4 style="margin-top: 0; color: #0f172a; font-size: 15px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">👤 Recipient Profile Details</h4>
      
      <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; font-weight: 600; color: #64748b; width: 140px;">Full Name:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">{{firstname}} {{lastname}}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 600; color: #64748b;">Company:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">{{company}}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 600; color: #64748b;">Registered Email:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #2563eb;">{{email}}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-weight: 600; color: #64748b;">Contact Phone:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">{{phone}}</td>
        </tr>
      </table>
    </div>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://yourproductlink.com" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 700; display: inline-block;">
      👉 Access Solution Now
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
  <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
    Sent to {{email}} • Unsubscribe by replying to this email.
  </p>
</div>`,
  },
];

const DEFAULT_LISTS: ContactList[] = [];
const DEFAULT_CONTACTS: Contact[] = [];
const DEFAULT_CAMPAIGNS: Campaign[] = [];

function getDataFilePath(): string {
  try {
    // On Vercel / AWS Lambda serverless functions, /tmp is the only writable filesystem directory
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return path.join('/tmp', 'automailer-store.json');
    }
    const cwd = process.cwd();
    // 1. If running inside automailer-main folder
    if (fs.existsSync(path.join(cwd, 'package.json'))) {
      return path.join(cwd, 'data', 'store.json');
    }
    // 2. If running from parent directory
    if (fs.existsSync(path.join(cwd, 'automailer-main', 'package.json'))) {
      return path.join(cwd, 'automailer-main', 'data', 'store.json');
    }
    return path.join(cwd, 'data', 'store.json');
  } catch {
    return path.join(process.cwd(), 'data', 'store.json');
  }
}

interface GlobalStoreState {
  profile: UserProfile;
  profiles: Record<string, UserProfile>;
  templates: EmailTemplate[];
  lists: ContactList[];
  contacts: Contact[];
  campaigns: Campaign[];
  logs: EmailLog[];
}

function loadFromDisk(): GlobalStoreState {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw && raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        return {
          profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
          profiles: parsed.profiles || {},
          templates: parsed.templates || DEFAULT_TEMPLATES,
          lists: parsed.lists || DEFAULT_LISTS,
          contacts: parsed.contacts || DEFAULT_CONTACTS,
          campaigns: parsed.campaigns || DEFAULT_CAMPAIGNS,
          logs: parsed.logs || [],
        };
      }
    }
  } catch (err) {
    console.error('[storage] Failed to load data from disk:', err);
  }
  return {
    profile: { ...DEFAULT_PROFILE },
    profiles: {},
    templates: [...DEFAULT_TEMPLATES],
    lists: [...DEFAULT_LISTS],
    contacts: [...DEFAULT_CONTACTS],
    campaigns: [...DEFAULT_CAMPAIGNS],
    logs: [],
  };
}

let globalStore: GlobalStoreState = loadFromDisk();

function saveToDisk(store: GlobalStoreState) {
  try {
    const filePath = getDataFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[storage] Failed to save data to disk:', err);
  }
}

function syncFromDisk() {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw && raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        if (parsed.profile) {
          globalStore.profile = { ...DEFAULT_PROFILE, ...parsed.profile };
        }
        if (parsed.profiles) {
          globalStore.profiles = parsed.profiles;
        }
        if (parsed.templates) globalStore.templates = parsed.templates;
        if (parsed.lists) globalStore.lists = parsed.lists;
        if (parsed.contacts) globalStore.contacts = parsed.contacts;
        if (parsed.campaigns) globalStore.campaigns = parsed.campaigns;
        if (parsed.logs) globalStore.logs = parsed.logs;
      }
    }
  } catch {}
}

export const localStore = {
  getProfile: (email?: string) => {
    syncFromDisk();
    if (email && email.trim()) {
      const key = email.trim().toLowerCase();
      if (!globalStore.profiles) globalStore.profiles = {};
      if (globalStore.profiles[key]) {
        return { ...DEFAULT_PROFILE, ...globalStore.profiles[key] };
      }
    }
    return globalStore.profile;
  },
  updateProfile: (updated: Partial<UserProfile>, email?: string) => {
    syncFromDisk();
    const userEmail = (email || updated.email || globalStore.profile.email || '').trim().toLowerCase();
    if (!globalStore.profiles) globalStore.profiles = {};
    if (userEmail) {
      globalStore.profiles[userEmail] = {
        ...(globalStore.profiles[userEmail] || DEFAULT_PROFILE),
        ...updated,
        email: userEmail,
      };
    }
    globalStore.profile = { ...globalStore.profile, ...updated };
    saveToDisk(globalStore);
    return userEmail && globalStore.profiles[userEmail] ? globalStore.profiles[userEmail] : globalStore.profile;
  },
  incrementEmailsSent: (count: number = 1) => {
    syncFromDisk();
    const current = globalStore.profile.emails_sent_this_month || 0;
    globalStore.profile.emails_sent_this_month = current + count;
    saveToDisk(globalStore);
    return globalStore.profile.emails_sent_this_month;
  },

  getTemplates: () => {
    syncFromDisk();
    return globalStore.templates;
  },
  addTemplate: (tpl: Omit<EmailTemplate, 'id' | 'created_at'>) => {
    syncFromDisk();
    const newTpl: EmailTemplate = {
      ...tpl,
      id: `tpl-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    globalStore.templates.unshift(newTpl);
    saveToDisk(globalStore);
    return newTpl;
  },
  deleteTemplate: (id: string) => {
    syncFromDisk();
    globalStore.templates = globalStore.templates.filter((t) => t.id !== id);
    saveToDisk(globalStore);
  },

  getLists: () => {
    syncFromDisk();
    return globalStore.lists;
  },
  addList: (list: { name: string; description?: string; tags?: string[] }) => {
    syncFromDisk();
    const newList: ContactList = {
      id: `lst-${Date.now()}`,
      name: list.name,
      description: list.description,
      tags: list.tags || [],
      total_contacts: 0,
      created_at: new Date().toISOString(),
    };
    globalStore.lists.unshift(newList);
    saveToDisk(globalStore);
    return newList;
  },
  deleteList: (id: string) => {
    syncFromDisk();
    globalStore.lists = globalStore.lists.filter((l) => l.id !== id);
    globalStore.contacts = globalStore.contacts.filter((c) => c.list_id !== id);
    saveToDisk(globalStore);
  },

  getContacts: (listId?: string) => {
    syncFromDisk();
    if (!listId || listId === 'all') return globalStore.contacts;
    return globalStore.contacts.filter((c) => c.list_id === listId);
  },
  addContacts: (listId: string, newContacts: Omit<Contact, 'id' | 'list_id' | 'created_at'>[]) => {
    syncFromDisk();
    const created = newContacts.map((c, idx) => ({
      ...c,
      id: `cnt-${Date.now()}-${idx}`,
      list_id: listId,
      created_at: new Date().toISOString(),
    }));
    globalStore.contacts = [...created, ...globalStore.contacts];
    // Update list count
    const list = globalStore.lists.find((l) => l.id === listId);
    if (list) {
      list.total_contacts = (list.total_contacts || 0) + created.length;
    }
    saveToDisk(globalStore);
    return created;
  },
  deleteContact: (id: string) => {
    syncFromDisk();
    const contact = globalStore.contacts.find((c) => c.id === id);
    if (contact) {
      globalStore.contacts = globalStore.contacts.filter((c) => c.id !== id);
      const list = globalStore.lists.find((l) => l.id === contact.list_id);
      if (list && list.total_contacts > 0) {
        list.total_contacts -= 1;
      }
      saveToDisk(globalStore);
    }
  },

  getCampaigns: () => {
    syncFromDisk();
    return globalStore.campaigns;
  },
  getCampaign: (id: string) => {
    syncFromDisk();
    return globalStore.campaigns.find((c) => c.id === id);
  },
  addCampaign: (campaign: Omit<Campaign, 'id' | 'created_at' | 'sent_count' | 'failed_count' | 'open_count' | 'click_count' | 'bounced_count' | 'unsubscribed_count'>) => {
    syncFromDisk();
    const newCmp: Campaign = {
      ...campaign,
      id: `cmp-${Date.now()}`,
      created_at: new Date().toISOString(),
      sent_count: 0,
      failed_count: 0,
      open_count: 0,
      click_count: 0,
      bounced_count: 0,
      unsubscribed_count: 0,
    };
    globalStore.campaigns.unshift(newCmp);
    saveToDisk(globalStore);
    return newCmp;
  },
  updateCampaign: (id: string, updates: Partial<Campaign>) => {
    syncFromDisk();
    const idx = globalStore.campaigns.findIndex((c) => c.id === id);
    if (idx !== -1) {
      globalStore.campaigns[idx] = { ...globalStore.campaigns[idx], ...updates };
      saveToDisk(globalStore);
      return globalStore.campaigns[idx];
    }
    return null;
  },
  deleteCampaign: (id: string) => {
    syncFromDisk();
    globalStore.campaigns = globalStore.campaigns.filter((c) => c.id !== id);
    globalStore.logs = globalStore.logs.filter((l) => l.campaign_id !== id);
    saveToDisk(globalStore);
  },

  getLogs: (campaignId: string) => {
    syncFromDisk();
    return globalStore.logs.filter((l) => l.campaign_id === campaignId);
  },
  addLog: (log: Omit<EmailLog, 'id' | 'created_at'>) => {
    syncFromDisk();
    const newLog: EmailLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    globalStore.logs.unshift(newLog);
    saveToDisk(globalStore);
    return newLog;
  },
};
