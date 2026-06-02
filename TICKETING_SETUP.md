# KomTek Ticketing System — Setup Guide

Complete setup takes approximately 20 minutes.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account (or log in).
2. Click **New Project**.
3. Organisation: your org (or create a personal one).
4. Project Name: `komtek-tickets`
5. Database Password: generate a strong password and save it securely (you won't need it directly in the code).
6. Region: `West Europe (Netherlands)` for lowest UK latency.
7. Click **Create new project** and wait ~2 minutes for provisioning.

---

## 2. Run the Database Schema

1. In your Supabase project dashboard, click **SQL Editor** in the left sidebar.
2. Click **+ New query**.
3. Open the file `supabase-schema.sql` from this repo.
4. Copy the entire contents and paste into the SQL Editor.
5. Click **Run** (or press Ctrl/Cmd + Enter).
6. You should see "Success. No rows returned" — this means all tables, policies, functions and indexes were created.

If you see an error about existing objects, that's fine — the script uses `IF NOT EXISTS` and `CREATE OR REPLACE` throughout.

---

## 3. Get Your API Credentials

1. In Supabase, click **Settings** (gear icon) in the left sidebar.
2. Click **API**.
3. Copy the following two values:
   - **Project URL** — looks like `https://xxxxxxxxxxx.supabase.co`
   - **anon / public key** — the long JWT token under "Project API keys"

4. Open `js/supabase-client.js` in this repo and replace the placeholders:

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxx.supabase.co';   // paste here
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1N...';          // paste here
```

> **Security note:** The `anon` key is safe to include in frontend code. It is designed for this purpose. Row Level Security (RLS) policies control what unauthenticated vs. authenticated users can actually access.

---

## 4. Create Admin User — Kamran

1. In Supabase, click **Authentication** in the left sidebar.
2. Click the **Users** tab.
3. Click **Invite user** (top right).
4. Enter `kamran@komtek.co.uk` and click **Send invitation**.
5. Kamran will receive an email — he clicks the link, sets a password, and his account is created.
6. After he's signed up, go back to **SQL Editor** and run:

```sql
UPDATE profiles
SET role = 'admin', full_name = 'Kamran Naderi'
WHERE email = 'kamran@komtek.co.uk';
```

This makes Kamran an admin so he can access the Users page in the portal.

---

## 5. Create Second User — Farhad

Repeat the invite process:

1. **Authentication → Users → Invite user**
2. Enter `farhad@komtek.co.uk`
3. After Farhad signs up via his email, run:

```sql
UPDATE profiles
SET full_name = 'Farhad Ghareh Daghi'
WHERE email = 'farhad@komtek.co.uk';
```

Farhad's default role is `agent`, which is correct. He can be promoted to `admin` later from the Users page in the portal (once Kamran is an admin).

---

## 6. Test the Ticketing System

1. Open `support.html` in your browser.
2. Select a category and fill in the form with test data.
3. Click **Submit Ticket**.
4. You should see a success panel with a ticket number like `KT-2026-00001`.
5. Go to `my-ticket.html`, enter the email and ticket number, and click **Track Ticket**.
6. You should see your ticket details and status.

---

## 7. Test the Staff Portal

1. Open `portal/index.html`.
2. Log in with Kamran's email and password.
3. You should be redirected to `portal/dashboard.html`.
4. The dashboard shows ticket stats and a table of all tickets.
5. Click **View** on a ticket to open `portal/ticket.html`.
6. Try updating the status, priority, assignment, and adding a note.

---

## 8. Set Up Email Confirmation Notifications (Optional)

The system gracefully skips email confirmation if EmailJS is not configured — tickets still work fine without it.

To enable email confirmations when a ticket is submitted:

1. Create a free account at [https://www.emailjs.com](https://www.emailjs.com).
2. Go to **Email Services** → **Add New Service** → connect your email (Gmail, Outlook, etc.).
3. Go to **Email Templates** → **Create New Template**.
4. Template variables to use: `{{to_email}}`, `{{to_name}}`, `{{ticket_number}}`, `{{company}}`, `{{subject}}`, `{{category}}`
5. Go to **Account** → copy your **Public Key**.
6. In `js/supabase-client.js`, fill in:

```javascript
const EMAILJS_SERVICE_ID = 'service_xxxxxxx';
const EMAILJS_TEMPLATE_CONFIRMATION = 'template_xxxxxxx';
const EMAILJS_PUBLIC_KEY = 'xxxxxxxxxxxx';
```

7. Add the EmailJS CDN script to `support.html` (before the other scripts):
```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
```

---

## 9. Deploy

This is a static site — just push to GitHub and your existing CI/CD (GitHub Actions → IONOS) handles deployment:

```bash
git add -A
git commit -m "Add complete ticketing system with Supabase backend and staff portal"
git push origin master
```

After deploying, test all pages on the live site (not just localhost) to confirm Supabase connections work correctly with production URLs.

---

## File Reference

| File | Purpose |
|------|---------|
| `support.html` | Public ticket submission form |
| `my-ticket.html` | Client ticket tracker (email + ticket number) |
| `portal/index.html` | Staff login page |
| `portal/dashboard.html` | Admin dashboard — all tickets, stats, filters |
| `portal/ticket.html` | Individual ticket view and management |
| `portal/users.html` | User/agent management (admin only) |
| `js/supabase-client.js` | Supabase SDK init + config placeholders |
| `js/support-ticket.js` | Ticket form submission logic |
| `js/my-ticket.js` | Client ticket lookup logic |
| `js/portal-auth.js` | Auth guard for portal pages |
| `js/portal-dashboard.js` | Dashboard data and table logic |
| `js/portal-ticket.js` | Ticket detail view and update logic |
| `js/portal-users.js` | User management logic |
| `supabase-schema.sql` | Full database schema to run in Supabase |

---

## Troubleshooting

**"Unable to connect to our ticketing system"** on the submission form
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correctly filled in `js/supabase-client.js`.
- Check that you've run the schema SQL (step 2).
- Check the browser console for the specific Supabase error.

**Portal login says "Invalid login"**
- The user must have accepted their invite and set a password before they can log in.
- Passwords set via Supabase's invite link are not the same as the database password from step 1.

**Ticket lookup returns "No ticket found"**
- Ensure both email and ticket number exactly match what was used when submitting.
- Ticket numbers are case-insensitive (KT-2026-00001 = kt-2026-00001).
- If the RPC functions weren't created, re-run the schema SQL.

**Users page is inaccessible or redirects to dashboard**
- The Users page is admin-only. The logged-in user must have `role = 'admin'` in the `profiles` table.
- Run the SQL from step 4 to make Kamran an admin.
