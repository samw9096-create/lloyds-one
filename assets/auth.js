import { get, set, del } from "./storage.js";
import { supabase } from "./supabase.js";

const AUTH_KEY = "auth_state";
const PROFILE_KEY_LEGACY = "profile";
const PROFILE_KEY_PREFIX = "profile:";
const FAKE_FRIEND_COUNT = 10;
const FAKE_FRIEND_POOL = [
  "Alex Carter",
  "Jordan Bell",
  "Taylor Brooks",
  "Casey Morgan",
  "Riley Turner",
  "Avery Hayes",
  "Cameron Price",
  "Dylan Foster",
  "Harper Lane",
  "Parker Reed",
  "Quinn Bailey",
  "Jamie Cole",
  "Skyler Grant",
  "Reese Murphy",
  "Blake Ellis",
  "Morgan Shaw",
  "Rowan West",
  "Logan Pierce"
];

function toHandle(name) {
  return `@${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

function makeFakeFriend(name, index) {
  return {
    id: `fake_friend_${index + 1}`,
    name,
    handle: toHandle(name)
  };
}

function pickRandomNames(count) {
  const pool = [...FAKE_FRIEND_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function withSeededFakeFriends(profile) {
  const friends = Array.isArray(profile.friends) ? profile.friends : [];
  const realFriends = friends.filter((f) => !String(f?.id || "").startsWith("fake_friend_"));
  const existingFakeById = new Map(
    friends
      .filter((f) => String(f?.id || "").startsWith("fake_friend_"))
      .map((f) => [f.id, f])
  );

  const chosen = pickRandomNames(FAKE_FRIEND_COUNT);
  const seededFakes = chosen.map((name, index) => existingFakeById.get(`fake_friend_${index + 1}`) || makeFakeFriend(name, index));

  return { ...profile, friends: [...realFriends, ...seededFakes] };
}

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

function profileKeyForUserId(userId) {
  const safeUserId = String(userId || "guest").replace(/[^a-zA-Z0-9:_-]/g, "_");
  return `${PROFILE_KEY_PREFIX}${safeUserId}`;
}

async function resolveProfileKey() {
  const user = await getSessionUser();
  if (user?.id) return profileKeyForUserId(user.id);
  const auth = await get(AUTH_KEY);
  if (auth?.userId) return profileKeyForUserId(auth.userId);
  return profileKeyForUserId("guest");
}

export async function getAuthState() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      return { signedIn: true, method: "password", userId: data.session.user.id };
    }
  } catch {
    // Fall back to locally cached auth state when Supabase is unavailable.
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
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

export async function ensureProfile() {
  const profileKey = await resolveProfileKey();
  const existing = await get(profileKey);
  if (existing) {
    const migrated = withSeededFakeFriends(existing);
    const existingFriends = Array.isArray(existing.friends) ? existing.friends : [];
    const migratedFriends = Array.isArray(migrated.friends) ? migrated.friends : [];
    if (migratedFriends.length !== existingFriends.length) {
      await set(profileKey, migrated);
    }
    return migrated;
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser?.id) {
    const legacy = await get(PROFILE_KEY_LEGACY);
    if (legacy) {
      const migratedLegacy = withSeededFakeFriends(legacy);
      await set(profileKey, migratedLegacy);
      await del(PROFILE_KEY_LEGACY);
      return migratedLegacy;
    }
  }

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
    budgetPots: [],
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

  const seeded = withSeededFakeFriends(profile);
  await set(profileKey, seeded);
  return seeded;
}

export async function updateProfile(patch) {
  const profileKey = await resolveProfileKey();
  const profile = await ensureProfile();
  const next = { ...profile, ...patch, updatedAt: new Date().toISOString() };
  await set(profileKey, next);
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
  const profileKey = await resolveProfileKey();
  await del(AUTH_KEY);
  await del(profileKey);
  await del(PROFILE_KEY_LEGACY);
}
