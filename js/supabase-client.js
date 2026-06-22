// ============================================================
// KomTek Supabase Client Configuration
// ============================================================
// Get these from: https://supabase.com/dashboard
// → your project → Settings → API

const SUPABASE_URL = 'https://vcjvognrziaaedvrdvwv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjanZvZ25yemlhYWVkdnJkdnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjMwNTcsImV4cCI6MjA5NTk5OTA1N30.SFwABWuwqvsiAo5Mf3JPAqAGMTSKMUVDAf_p0CAqiF8';

// Initialise Supabase client
// The Supabase CDN script must be loaded before this file
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
