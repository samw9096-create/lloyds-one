// gemini functions/calls are managed through supabase edge function to ensure API key stays hidden in front end

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const SUPABASE_URL = "https://example.supabase.co";
export const SUPABASE_ANON_KEY = "anon";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
