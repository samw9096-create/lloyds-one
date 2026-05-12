// prototype version stores locally in indexeddb, including UI personalisation for speed

import { get, set, del } from "./storage.js";

const AUTH_KEY = "auth_state";
const PROFILE_KEY = "demo_profile";
const DEMO_USER_ID = "demo_user_1";

const DEMO_FRIENDS = [
  { id: "demo_friend_1", name: "Taylor Brooks", handle: "@taylorbrooks" },
  { id: "demo_friend_2", name: "Jordan Bell", handle: "@jordanbell" },
  { id: "demo_friend_3", name: "Avery Hayes", handle: "@averyhayes" },
  { id: "demo_friend_4", name: "Harper Lane", handle: "@harperlane" },
  { id: "demo_friend_5", name: "Morgan Shaw", handle: "@morganshaw" },
  { id: "demo_friend_6", name: "Casey Morgan", handle: "@caseymorgan" },
  { id: "demo_friend_7", name: "Riley Turner", handle: "@rileyturner" },
  { id: "demo_friend_8", name: "Cameron Price", handle: "@cameronprice" },
  { id: "demo_friend_9", name: "Jamie Cole", handle: "@jamiecole" },
  { id: "demo_friend_10", name: "Quinn Bailey", handle: "@quinnbailey" }
];

function seedLocalPrefs(profile) {
  localStorage.setItem("chosenInterests", (profile.interests || []).join(","));
  localStorage.setItem("chosenHelper", profile.helper || "louie");
}

function defaultProfile() {
  return {
    createdAt: new Date().toISOString(),
    onboardingDone: false,
    tutorialDone: false,
    name: "",
    financeCompetency: "",
    interests: [],
    helper: "louie",
    friends: DEMO_FRIENDS,
    friendRequests: [
      { id: "demo_request_1", name: "Skye Patel", handle: "@skyepatel" }
    ],
    friendDirectory: [
      ...DEMO_FRIENDS,
      { id: "demo_friend_11", name: "Skye Patel", handle: "@skyepatel" },
      { id: "demo_friend_12", name: "Logan Pierce", handle: "@loganpierce" }
    ],
    shoppingList: ["Semi-Skimmed Milk", "Spaghetti", "Bananas", "Coffee Pods"],
    quizCompleted: ["q1", "q3", "q4"],
    learningXP: 120,
    learningStreak: 6,
    budgetPots: [
      { id: "pot_rent", name: "Rent", emoji: "🏠", balance: 420, goal: 500 },
      { id: "pot_trip", name: "Summer Trip", emoji: "✈️", balance: 180, goal: 300 },
      { id: "pot_emergency", name: "Emergency", emoji: "🛟", balance: 260, goal: 500 }
    ],
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
      location: true,
      marketing: false,
      statements: "pdf",
      bgTheme: "stars",
      customBg: ""
    },
    locationCoords: { lat: 53.4808, lng: -2.2426 },
    simulatedLedger: { balanceDelta: 0, transactions: [] },
    avatarDataUrl: ""
  };
}

async function ensureDemoAuth() {
  const auth = (await get(AUTH_KEY)) || { signedIn: true, method: "demo", userId: DEMO_USER_ID };
  if (!auth.signedIn) {
    auth.signedIn = true;
    auth.method = "demo";
    auth.userId = DEMO_USER_ID;
  }
  await set(AUTH_KEY, auth);
  return auth;
}

export async function getAuthState() {
  return ensureDemoAuth();
}

export async function signOut() {
  sessionStorage.removeItem("demo_app_unlocked");
  await set(AUTH_KEY, { signedIn: false, method: "demo", userId: DEMO_USER_ID });
}

export async function signUpWithEmail() {
  await ensureDemoAuth();
  return { session: { user: { id: DEMO_USER_ID, email: "demo@one.app" } } };
}

export async function signInWithEmail() {
  await ensureDemoAuth();
  return { session: { user: { id: DEMO_USER_ID, email: "demo@one.app" } } };
}

export async function getSessionUser() {
  const auth = await ensureDemoAuth();
  if (!auth?.signedIn) return null;
  return { id: DEMO_USER_ID, email: "demo@one.app" };
}

export async function ensureProfile() {
  await ensureDemoAuth();
  const existing = await get(PROFILE_KEY);
  if (existing) {
    seedLocalPrefs(existing);
    return existing;
  }
  const profile = defaultProfile();
  seedLocalPrefs(profile);
  await set(PROFILE_KEY, profile);
  return profile;
}

export async function updateProfile(patch) {
  const profile = await ensureProfile();
  const next = { ...profile, ...patch, updatedAt: new Date().toISOString() };
  seedLocalPrefs(next);
  await set(PROFILE_KEY, next);
  return next;
}

export async function getProfile() {
  return ensureProfile();
}

export async function passkeySignUp() {
  await ensureDemoAuth();
  return { ok: true, demo: true };
}

export async function passkeySignIn() {
  await ensureDemoAuth();
  return { ok: true, demo: true };
}

export async function resetLocalApp() {
  sessionStorage.removeItem("demo_app_unlocked");
  await del(PROFILE_KEY);
  await set(AUTH_KEY, { signedIn: true, method: "demo", userId: DEMO_USER_ID });
  localStorage.removeItem("chosenInterests");
  localStorage.removeItem("chosenHelper");
  localStorage.removeItem("dmThreads");
  localStorage.removeItem("dmUnread");
  const profile = defaultProfile();
  seedLocalPrefs(profile);
  await set(PROFILE_KEY, profile);
  return profile;
}
