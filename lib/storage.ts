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

// In-Memory Global Store for local development runtime
let globalStore = {
  profile: DEFAULT_PROFILE,
  templates: DEFAULT_TEMPLATES,
  lists: DEFAULT_LISTS,
  contacts: DEFAULT_CONTACTS,
  campaigns: DEFAULT_CAMPAIGNS,
  logs: [] as EmailLog[],
};

export const localStore = {
  getProfile: () => globalStore.profile,
  updateProfile: (updated: Partial<UserProfile>) => {
    globalStore.profile = { ...globalStore.profile, ...updated };
    return globalStore.profile;
  },
  incrementEmailsSent: (count: number = 1) => {
    const current = globalStore.profile.emails_sent_this_month || 0;
    globalStore.profile.emails_sent_this_month = current + count;
    return globalStore.profile.emails_sent_this_month;
  },

  getTemplates: () => globalStore.templates,
  addTemplate: (tpl: Omit<EmailTemplate, 'id' | 'created_at'>) => {
    const newTpl: EmailTemplate = {
      ...tpl,
      id: `tpl-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    globalStore.templates.unshift(newTpl);
    return newTpl;
  },
  deleteTemplate: (id: string) => {
    globalStore.templates = globalStore.templates.filter((t) => t.id !== id);
  },

  getLists: () => globalStore.lists,
  addList: (list: { name: string; description?: string; tags?: string[] }) => {
    const newList: ContactList = {
      id: `lst-${Date.now()}`,
      name: list.name,
      description: list.description,
      tags: list.tags || [],
      total_contacts: 0,
      created_at: new Date().toISOString(),
    };
    globalStore.lists.unshift(newList);
    return newList;
  },
  deleteList: (id: string) => {
    globalStore.lists = globalStore.lists.filter((l) => l.id !== id);
    globalStore.contacts = globalStore.contacts.filter((c) => c.list_id !== id);
  },

  getContacts: (listId?: string) => {
    if (!listId || listId === 'all') return globalStore.contacts;
    return globalStore.contacts.filter((c) => c.list_id === listId);
  },
  addContacts: (listId: string, newContacts: Omit<Contact, 'id' | 'list_id' | 'created_at'>[]) => {
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
    return created;
  },
  deleteContact: (id: string) => {
    const contact = globalStore.contacts.find((c) => c.id === id);
    if (contact) {
      globalStore.contacts = globalStore.contacts.filter((c) => c.id !== id);
      const list = globalStore.lists.find((l) => l.id === contact.list_id);
      if (list && list.total_contacts > 0) {
        list.total_contacts -= 1;
      }
    }
  },

  getCampaigns: () => globalStore.campaigns,
  getCampaign: (id: string) => globalStore.campaigns.find((c) => c.id === id),
  addCampaign: (campaign: Omit<Campaign, 'id' | 'created_at' | 'sent_count' | 'failed_count' | 'open_count' | 'click_count' | 'bounced_count' | 'unsubscribed_count'>) => {
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
    return newCmp;
  },
  updateCampaign: (id: string, updates: Partial<Campaign>) => {
    const idx = globalStore.campaigns.findIndex((c) => c.id === id);
    if (idx !== -1) {
      globalStore.campaigns[idx] = { ...globalStore.campaigns[idx], ...updates };
      return globalStore.campaigns[idx];
    }
    return null;
  },
  deleteCampaign: (id: string) => {
    globalStore.campaigns = globalStore.campaigns.filter((c) => c.id !== id);
    globalStore.logs = globalStore.logs.filter((l) => l.campaign_id !== id);
  },

  getLogs: (campaignId: string) => globalStore.logs.filter((l) => l.campaign_id === campaignId),
  addLog: (log: Omit<EmailLog, 'id' | 'created_at'>) => {
    const newLog: EmailLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    globalStore.logs.unshift(newLog);
    return newLog;
  },
};

