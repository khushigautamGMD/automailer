export type ContactStatus = 'active' | 'unsubscribed' | 'bounced';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'cancelled';
export type SpeedPreset = 'very_slow' | 'slow' | 'medium' | 'fast' | 'custom';
export type LogStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked';

export interface SmtpAccount {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  active: boolean;
}

export type PlanTier = 'demo' | 'pro' | 'agency' | 'lifetime';

export interface UserProfile {
  id: string;
  email: string;
  plan?: PlanTier;
  emails_sent_this_month?: number;
  full_name?: string;
  company_name?: string;
  sender_name?: string;
  reply_to_email?: string;
  resend_api_key?: string;
  gmail_client_id?: string;
  gmail_client_secret?: string;
  gmail_refresh_token?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_accounts?: SmtpAccount[];
  enable_rotation?: boolean;
  default_rate_limit?: number;
  email_signature?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContactList {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  total_contacts: number;
  created_at: string;
  updated_at?: string;
}

export interface Contact {
  id: string;
  list_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  custom_fields?: Record<string, string>;
  status: ContactStatus;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  preview_text?: string;
  body_html: string;
  category: string;
  variables: string[];
  created_at: string;
  updated_at?: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  preview_text?: string;
  sender_name: string;
  reply_to: string;
  template_id?: string;
  list_id?: string;
  body_html: string;
  status: CampaignStatus;
  speed_preset: SpeedPreset;
  emails_per_minute: number;
  scheduled_at?: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  open_count: number;
  click_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  created_at: string;
  updated_at?: string;
}

export interface EmailLog {
  id: string;
  campaign_id: string;
  recipient_email: string;
  recipient_name?: string;
  sender_used?: string;
  status: LogStatus;
  retry_count: number;
  error_message?: string;
  variables?: Record<string, string>;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  created_at: string;
}

export interface ParsedCsvRow {
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  phone?: string;
  [key: string]: string | undefined;
}

export interface CsvValidationResult {
  valid: ParsedCsvRow[];
  duplicates: ParsedCsvRow[];
  invalid: { row: ParsedCsvRow; reason: string }[];
  headers: string[];
  totalParsed: number;
}

export interface SpamAnalysisResult {
  score: number; // 0 to 100
  rating: 'Excellent' | 'Good' | 'Moderate Risk' | 'High Spam Risk';
  detectedWords: { word: string; category: string; suggestion: string }[];
}
