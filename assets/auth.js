import { get, set, del } from "./storage.js";
import { supabase } from "./supabase.js";

const AUTH_KEY = "auth_state";
const PROFILE_KEY = "profile";

function bufToB64url(buf) {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBuf(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function randomId(prefix = "user") {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}_${[...a].map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

export async function getAuthState() {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) {
    return { signedIn: true, method: "password", userId: data.session.user.id };
  }
  return (await get(AUTH_KEY)) || { signedIn: false };
}

export async function signOut() {
  await supabase.auth.signOut();
  const state = await get(AUTH_KEY);
  if (state) await set(AUTH_KEY, { ...state, signedIn: false });
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function getSessionUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function ensureProfile() {
  const existing = await get(PROFILE_KEY);
  if (existing) return existing;

  const profile = {
    createdAt: new Date().toISOString(),
    onboardingDone: false,
    name: "",
    financeCompetency: "",
    friends: [],
    friendRequests: [],
    friendDirectory: [
      { id: "f_sam", name: "Sam W.", handle: "@samw" },
      { id: "f_dong", name: "Dong L.", handle: "@dongl" },
      { id: "f_navya", name: "Navya K.", handle: "@navya" },
      { id: "f_aisha", name: "Aisha W.", handle: "@aisha" },
      { id: "f_maya", name: "Maya T.", handle: "@maya" }
    ],
    tutorialDone: false,
    shoppingList: [],
    quizCompleted: [],
    learningXP: 0,
    learningStreak: 0,
    settings: {
      textSize: "medium",
      highContrast: false,
      reduceMotion: false,
      largeTargets: false,
      appLock: false,
      autoLock: "5m",
      hideBalances: false,
      notifications: true,
      paymentAlerts: true,
      billReminders: true,
      weeklySummary: true,
      sounds: true,
      haptics: true,
      dataSaver: false,
      location: false,
      marketing: false,
      statements: "pdf",
      bgTheme: "stars",
      customBg: ""
    }
    ,
    avatarDataUrl: ""
  };

  await set(PROFILE_KEY, profile);
  return profile;
}

export async function updateProfile(patch) {
  const profile = await ensureProfile();
  const next = { ...profile, ...patch, updatedAt: new Date().toISOString() };
  await set(PROFILE_KEY, next);
  return next;
}

export async function getProfile() {
  return await ensureProfile();
}

export async function passkeySignUp() {
  const userId = randomId();
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const publicKey = {
    challenge,
    rp: { name: "Lloyds One (Prototype)" },
    user: {
      id: new TextEncoder().encode(userId),
      name: userId,
      displayName: "Local user"
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 }
    ],
    authenticatorSelection: { userVerification: "preferred" },
    timeout: 60000,
    attestation: "none"
  };

  const cred = await navigator.credentials.create({ publicKey });
  const rawId = bufToB64url(cred.rawId);

  await set(AUTH_KEY, { signedIn: true, method: "passkey", userId, credentialId: rawId });
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) {
      await supabase.from("user_passkeys").insert({
        user_id: data.user.id,
        credential_id: rawId
      });
    }
  } catch {
    // optional table; ignore if not present
  }
  await ensureProfile();
  return true;
}

export async function passkeySignIn() {
  const state = await getAuthState();
  if (!state?.credentialId) throw new Error("No local passkey found. Please sign up on this device first.");

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const allowCredentials = [{
    type: "public-key",
    id: new Uint8Array(b64urlToBuf(state.credentialId))
  }];

  const publicKey = {
    challenge,
    allowCredentials,
    userVerification: "preferred",
    timeout: 60000
  };

  await navigator.credentials.get({ publicKey });
  const { data } = await supabase.auth.getSession();
  if (!data?.session?.user) {
    throw new Error("Passkey unlock is available after email login on this device.");
  }
  await set(AUTH_KEY, { ...state, signedIn: true, method: "passkey", userId: data.session.user.id });
  return true;
}

export async function resetLocalApp() {
  await del(AUTH_KEY);
  await del(PROFILE_KEY);
}
