-- Automailer Production Database Schema (Supabase / PostgreSQL)

-- 1. Users Profile Table
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company_name TEXT,
    sender_name TEXT,
    reply_to_email TEXT,
    plan_type TEXT DEFAULT 'pro', -- 'pro', 'agency', 'lifetime'
    plan_status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    monthly_email_limit INTEGER DEFAULT 50000,
    max_sender_accounts INTEGER DEFAULT 5,
    resend_api_key TEXT,
    gmail_client_id TEXT,
    gmail_client_secret TEXT,
    gmail_refresh_token TEXT,
    default_rate_limit INTEGER DEFAULT 25,
    email_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Contact Lists Table
CREATE TABLE IF NOT EXISTS public.contact_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    total_contacts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES public.contact_lists(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    company TEXT,
    phone TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_email_per_list UNIQUE(list_id, email)
);

-- 4. Email Templates Table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    preview_text TEXT,
    body_html TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    variables TEXT[] DEFAULT ARRAY['firstname', 'lastname', 'company', 'email'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    preview_text TEXT,
    sender_name TEXT NOT NULL,
    reply_to TEXT NOT NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    list_id UUID REFERENCES public.contact_lists(id) ON DELETE SET NULL,
    body_html TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'paused', 'completed', 'cancelled')),
    speed_preset TEXT DEFAULT 'medium' CHECK (speed_preset IN ('very_slow', 'slow', 'medium', 'fast', 'custom')),
    emails_per_minute INTEGER DEFAULT 50,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Email Logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    variables JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_contacts_list_id ON public.contacts(list_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id ON public.email_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- Seed initial default sample templates
INSERT INTO public.email_templates (id, name, subject, preview_text, body_html, category, variables)
VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'Welcome & Onboarding',
    'Welcome to {{company}}, {{firstname}}!',
    'Getting started with your new account',
    '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;"><h2 style="color: #2563eb;">Hello {{firstname}},</h2><p>Thank you for connecting with <strong>{{company}}</strong>. We are thrilled to have you on board!</p><p>If you have any questions, feel free to reply directly to this email.</p><br/><p>Best regards,<br/>GrowMore Digitally Team</p></div>',
    'Onboarding',
    ARRAY['firstname', 'lastname', 'company', 'email']
),
(
    '22222222-2222-2222-2222-222222222222',
    'Product Announcement',
    'Exclusive Update for {{company}}',
    'Check out our new features',
    '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;"><h2 style="color: #059669;">Hi {{firstname}},</h2><p>We just launched exciting new tools tailored for teams at <strong>{{company}}</strong>.</p><p style="text-align: center; margin: 30px 0;"><a href="#" style="background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Explore New Features</a></p><p>Cheers,<br/>Product Team</p></div>',
    'Marketing',
    ARRAY['firstname', 'lastname', 'company', 'email']
)
ON CONFLICT (id) DO NOTHING;
