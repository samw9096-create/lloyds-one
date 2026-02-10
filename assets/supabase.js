// assets/supabase.js
// Client-only Supabase setup (safe to expose anon key).

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://ipxomjjvygcpyhhmwcbt.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_ivfmiTOdIIsk6c-H35MVKQ_xbvn2hPV";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
