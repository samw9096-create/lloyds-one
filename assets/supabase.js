// gemini functions/calls are managed through supabase edge function to ensure API key stays hidden in front end

import { createClient } from "LINK REMOVED FOR SUBMISSION";

export const SUPABASE_URL = "PRIVATE LINK REMOVED FOR SUBMISSION";
export const SUPABASE_ANON_KEY = "PRIVATE KEY REMOVED FOR SUBMISSION";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
