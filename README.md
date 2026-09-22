# Automailer - Production SaaS Bulk Email Campaign Application

Automailer is an Apple-inspired, high-performance **bulk email campaign web application** built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase (PostgreSQL & Auth)**, and **Resend API / Gmail OAuth2**. It enables users to create and dispatch legitimate bulk email campaigns to opted-in contact lists with rate limiting, personalization variables (`{{firstname}}`, `{{company}}`, etc.), CSV parsing & deduplication, and real-time Server-Sent Events (SSE) progress tracking.

---

## Key Features

- ⚡ **Next.js 15 App Router & React**: High performance server and client components.
- 🎨 **Apple-Inspired Glassmorphism Design**: Sleek backdrop blur panels, glowing status badges, and seamless Light/Dark mode toggling.
- 📁 **CSV Upload & Intelligent Validation**: Automatically validates email regex formats, removes duplicates, strips invalid records, and extracts custom field columns before sending.
- ✍️ **Rich Text & HTML Email Editor**: Real-time split-screen code editor and live preview with one-click variable insertion tags (`{{firstname}}`, `{{company}}`, etc.).
- ✉️ **Live Test Email Dispatch**: Send instant test preview emails before launching a campaign.
- ⏱️ **Rate-Controlled Speed Presets**:
  - Very Slow (10 emails/min)
  - Slow (25 emails/min)
  - Medium (50 emails/min)
  - Fast (100 emails/min)
  - Custom user-defined rate limit
- 🔄 **Real-Time Progress Tracking via SSE**: Live progress bar, current queue monitor, Pause, Resume, and Cancel execution controls.
- 📊 **Detailed Campaign Analytics**: Tracks total sent, failed, opened, clicked, bounce rate, and per-recipient audit logs with CSV exporting.
- 🔒 **Resend API & Gmail OAuth2**: Support for Resend transactional email API and secure passwordless Gmail OAuth2 authentication.

---

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Database**: Supabase PostgreSQL & Auth
- **Email Delivery**: Resend API, Gmail OAuth / Nodemailer
- **CSV Processing**: PapaParse with custom deduplication rules
- **Hosting**: Vercel ready

---

## Getting Started

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
RESEND_API_KEY=re_123456789_your_resend_api_key
```

### 3. Database Migration
Run the SQL queries in `supabase/schema.sql` inside your Supabase SQL Editor.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Sample CSV Format

Use `public/sample_contacts.csv` or create your own CSV file with the following header format:

```csv
email,firstname,lastname,company,phone
john.doe@techcorp.com,John,Doe,TechCorp,+1-555-0192
mary.smith@innovate.io,Mary,Smith,Innovate.io,+1-555-0143
alex.jones@globalnet.com,Alex,Jones,GlobalNet,+1-555-0188
```

---

## Deployment on Vercel

The application is pre-configured with `vercel.json`:
1. Push this repository to GitHub.
2. Import project into Vercel.
3. Add environment variables (`RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`).
4. Click **Deploy**.
