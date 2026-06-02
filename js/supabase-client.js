// ============================================================
// KomTek Supabase Client Configuration
// ============================================================
// Get these from: https://supabase.com/dashboard
// → your project → Settings → API

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// EmailJS configuration (optional — for sending confirmation emails)
// Get from: https://www.emailjs.com → Account → API Keys
const EMAILJS_SERVICE_ID = 'YOUR_EMAILJS_SERVICE_ID';
const EMAILJS_TEMPLATE_CONFIRMATION = 'YOUR_EMAILJS_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY';

// Initialise Supabase client
// The Supabase CDN script must be loaded before this file
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
