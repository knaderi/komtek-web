// ============================================================
// KomTek Supabase Client Configuration
// ============================================================
// Get these from: https://supabase.com/dashboard
// → your project → Settings → API

const SUPABASE_URL = 'https://vcjvognrziaaedvrdvwv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjanZvZ25yemlhYWVkdnJkdnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjMwNTcsImV4cCI6MjA5NTk5OTA1N30.SFwABWuwqvsiAo5Mf3JPAqAGMTSKMUVDAf_p0CAqiF8';

// EmailJS configuration (optional — for sending confirmation emails)
// Get from: https://www.emailjs.com → Account → API Keys
const EMAILJS_SERVICE_ID = 'YOUR_EMAILJS_SERVICE_ID';
const EMAILJS_TEMPLATE_CONFIRMATION = 'YOUR_EMAILJS_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';

// Initialise Supabase client
// The Supabase CDN script must be loaded before this file
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
