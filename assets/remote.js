// assets/remote.js
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase.js";

export async function getSupabaseUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function ensureRemoteUserProfile(profile) {
  const user = await getSupabaseUser();
  if (!user) return null;

  const name = profile?.name || user.email || "User";
  await supabase.from("users").upsert({ id: user.id, name }, { onConflict: "id" });

  const { data: account } = await supabase
    .from("accounts")
    .select("id,balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) {
    await supabase.from("accounts").insert({ user_id: user.id, balance: 250 });
  }

  return user;
}

export async function updateRemoteName(name) {
  const user = await getSupabaseUser();
  if (!user) return;
  await supabase.from("users").upsert({ id: user.id, name }, { onConflict: "id" });
}

export async function fetchBalance(userId) {
  const { data } = await supabase
    .from("accounts")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.balance ?? 0;
}

export async function fetchTransactions(userId, limit = 10) {
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .or(`from_user.eq.${userId},to_user.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function fetchTransactionById(id) {
  const { data } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  return data || null;
}

export async function fetchUsers() {
  const { data } = await supabase.from("users").select("id,name");
  return data || [];
}

export async function fetchUserById(userId) {
  const { data } = await supabase.from("users").select("id,name,created_at").eq("id", userId).maybeSingle();
  return data || null;
}

export async function transferFunds({ senderId, receiverId, amount, reference }) {
  const { error } = await supabase.rpc("transfer_funds", {
    sender: senderId,
    receiver: receiverId,
    amount,
    reference: reference || null
  });
  if (error) throw error;
}

export async function fetchProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  return data || null;
}

export async function upsertProfile({ userId, name, financeCompetency, interests, avatarUrl, helper }) {
  const payload = {
    user_id: userId,
    name: name || "User",
    finance_competency: financeCompetency || null,
    interests: interests || [],
    avatar_url: avatarUrl || "",
    helper: helper || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

export async function callAccountAdmin(action) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/account-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY
    },
    body: JSON.stringify({ action })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json().catch(() => ({}));
}
