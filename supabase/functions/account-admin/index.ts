// Admin Edge Function for resetting/deleting demo runtime tables after
// verifying the caller's Supabase auth session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Missing server configuration.", { status: 500, headers: corsHeaders });
  }

  if (!token) {
    return new Response("Missing auth token.", { status: 401, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return new Response("Invalid session.", { status: 401, headers: corsHeaders });
  }

  const userId = userData.user.id;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  if (action === "reset") {
    await admin.from("demo_transactions").delete().neq("id", "");
    await admin.from("demo_profiles").delete().neq("user_id", "");
    await admin.from("demo_accounts").delete().neq("user_id", "");
    await admin.from("demo_users").delete().neq("id", "");
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "delete") {
    await admin.from("demo_transactions").delete().neq("id", "");
    await admin.from("demo_profiles").delete().neq("user_id", "");
    await admin.from("demo_accounts").delete().neq("user_id", "");
    await admin.from("demo_users").delete().neq("id", "");
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response("Unknown action.", { status: 400, headers: corsHeaders });
});
