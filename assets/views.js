// assets/views.js
import { go } from "./router.js";
import {
  signUpWithEmail,
  signInWithEmail,
  getProfile,
  updateProfile,
  signOut,
  resetLocalApp
} from "./auth.js";
import {
  getSupabaseUser,
  ensureRemoteUserProfile,
  updateRemoteName,
  fetchBalance,
  updateAccountBalance,
  fetchTransactions,
  fetchUsers,
  fetchUserById,
  fetchTransactionById,
  fetchProfile,
  upsertProfile,
  callAccountAdmin,
  transferFunds
} from "./remote.js";

const STORAGE_KEYS = {
  helper: "chosenHelper",
  interests: "chosenInterests",
  mode: "appMode",
  theme: "appTheme",
  friendReqSeenCount: "friendReqSeenCount",
  insightsHomeCache: "insightsHomeCache",
  insightsActivePeriod: "insightsActivePeriod",
  dmThreads: "dmThreads",
  dmUnread: "dmUnread"
};
const ROUTE_MEMORY_KEYS = {
  current: "routeCurrentPath",
  previous: "routePreviousPath"
};
const BACK_FALLBACKS = {
  "/account": "/home",
  "/friends": "/home",
  "/shopping-list": "/home",
  "/smart-money": "/home",
  "/budget-pots": "/home",
  "/pot-create": "/budget-pots",
  "/pot-detail": "/budget-pots",
  "/pot-house": "/budget-pots",
  "/pot-car": "/budget-pots",
  "/pot-savings": "/budget-pots",
  "/add-money": "/home",
  "/scan-cheque": "/add-money",
  "/add-to-pot": "/budget-pots",
  "/move-from-pot": "/budget-pots",
  "/bill-splitting": "/payments",
  "/insights": "/payments",
  "/transaction": "/home",
  "/money-minutes": "/learn",
  "/quizzes": "/learn",
  "/quiz-video": "/quizzes",
  "/quiz-questions": "/quiz-video",
  "/quiz-summary": "/quizzes"
};
const TOP_LEVEL_NO_BACK = new Set([
  "/splash",
  "/login",
  "/onboarding",
  "/tutorial",
  "/home",
  "/payments",
  "/dms",
  "/learn",
  "/deal-dash",
  "/settings"
]);

const POT_COLORS = ["#bfeeda", "#9fe2ef", "#d9b0e9", "#ffd7b5", "#c6f0ff", "#d6f7c2"];

async function getBudgetPots() {
  const profile = await getProfile();
  return Array.isArray(profile.budgetPots) ? profile.budgetPots : [];
}

async function setBudgetPots(pots) {
  await updateProfile({ budgetPots: pots });
  return pots;
}

function formatMoney(value) {
  return `£${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function getSimulatedLedger() {
  const profile = await getProfile();
  const fallback = { balanceDelta: 0, transactions: [] };
  if (!profile || typeof profile !== "object") return fallback;
  const ledger = profile.simulatedLedger;
  if (!ledger || typeof ledger !== "object") return fallback;
  return {
    balanceDelta: Number(ledger.balanceDelta || 0),
    transactions: Array.isArray(ledger.transactions) ? ledger.transactions : []
  };
}

async function recordSimulatedTransfer({ receiverId, receiverName, amount, reference }) {
  const ledger = await getSimulatedLedger();
  const tx = {
    id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from_user: "local_user",
    to_user: receiverId,
    amount: Number(amount) || 0,
    reference: reference || `Transfer to ${receiverName || "friend"}`,
    created_at: new Date().toISOString(),
    _simulated: true
  };
  const next = {
    balanceDelta: Number(ledger.balanceDelta || 0) - tx.amount,
    transactions: [tx, ...(ledger.transactions || [])].slice(0, 100)
  };
  await updateProfile({ simulatedLedger: next });
  await syncPendingBalanceDelta(null, next);
}

async function applySimulatedBalanceAdjustment(deltaAmount) {
  const delta = Number(deltaAmount) || 0;
  if (!delta) return;
  const ledger = await getSimulatedLedger();
  const next = {
    balanceDelta: Number(ledger.balanceDelta || 0) + delta,
    transactions: Array.isArray(ledger.transactions) ? ledger.transactions : []
  };
  await updateProfile({ simulatedLedger: next });
  await syncPendingBalanceDelta(null, next);
}

async function getAvailableMainAccountBalance() {
  try {
    const ledger = await getSimulatedLedger();
    const profile = await getProfile();
    const user = await ensureRemoteUserProfile(profile);
    if (!user) return Math.max(0, Number(ledger.balanceDelta || 0));
    const remoteBalance = await fetchBalance(user.id);
    return Math.max(0, Number(remoteBalance) + Number(ledger.balanceDelta || 0));
  } catch {
    return 0;
  }
}

function showActionModal({ title = "Notice", message = "", actionText = "OK" } = {}) {
  let overlay = document.querySelector("#actionModalOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "actionModalOverlay";
    overlay.className = "action-modal-overlay";
    overlay.innerHTML = `
      <div class="action-modal-panel" role="dialog" aria-modal="true" aria-live="polite">
        <div class="action-modal-title" id="actionModalTitle"></div>
        <div class="action-modal-message" id="actionModalMessage"></div>
        <button id="actionModalBtn" class="primary-btn action-modal-btn" type="button">OK</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  const titleEl = overlay.querySelector("#actionModalTitle");
  const msgEl = overlay.querySelector("#actionModalMessage");
  const btnEl = overlay.querySelector("#actionModalBtn");
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (btnEl) {
    btnEl.textContent = actionText;
    btnEl.onclick = () => overlay.classList.remove("show");
  }
  overlay.classList.add("show");
}

async function syncPendingBalanceDelta(profileOverride = null, ledgerOverride = null) {
  const ledger = ledgerOverride || await getSimulatedLedger();
  const pendingDelta = Number(ledger.balanceDelta || 0);
  if (!pendingDelta) return { synced: true, ledger };

  try {
    const profile = profileOverride || await getProfile();
    const user = await ensureRemoteUserProfile(profile);
    if (!user) return { synced: false, ledger };

    const remoteBalance = await fetchBalance(user.id);
    const nextBalance = Math.max(0, Number(remoteBalance) + pendingDelta);
    await updateAccountBalance(user.id, nextBalance);

    const clearedLedger = {
      balanceDelta: 0,
      transactions: Array.isArray(ledger.transactions) ? ledger.transactions : []
    };
    await updateProfile({ simulatedLedger: clearedLedger });
    return { synced: true, ledger: clearedLedger };
  } catch {
    return { synced: false, ledger };
  }
}

function showConfirmation(message = "Done") {
  let overlay = document.querySelector("#confirmOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "confirmOverlay";
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-panel">
        <div class="confirm-tick" aria-hidden="true"></div>
        <div class="confirm-message"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const msgEl = overlay.querySelector(".confirm-message");
  if (msgEl) msgEl.textContent = message;

  overlay.classList.add("show");

  setTimeout(() => {
    overlay.classList.remove("show");
    go("/home");
  }, 1000);
}

function showTopNotification(message) {
  let toast = document.querySelector("#topGoalToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "topGoalToast";
    toast.className = "top-goal-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove("show");
  // Restart animation for rapid consecutive completions
  void toast.offsetWidth;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

const SETTINGS_DEFAULTS = {
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
  statements: "pdf"
};

function applySettingsToDOM(settings) {
  const html = document.documentElement;
  const sizeMap = {
    small: "14px",
    medium: "16px",
    large: "18px",
    xlarge: "20px"
  };
  html.style.setProperty("--base-font", sizeMap[settings.textSize] || "16px");
  html.setAttribute("data-contrast", settings.highContrast ? "high" : "normal");
  html.setAttribute("data-motion", settings.reduceMotion ? "reduce" : "normal");
  html.setAttribute("data-tap", settings.largeTargets ? "large" : "normal");
  const theme = settings.bgTheme || localStorage.getItem(STORAGE_KEYS.theme) || "stars";
  html.setAttribute("data-theme", theme);

  if (settings.customBg) {
    document.body.style.backgroundImage = `url(${settings.customBg})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundPosition = "center";
    document.body.setAttribute("data-custom-bg", "true");
  } else {
    document.body.style.backgroundImage = "";
    document.body.style.backgroundSize = "";
    document.body.style.backgroundRepeat = "";
    document.body.style.backgroundPosition = "";
    document.body.removeAttribute("data-custom-bg");
  }
}

function setMode(mode) {
  document.documentElement.setAttribute("data-mode", mode);
  localStorage.setItem(STORAGE_KEYS.mode, mode);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function hydrateTheme() {
  const mode = localStorage.getItem(STORAGE_KEYS.mode) || "light";
  const theme = localStorage.getItem(STORAGE_KEYS.theme) || "stars";
  setMode(mode);
  setTheme(theme);
}

function rememberRoute(path) {
  const current = sessionStorage.getItem(ROUTE_MEMORY_KEYS.current);
  if (current && current !== path) {
    sessionStorage.setItem(ROUTE_MEMORY_KEYS.previous, current);
  }
  sessionStorage.setItem(ROUTE_MEMORY_KEYS.current, path);
}

function backTargetFor(path) {
  if (TOP_LEVEL_NO_BACK.has(path)) return null;
  const previous = sessionStorage.getItem(ROUTE_MEMORY_KEYS.previous);
  if (previous && previous !== path) return previous;
  return BACK_FALLBACKS[path] || "/home";
}

export async function initView(path) {
  rememberRoute(path);
  hydrateTheme();
  const profile = await getProfile();
  applySettingsToDOM({ ...SETTINGS_DEFAULTS, ...(profile.settings || {}) });
  const brand = document.querySelector(".brand");
  const avatar = document.querySelector(".avatar-btn");
  if (brand) brand.onclick = () => go("/home");
  if (avatar) avatar.onclick = () => go("/account");

  const topBar = document.querySelector(".top-bar");
  if (topBar) {
    const backTarget = backTargetFor(path);
    const existingBack = topBar.querySelector(".top-back-btn");
    if (backTarget && !existingBack) {
      const backBtn = document.createElement("button");
      backBtn.className = "top-back-btn";
      backBtn.type = "button";
      backBtn.setAttribute("aria-label", "Back");
      backBtn.innerHTML = "‹";
      backBtn.onclick = () => go(backTarget);
      topBar.prepend(backBtn);
    } else if (!backTarget && existingBack) {
      existingBack.remove();
    }
  }

  if (topBar && avatar && !topBar.querySelector(".friends-btn")) {
    const actions = document.createElement("div");
    actions.className = "top-actions";
    const friendsBtn = document.createElement("button");
    friendsBtn.className = "friends-btn";
    friendsBtn.type = "button";
    friendsBtn.setAttribute("aria-label", "Friends");
    friendsBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.5 12a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm9 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM2 20.5c0-3 3.4-5.5 7.5-5.5S17 17.5 17 20.5v.5H2v-.5Zm14.5.5v-.5c0-1.1-.4-2.1-1.1-3 2.6.4 4.6 2 4.6 4.1v.4h-3.5Z"/>
      </svg>
    `;
    friendsBtn.onclick = () => go("/friends");
    actions.appendChild(friendsBtn);
    actions.appendChild(avatar);
    topBar.appendChild(actions);
  }

  const pendingRequests = Array.isArray(profile.friendRequests) ? profile.friendRequests.length : 0;
  const seenCount = Number(localStorage.getItem(STORAGE_KEYS.friendReqSeenCount) || 0);
  if (pendingRequests > seenCount) {
    const label = pendingRequests === 1 ? "friend request" : "friend requests";
    showTopNotification(`You have ${pendingRequests} new ${label}`);
  }
  localStorage.setItem(STORAGE_KEYS.friendReqSeenCount, String(pendingRequests));

  if (path === "/login") return initLogin();
  if (path === "/splash") return initSplash();
  if (path === "/onboarding") return initOnboarding();
  if (path === "/home") return initHome();
  if (path === "/account") return initAccount();
  if (path === "/friends") return initFriends();
  if (path === "/dms") return initDMs();
  if (path === "/shopping-list") return initShoppingList();
  if (path === "/smart-money") return initSmartMoney();
  if (path === "/tutorial") return initTutorial();
  if (path === "/learn") return initLearn();
  if (path === "/quizzes") return initQuizzes();
  if (path === "/quiz-video") return initQuizVideo();
  if (path === "/quiz-questions") return initQuizQuestions();
  if (path === "/quiz-summary") return initQuizSummary();
  if (path === "/transaction") return initTransaction();
  if (path === "/add-money") return initAddMoney();
  if (path === "/add-to-pot") return initAddToPot();
  if (path === "/scan-cheque") return initScanCheque();
  if (path === "/move-from-pot") return initMoveFromPot();
  if (path === "/payments") return initPayments();
  if (path === "/bill-splitting") return initBillSplitting();
  if (path === "/insights") return initInsights();
  if (path === "/budget-pots") return initBudgetPots();
  if (path === "/pot-create") return initPotCreate();
  if (path === "/pot-detail") return initPotDetail();
  if (path === "/deal-dash") return initDealDash();
  if (path === "/money-minutes") return initMoneyMinutes();
  if (path === "/settings") return initSettings();
}

function initAccount() {
  const nameEl = document.querySelector("#accountName");
  const avatarEl = document.querySelector("#accountAvatar");
  const confidenceEl = document.querySelector("#accountConfidence");
  const emailEl = document.querySelector("#accountEmail");
  const interestsWrap = document.querySelector("#accountInterests");
  const createdEl = document.querySelector("#accountCreated");
  const editBtn = document.querySelector("#editAvatarBtn");
  const removeBtn = document.querySelector("#removeAvatarBtn");
  const fileInput = document.querySelector("#avatarInput");
  const accountSignOut = document.querySelector("#accountSignOutBtn");
  const accountReset = document.querySelector("#accountResetBtn");
  const accountDelete = document.querySelector("#accountDeleteBtn");
  const openFriendsBtn = document.querySelector("#openFriendsBtn");
  const openTutorialBtn = document.querySelector("#openTutorialBtn");

  const interestLabels = {
    films: "🎬 Films/TV",
    music: "🎵 Music",
    days: "☀️ Days out",
    food: "🍴 Food",
    clothing: "👕 Clothing",
    coffee: "☕ Coffee",
    concerts: "🎤 Concerts",
    tech: "💻 Tech",
    gaming: "🎮 Gaming",
    travel: "✈️ Travel"
  };

  const confidenceLabels = {
    beginner: "Beginner with finance",
    comfortable: "Comfortable with finance",
    confident: "Confident with finance",
    expert: "Expert with finance"
  };

  getProfile().then((profile) => {
    if (nameEl) nameEl.textContent = profile.name || "Your name";
    if (confidenceEl) confidenceEl.textContent = confidenceLabels[profile.financeCompetency] || "Finance confidence not set";

    getSupabaseUser().then((user) => {
      if (emailEl) emailEl.textContent = user?.email || "Email not available";
    });

    if (avatarEl) {
      if (profile.avatarDataUrl) {
        avatarEl.style.backgroundImage = `url(${profile.avatarDataUrl})`;
        avatarEl.textContent = "";
        avatarEl.classList.add("has-photo");
      } else {
        avatarEl.style.backgroundImage = "";
        avatarEl.textContent = (profile.name || "?").charAt(0).toUpperCase() || "?";
        avatarEl.classList.remove("has-photo");
      }
    }

    if (interestsWrap) {
      const raw = localStorage.getItem(STORAGE_KEYS.interests) || "";
      const ids = raw.split(",").filter(Boolean);
      interestsWrap.innerHTML = "";
      if (!ids.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No interests saved yet.";
        interestsWrap.appendChild(empty);
      } else {
        ids.forEach((id) => {
          const card = document.createElement("div");
          card.className = "interest-card selected";
          card.textContent = interestLabels[id] || id;
          interestsWrap.appendChild(card);
        });
      }
    }

    if (createdEl) {
      const date = profile.createdAt ? new Date(profile.createdAt) : null;
      createdEl.textContent = date ? date.toLocaleDateString() : "—";
    }
  });

  if (editBtn && fileInput) {
    editBtn.onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result || "");
        await updateProfile({ avatarDataUrl: dataUrl });
        if (avatarEl) {
          avatarEl.style.backgroundImage = `url(${dataUrl})`;
          avatarEl.textContent = "";
          avatarEl.classList.add("has-photo");
        }
        const user = await getSupabaseUser();
        const profile = await getProfile();
        if (user) {
          await upsertProfile({
            userId: user.id,
            name: profile.name,
            financeCompetency: profile.financeCompetency,
            interests: (localStorage.getItem(STORAGE_KEYS.interests) || "").split(",").filter(Boolean),
            avatarUrl: dataUrl,
            helper: localStorage.getItem(STORAGE_KEYS.helper) || ""
          });
        }
      };
      reader.readAsDataURL(file);
      fileInput.value = "";
    };
  }

  if (removeBtn) {
    removeBtn.onclick = async () => {
      await updateProfile({ avatarDataUrl: "" });
      if (avatarEl) {
        avatarEl.style.backgroundImage = "";
        avatarEl.classList.remove("has-photo");
      }
      const profile = await getProfile();
      if (avatarEl) avatarEl.textContent = (profile.name || "?").charAt(0).toUpperCase() || "?";
      const user = await getSupabaseUser();
      if (user) {
        await upsertProfile({
          userId: user.id,
          name: profile.name,
          financeCompetency: profile.financeCompetency,
          interests: (localStorage.getItem(STORAGE_KEYS.interests) || "").split(",").filter(Boolean),
          avatarUrl: "",
          helper: localStorage.getItem(STORAGE_KEYS.helper) || ""
        });
      }
    };
  }

  if (accountSignOut) {
    accountSignOut.onclick = () => {
      signOut().then(() => go("/login"));
    };
  }

  if (accountReset) {
    accountReset.onclick = async () => {
      try {
        await callAccountAdmin("reset");
      } catch (e) {
        alert(e?.message || "Reset failed.");
      }
      await signOut();
      await resetLocalApp();
      go("/splash");
    };
  }

  if (accountDelete) {
    accountDelete.onclick = () => {
      const ok = window.confirm("Delete this account and all local data? This cannot be undone.");
      if (!ok) return;
      callAccountAdmin("delete")
        .then(() => resetLocalApp())
        .then(() => go("/splash"))
        .catch((e) => alert(e?.message || "Delete failed."));
    };
  }

  if (openFriendsBtn) {
    openFriendsBtn.onclick = () => go("/friends");
  }

  if (openTutorialBtn) {
    openTutorialBtn.onclick = () => {
      updateProfile({ tutorialDone: false }).then(() => go("/tutorial"));
    };
  }
}

function initSplash() {
  const enterBtn = document.querySelector("#splashEnterBtn");
  if (enterBtn) {
    enterBtn.onclick = async () => {
      go("/login");
    };
  }

  setTimeout(async () => {
    const auth = await getAuthState();
    if (auth?.signedIn) {
      const profile = await getProfile();
      if (!profile?.onboardingDone) {
        go("/onboarding");
        return;
      }
      go("/home");
      return;
    }
    go("/login");
  }, 1000);
}

async function initLogin() {
  const err = document.querySelector("#loginErr");
  const emailInput = document.querySelector("#loginEmail");
  const passwordInput = document.querySelector("#loginPassword");
  const btnEmailUp = document.querySelector("#btnEmailUp");
  const btnEmailIn = document.querySelector("#btnEmailIn");

  const setError = (message = "") => {
    if (err) err.textContent = message;
  };

  const afterAuth = async () => {
    const profile = await getProfile();
    await ensureRemoteUserProfile(profile);
    const user = await getSupabaseUser();
    if (user) {
      const remoteUser = await fetchUserById(user.id);
      const remoteProfile = await fetchProfile(user.id);
      if (remoteProfile) {
        const interests = Array.isArray(remoteProfile.interests) ? remoteProfile.interests : [];
        if (interests.length) {
          localStorage.setItem(STORAGE_KEYS.interests, interests.join(","));
        }
        await updateProfile({
          name: remoteProfile.name || remoteUser?.name || profile.name,
          financeCompetency: remoteProfile.finance_competency || profile.financeCompetency,
          avatarDataUrl: remoteProfile.avatar_url || profile.avatarDataUrl
        });
      } else {
        await upsertProfile({
          userId: user.id,
          name: profile.name || remoteUser?.name || "User",
          financeCompetency: profile.financeCompetency,
          interests: (localStorage.getItem(STORAGE_KEYS.interests) || "").split(",").filter(Boolean),
          avatarUrl: profile.avatarDataUrl,
          helper: localStorage.getItem(STORAGE_KEYS.helper) || ""
        });
      }
    }
    const latest = await getProfile();
    if (!latest?.onboardingDone) go("/onboarding");
    else go("/home");
  };

  if (btnEmailUp) {
    btnEmailUp.onclick = async () => {
      setError("");
      const email = emailInput?.value.trim();
      const password = passwordInput?.value || "";
      if (!email || !password) {
        setError("Enter an email and password.");
        return;
      }
      try {
        const { session } = await signUpWithEmail(email, password);
        if (!session) {
          setError("Check your email to confirm your account, then sign in.");
          return;
        }
        await afterAuth();
      } catch (e) {
        setError(e?.message || String(e));
      }
    };
  }

  if (btnEmailIn) {
    btnEmailIn.onclick = async () => {
      setError("");
      const email = emailInput?.value.trim();
      const password = passwordInput?.value || "";
      if (!email || !password) {
        setError("Enter an email and password.");
        return;
      }
      try {
        await signInWithEmail(email, password);
        await afterAuth();
      } catch (e) {
        setError(e?.message || String(e));
      }
    };
  }

}

function initHome() {
  const filterBtns = document.querySelectorAll("[data-filter]");
  const items = document.querySelectorAll("[data-transaction]");
  const sendBtn = document.querySelector("#homeSendMoney");
  const addBtn = document.querySelector("#homeAddMoney");
  const potsBtn = document.querySelector("#homeBudgetPots");
  const viewAllPots = document.querySelector("#viewAllPots");
  const viewAllTransactions = document.querySelector("#viewAllTransactions");
  const openShoppingList = document.querySelector("#openShoppingList");
  const openSmartMoney = document.querySelector("#openSmartMoney");
  const openLearn = document.querySelector("#openLearn");
  const openInsights = document.querySelector("#openInsights");
  const arrangeBtn = document.querySelector("#homeArrangeBtn");
  const arrangePanel = document.querySelector("#homeArrangePanel");
  const arrangeSave = document.querySelector("#arrangeSave");
  const arrangeCancel = document.querySelector("#arrangeCancel");
  const widgetsWrap = document.querySelector("#homeWidgets");
  const homePotGrid = document.querySelector("#homePotGrid");
  const homePotEmpty = document.querySelector("#homePotEmpty");
  const homeMoveMoney = document.querySelector("#homeMoveMoney");
  const balanceEl = document.querySelector("#homeBalanceAmount");
  const balanceOverlayEl = document.querySelector("#homeBalanceOverlayAmount");
  const txList = document.querySelector("#homeTransactionList");
  const txEmpty = document.querySelector("#homeTransactionEmpty");
  const balanceExpand = document.querySelector("#balanceExpand");
  const cardOverlay = document.querySelector("#cardOverlay");
  const cardOverlayClose = document.querySelector("#cardOverlayClose");
  const cardOverlayHide = document.querySelector("#cardOverlayHide");
  const cardDetails = document.querySelector("#cardDetails");
  const topActions = document.querySelector(".top-actions");

  if (sendBtn) sendBtn.onclick = () => go("/payments");
  if (addBtn) addBtn.onclick = () => go("/add-money");
  if (potsBtn) potsBtn.onclick = () => go("/budget-pots");
  if (viewAllPots) viewAllPots.onclick = () => go("/budget-pots");
  if (homeMoveMoney) homeMoveMoney.onclick = () => go("/move-from-pot");
  if (openShoppingList) openShoppingList.onclick = () => go("/shopping-list");
  if (openSmartMoney) openSmartMoney.onclick = () => go("/smart-money");
  if (openLearn) openLearn.onclick = () => go("/learn");
  if (openInsights) openInsights.onclick = () => go("/insights");

  if (topActions && !topActions.querySelector("#homeTopSettingsBtn")) {
    const settingsBtn = document.createElement("button");
    settingsBtn.id = "homeTopSettingsBtn";
    settingsBtn.className = "friends-btn";
    settingsBtn.type = "button";
    settingsBtn.setAttribute("aria-label", "Settings");
    settingsBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm8.7 3.2-1.8-.3a7 7 0 0 0-.6-1.4l1.1-1.5-1.5-1.5-1.5 1.1a7 7 0 0 0-1.4-.6l-.3-1.8h-2.1l-.3 1.8a7 7 0 0 0-1.4.6L8.4 6.5 6.9 8l1.1 1.5a7 7 0 0 0-.6 1.4l-1.8.3v2.1l1.8.3a7 7 0 0 0 .6 1.4l-1.1 1.5 1.5 1.5 1.5-1.1a7 7 0 0 0 1.4.6l.3 1.8h2.1l.3-1.8a7 7 0 0 0 1.4-.6l1.5 1.1 1.5-1.5-1.1-1.5a7 7 0 0 0 .6-1.4l1.8-.3v-2.1Z"/>
      </svg>
    `;
    settingsBtn.onclick = () => go("/settings");
    topActions.prepend(settingsBtn);
  }

  const openOverlay = () => {
    if (!cardOverlay) return;
    if (cardOverlay.parentElement !== document.body) {
      document.body.appendChild(cardOverlay);
    }
    cardOverlay.classList.remove("hidden");
    document.body.classList.add("overlay-open");
  };

  const closeOverlay = () => {
    if (!cardOverlay) return;
    cardOverlay.classList.add("hidden");
    document.body.classList.remove("overlay-open");
  };

  if (balanceExpand) balanceExpand.onclick = openOverlay;
  if (cardOverlayClose) cardOverlayClose.onclick = closeOverlay;
  if (cardOverlayHide) {
    cardOverlayHide.onclick = () => {
      if (!cardDetails) return;
      const hidden = cardDetails.classList.toggle("hidden-private");
      cardOverlayHide.textContent = hidden ? "Show" : "Hide";
    };
  }
  if (cardOverlay) {
    cardOverlay.addEventListener("click", (e) => {
      if (e.target === cardOverlay) closeOverlay();
    });
  }

  getProfile().then((profile) => {
    const settings = { ...SETTINGS_DEFAULTS, ...(profile.settings || {}) };
    document.body.classList.toggle("balance-hidden", !!settings.hideBalances);
    const nameEl = document.querySelector("#homeName");
    if (nameEl) nameEl.textContent = profile.name || "there";
    const cardName = document.querySelector("#cardAccountName");
    if (cardName) {
      const firstName = (profile.name || "").trim().split(" ")[0];
      cardName.textContent = firstName || "Your name";
    }
  });

  initHomeInsightsCard();

  const renderHomePots = async () => {
    if (!homePotGrid) return;
    const pots = await getBudgetPots();
    homePotGrid.innerHTML = "";
    if (!pots.length) {
      if (homePotEmpty) homePotEmpty.style.display = "block";
    } else if (homePotEmpty) {
      homePotEmpty.style.display = "none";
    }

    pots.slice(0, 3).forEach((pot) => {
      const pct = pot.goal ? Math.min(100, Math.round((pot.balance / pot.goal) * 100)) : 0;
      const card = document.createElement("button");
      card.className = "pot-card home-pot-card";
      card.type = "button";
      const accent = pot.color || POT_COLORS[0];
      card.innerHTML = `
        <div class="home-pot-value">${formatMoney(pot.balance)}</div>
        <div class="home-pot-meta">${pot.goal ? `${pct}% of goal` : "No goal set"}</div>
        <div class="home-pot-progress" aria-hidden="true">
          <div class="home-pot-progress-fill" style="width:${pct}%;background:${accent};"></div>
        </div>
        <div class="home-pot-name">${pot.emoji || "🪴"} ${pot.name}</div>
      `;
      card.onclick = () => go(`/pot-detail?id=${encodeURIComponent(pot.id)}`);
      homePotGrid.appendChild(card);
    });

    const newBtn = document.createElement("button");
    newBtn.className = "pot-card blank";
    newBtn.type = "button";
    newBtn.innerHTML = `<div>+ New Pot</div>`;
    newBtn.onclick = () => go("/pot-create");
    homePotGrid.appendChild(newBtn);
  };

  renderHomePots();

  let allTransactions = [];
  let selectedTxFilter = "all";
  let showAllTransactions = false;
  const TRANSACTION_PREVIEW_LIMIT = 4;

  const formatDate = (iso) => {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const renderTransactions = (filter = "all") => {
    if (!txList) return;
    selectedTxFilter = filter;
    txList.innerHTML = "";
    const current = filter === "all"
      ? allTransactions
      : allTransactions.filter((tx) => tx._direction === filter);
    const visible = showAllTransactions ? current : current.slice(0, TRANSACTION_PREVIEW_LIMIT);

    if (!current.length) {
      if (txEmpty) txEmpty.style.display = "block";
      if (viewAllTransactions) {
        viewAllTransactions.style.display = "inline-flex";
        viewAllTransactions.textContent = "View all transactions";
        viewAllTransactions.disabled = true;
      }
      return;
    }
    if (txEmpty) txEmpty.style.display = "none";
    if (viewAllTransactions) {
      viewAllTransactions.style.display = "inline-flex";
      viewAllTransactions.disabled = current.length <= TRANSACTION_PREVIEW_LIMIT;
      viewAllTransactions.textContent = showAllTransactions ? "Show fewer transactions" : "View all transactions";
    }

    visible.forEach((tx) => {
      const row = document.createElement("div");
      row.className = "transaction-item";
      row.dataset.transaction = tx._direction;
      row.dataset.txId = tx.id;
      row.innerHTML = `
        <div class="transaction-info">
          <div class="transaction-icon">${tx._icon}</div>
          <div>
            <div><strong>${tx._title}</strong></div>
            <div class="transaction-meta">${formatDate(tx.created_at)}</div>
          </div>
        </div>
        <div class="transaction-amount">${tx._amountLabel}</div>
      `;
      row.onclick = () => go(`/transaction?id=${encodeURIComponent(tx.id)}`);
      txList.appendChild(row);
    });
  };

  const loadRemoteSnapshot = async () => {
    const profile = await getProfile();
    let ledger = await getSimulatedLedger();
    const user = await ensureRemoteUserProfile(profile);
    if (user && Number(ledger.balanceDelta || 0) !== 0) {
      const sync = await syncPendingBalanceDelta(profile, ledger);
      ledger = sync.ledger;
    }
    if (!user) {
      const localTx = (ledger.transactions || []).map((tx) => ({
        ...tx,
        _direction: "expense",
        _title: tx.reference || "Sent transfer",
        _icon: "⬆️",
        _amountLabel: `-${formatMoney(tx.amount)}`
      }));
      allTransactions = localTx;
      if (balanceEl) balanceEl.textContent = formatMoney(Math.max(0, ledger.balanceDelta));
      if (balanceOverlayEl) balanceOverlayEl.textContent = formatMoney(Math.max(0, ledger.balanceDelta));
      renderTransactions("all");
      return;
    }
    const remote = await fetchUserById(user.id);
    if (remote?.name && remote.name !== profile.name) {
      await updateProfile({ name: remote.name });
      const nameEl = document.querySelector("#homeName");
      if (nameEl) nameEl.textContent = remote.name;
    }

    const remoteBalance = await fetchBalance(user.id);
    const displayBalance = remoteBalance + Number(ledger.balanceDelta || 0);
    if (balanceEl) balanceEl.textContent = formatMoney(displayBalance);
    if (balanceOverlayEl) balanceOverlayEl.textContent = formatMoney(displayBalance);

    const txs = await fetchTransactions(user.id, 10);
    const remoteMapped = txs.map((tx) => {
      const isIncome = tx.to_user === user.id;
      const title = isIncome ? "Incoming transfer" : "Sent transfer";
      return {
        ...tx,
        _direction: isIncome ? "income" : "expense",
        _title: tx.reference || title,
        _icon: isIncome ? "⬇️" : "⬆️",
        _amountLabel: `${isIncome ? "+" : "-"}${formatMoney(tx.amount)}`
      };
    });
    const localMapped = (ledger.transactions || []).map((tx) => ({
      ...tx,
      _direction: "expense",
      _title: tx.reference || "Sent transfer",
      _icon: "⬆️",
      _amountLabel: `-${formatMoney(tx.amount)}`
    }));
    allTransactions = [...localMapped, ...remoteMapped]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    renderTransactions("all");
  };

  loadRemoteSnapshot();

  const baseOrder = ["transactions", "pots", "shopping", "smart-money", "learn", "insights"];
  const orderKey = "homeWidgetOrder";
  let arrangeActive = false;
  let draggingEl = null;
  let pointerId = null;
  let dragOverEl = null;

  const applyOrder = (order) => {
    if (!widgetsWrap) return;
    const sections = Array.from(widgetsWrap.querySelectorAll("[data-widget]"));
    const byId = new Map(sections.map((el) => [el.dataset.widget, el]));
    order.forEach((id) => {
      const el = byId.get(id);
      if (el) widgetsWrap.appendChild(el);
    });
  };

  const currentOrder = () => {
    if (!widgetsWrap) return baseOrder;
    return Array.from(widgetsWrap.querySelectorAll("[data-widget]")).map((el) => el.dataset.widget);
  };

  const saved = localStorage.getItem(orderKey);
  if (saved) {
    try {
      const order = JSON.parse(saved);
      if (Array.isArray(order) && order.length) applyOrder(order);
    } catch {}
  }

  const setArrangeActive = (active) => {
    arrangeActive = active;
    if (!widgetsWrap) return;
    widgetsWrap.classList.toggle("arrange-active", active);
    if (!active) clearDragState();
  };

  const clearDragState = () => {
    if (draggingEl) draggingEl.classList.remove("dragging");
    if (dragOverEl) dragOverEl.classList.remove("drag-over");
    draggingEl = null;
    dragOverEl = null;
    pointerId = null;
  };

  const setupDrag = () => {
    if (!widgetsWrap) return;
    widgetsWrap.querySelectorAll("[data-widget]").forEach((el) => {
      if (el.dataset.dragInit) return;
      el.dataset.dragInit = "true";

      el.addEventListener("pointerdown", (e) => {
        if (!arrangeActive) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        draggingEl = el;
        pointerId = e.pointerId;
        el.setPointerCapture(e.pointerId);
        el.classList.add("dragging");
      });

      el.addEventListener("pointermove", (e) => {
        if (!arrangeActive || !draggingEl || e.pointerId !== pointerId) return;
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-widget]");
        if (!target || target === draggingEl || !widgetsWrap.contains(target)) return;
        if (dragOverEl && dragOverEl !== target) dragOverEl.classList.remove("drag-over");
        dragOverEl = target;
        dragOverEl.classList.add("drag-over");
        const rect = target.getBoundingClientRect();
        const after = e.clientY - rect.top > rect.height / 2;
        widgetsWrap.insertBefore(draggingEl, after ? target.nextSibling : target);
      });

      el.addEventListener("pointerup", (e) => {
        if (e.pointerId !== pointerId) return;
        el.releasePointerCapture(e.pointerId);
        clearDragState();
      });

      el.addEventListener("pointercancel", () => {
        clearDragState();
      });
    });
  };

  setupDrag();

  if (arrangeBtn && arrangePanel) {
    arrangeBtn.onclick = () => {
      const isHidden = arrangePanel.classList.toggle("hidden");
      setArrangeActive(!isHidden);
    };
  }

  if (arrangeSave) {
    arrangeSave.onclick = () => {
      const order = currentOrder();
      localStorage.setItem(orderKey, JSON.stringify(order));
      if (arrangePanel) arrangePanel.classList.add("hidden");
      setArrangeActive(false);
    };
  }

  if (arrangeCancel) {
    arrangeCancel.onclick = () => {
      const savedOrder = localStorage.getItem(orderKey);
      if (savedOrder) {
        try {
          const order = JSON.parse(savedOrder);
          if (Array.isArray(order) && order.length) applyOrder(order);
        } catch {}
      } else {
        applyOrder(baseOrder);
      }
      if (arrangePanel) arrangePanel.classList.add("hidden");
      setArrangeActive(false);
    };
  }

  filterBtns.forEach((btn) => {
    btn.onclick = () => {
      const filter = btn.dataset.filter;
      showAllTransactions = false;
      filterBtns.forEach((b) => b.classList.toggle("active", b === btn));
      renderTransactions(filter);
    };
  });

  if (viewAllTransactions) {
    viewAllTransactions.onclick = () => {
      showAllTransactions = !showAllTransactions;
      renderTransactions(selectedTxFilter);
    };
  }
}

function initSmartMoney() {
  const incomeInput = document.querySelector("#smtIncome");
  const rowsWrap = document.querySelector("#smtRows");
  const warnEl = document.querySelector("#smtWarning");
  const unallocatedEl = document.querySelector("#smtUnallocated");
  const addBtn = document.querySelector("#smtAddBtn");
  const newName = document.querySelector("#smtNewName");
  const newRule = document.querySelector("#smtNewRule");
  const newValue = document.querySelector("#smtNewValue");

  const state = {
    income: 2400,
    buckets: [
      { id: "rent", name: "Rent", rule: "fixed", value: 800 },
      { id: "food", name: "Food", rule: "percent", value: 20 },
      { id: "fun", name: "Fun", rule: "percent", value: 8 },
      { id: "savings", name: "Savings", rule: "fixed", value: 300 },
      { id: "leftover", name: "Leftover", rule: "leftover", value: 0 }
    ],
    spent: {
      rent: 800,
      food: 260,
      fun: 120,
      savings: 200,
      leftover: 0
    }
  };

  const fmt = (n) => `£${Math.max(0, Math.round(n))}`;

  const calcPlanned = (income, bucket) => {
    if (bucket.rule === "fixed") return bucket.value;
    if (bucket.rule === "percent") return (income * bucket.value) / 100;
    return 0;
  };

  const recompute = () => {
    const effectiveIncome = state.income;

    const planned = {};
    let totalPlanned = 0;
    let leftoverBucket = null;

    state.buckets.forEach((b) => {
      if (b.rule === "leftover") {
        leftoverBucket = b;
        return;
      }
      const amount = calcPlanned(effectiveIncome, b);
      planned[b.id] = amount;
      totalPlanned += amount;
    });

    const leftover = effectiveIncome - totalPlanned;
    if (leftoverBucket) planned[leftoverBucket.id] = leftover;

    return { planned, effectiveIncome, totalPlanned, leftover };
  };

  const statusFor = (planned, spent) => {
    if (planned <= 0) return { status: "neutral", why: "No planned amount yet." };
    const ratio = spent / planned;
    if (spent > planned) {
      return { status: "red", why: "Spending has exceeded the planned amount." };
    }
    if (ratio >= 0.85) return { status: "yellow", why: "Spending is close to the plan." };
    return { status: "green", why: "On track with the plan." };
  };

  const render = () => {
    if (incomeInput) incomeInput.value = String(state.income);

    const { planned, effectiveIncome, totalPlanned, leftover } = recompute();
    const unallocated = leftover;

    if (unallocatedEl) unallocatedEl.textContent = fmt(unallocated);
    if (warnEl) {
      warnEl.textContent = unallocated < 0 ? "Over-allocated. Reduce bucket values." : "Budget balances automatically with leftover.";
      warnEl.className = `smt-warning ${unallocated < 0 ? "warn" : ""}`;
    }

    if (!rowsWrap) return;
    rowsWrap.innerHTML = "";
    state.buckets.forEach((b) => {
      const plannedAmt = planned[b.id] ?? 0;
      const spent = state.spent[b.id] ?? 0;
      const remaining = plannedAmt - spent;
      const status = statusFor(plannedAmt, spent);

      const ratio = plannedAmt ? Math.min(100, (spent / plannedAmt) * 100) : 0;
      const row = document.createElement("div");
      row.className = "smt-row";
      row.innerHTML = `
        <div class=\"smt-cell smt-cell-bucket\">
          <input class=\"smt-name\" value=\"${b.name}\" />
          <div class=\"muted\" style=\"font-size:11px;\">${b.rule === "leftover" ? "Auto-balancing bucket" : "Manual rule"}</div>
        </div>
        <div class=\"smt-cell smt-cell-plan\">
          <select class=\"smt-rule\">
            <option value=\"fixed\" ${b.rule === "fixed" ? "selected" : ""}>Fixed</option>
            <option value=\"percent\" ${b.rule === "percent" ? "selected" : ""}>% income</option>
            <option value=\"leftover\" ${b.rule === "leftover" ? "selected" : ""}>Leftover</option>
          </select>
          <input class=\"smt-value\" type=\"number\" ${b.rule === "leftover" ? "disabled" : ""} value=\"${b.value}\" />
        </div>
        <div class=\"smt-cell\">${fmt(plannedAmt)}</div>
        <div class=\"smt-cell\">
          <div class="smt-amount">${fmt(spent)}</div>
          <div class=\"smt-bar\"><span style=\"width:${ratio}%;\"></span></div>
        </div>
        <div class=\"smt-cell\">${fmt(remaining)}</div>
        <div class=\"smt-cell smt-cell-status\">
          <span class=\"smt-status ${status.status}\"></span>
          <button class=\"smt-why\" type=\"button\">Why?</button>
          <button class="smt-remove" type="button" aria-label="Remove bucket" title="Remove bucket">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-1 6h2v9H8V9Zm6 0h2v9h-2V9ZM6 9h2v9H6V9Zm2 12h8a2 2 0 0 0 2-2V9H6v10a2 2 0 0 0 2 2Z"/></svg>
          </button>
        </div>
      `;

      const nameInput = row.querySelector(".smt-name");
      const ruleSelect = row.querySelector(".smt-rule");
      const valueInput = row.querySelector(".smt-value");
      const whyBtn = row.querySelector(".smt-why");
      const removeBtn = row.querySelector(".smt-remove");

      if (nameInput) nameInput.onchange = () => { b.name = nameInput.value.trim() || b.name; };
      if (ruleSelect) ruleSelect.onchange = () => { b.rule = ruleSelect.value; render(); };
      if (valueInput) valueInput.onchange = () => { b.value = Number(valueInput.value || 0); render(); };
      if (whyBtn) whyBtn.onclick = () => alert(`${b.name}: ${status.why}`);
      if (removeBtn) {
        removeBtn.onclick = () => {
          if (state.buckets.length <= 1) return;
          state.buckets = state.buckets.filter((bucket) => bucket.id !== b.id);
          delete state.spent[b.id];
          render();
        };
      }

      rowsWrap.appendChild(row);
    });
  };

  if (incomeInput) {
    incomeInput.oninput = () => {
      state.income = Number(incomeInput.value || 0);
      render();
    };
  }

  if (addBtn) {
    addBtn.onclick = () => {
      const name = newName?.value?.trim();
      if (!name) return;
      const rule = newRule?.value || "fixed";
      const value = Number(newValue?.value || 0);
      state.buckets.push({ id: `b_${Date.now()}`, name, rule, value });
      if (newName) newName.value = "";
      if (newValue) newValue.value = "";
      render();
    };
  }

  render();
}

function initShoppingList() {
  const input = document.querySelector("#shoppingInput");
  const addBtn = document.querySelector("#shoppingAddBtn");
  const listEl = document.querySelector("#shoppingList");

  const render = async () => {
    const profile = await getProfile();
    const items = Array.isArray(profile.shoppingList) ? profile.shoppingList : [];
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No items yet.";
      listEl.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "shopping-item";

      const name = document.createElement("div");
      name.textContent = item;
      name.className = "shopping-name";

      const actions = document.createElement("div");
      actions.className = "shopping-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "action-btn";
      editBtn.textContent = "Edit";
      editBtn.onclick = async () => {
        const next = window.prompt("Edit item", item);
        if (!next || !next.trim()) return;
        const profileNow = await getProfile();
        const list = Array.isArray(profileNow.shoppingList) ? profileNow.shoppingList : [];
        list[index] = next.trim();
        await updateProfile({ shoppingList: list });
        render();
      };

      const removeBtn = document.createElement("button");
      removeBtn.className = "action-btn";
      removeBtn.textContent = "Remove";
      removeBtn.onclick = async () => {
        const profileNow = await getProfile();
        const list = Array.isArray(profileNow.shoppingList) ? profileNow.shoppingList : [];
        list.splice(index, 1);
        await updateProfile({ shoppingList: list });
        render();
      };

      actions.appendChild(editBtn);
      actions.appendChild(removeBtn);
      row.appendChild(name);
      row.appendChild(actions);
      listEl.appendChild(row);
    });
  };

  const addItem = async () => {
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    const profile = await getProfile();
    const list = Array.isArray(profile.shoppingList) ? profile.shoppingList : [];
    list.push(val);
    await updateProfile({ shoppingList: list });
    input.value = "";
    render();
  };

  if (addBtn) addBtn.onclick = addItem;
  if (input) {
    input.onkeydown = (e) => {
      if (e.key === "Enter") addItem();
    };
  }

  render();
}

function initPayments() {
  const sendBtn = document.querySelector("#sendMoneyBtn");
  const sendToSelect = document.querySelector("#sendToSelect");
  const sendFromSelect = document.querySelector("#sendFromAccount");
  const amountInput = document.querySelector("#sendAmount");
  const referenceInput = document.querySelector("#sendReference");
  const quickAmountBtns = document.querySelectorAll(".amount-quick-picks button");
  let recipients = [];
  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const preselectRecipientId = params.get("to") || "";

  if (sendFromSelect) {
    getProfile().then((profile) => {
      const firstName = (profile.name || "Your").trim().split(" ")[0];
      sendFromSelect.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = "current";
      opt.textContent = `${firstName}'s account`;
      sendFromSelect.appendChild(opt);
    });
  }

  const loadRecipients = async () => {
    if (!sendToSelect) return;
    try {
      const profile = await getProfile();
      const user = await getSupabaseUser();
      const friends = (Array.isArray(profile.friends) ? profile.friends : [])
        .filter((f) => String(f?.id || "") !== String(user?.id || ""));
      recipients = friends;
      sendToSelect.innerHTML = '<option value="">Select recipient</option>';
      if (!friends.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No friends added yet";
        sendToSelect.appendChild(opt);
        return;
      }
      friends.forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.name || u.id.slice(0, 6);
        if (u.isFake || String(u.id || "").startsWith("fake_friend_")) {
          opt.dataset.fake = "true";
        }
        sendToSelect.appendChild(opt);
      });
      if (preselectRecipientId && friends.some((u) => u.id === preselectRecipientId)) {
        sendToSelect.value = preselectRecipientId;
      }
    } catch {
      sendToSelect.innerHTML = '<option value="">Recipients unavailable</option>';
    }
  };

  if (sendBtn) {
    sendBtn.onclick = async () => {
      const user = await getSupabaseUser();
      if (!user) return;
      const receiverId = sendToSelect?.value || "";
      const amount = Number(String(amountInput?.value || "").replace(/[^\d.]/g, ""));
      const reference = referenceInput?.value?.trim() || "";
      const selectedOption = sendToSelect?.selectedOptions?.[0] || null;
      const selectedRecipient = recipients.find((r) => r.id === receiverId);
      const isFakeRecipient = selectedOption?.dataset?.fake === "true"
        || Boolean(selectedRecipient?.isFake)
        || String(receiverId).startsWith("fake_friend_");

      if (!receiverId) {
        alert("Select a recipient.");
        return;
      }
      if (String(receiverId) === String(user.id)) {
        showActionModal({
          title: "Cannot Send To Yourself",
          message: "Please choose a different recipient."
        });
        return;
      }
      if (!amount || Number.isNaN(amount) || amount <= 0) {
        alert("Enter a valid amount.");
        return;
      }
      const available = await getAvailableMainAccountBalance();
      if (amount > available) {
        showActionModal({
          title: "Insufficient Funds",
          message: `You only have ${formatMoney(available)} available in your current account.`
        });
        return;
      }
      if (isFakeRecipient) {
        await recordSimulatedTransfer({
          receiverId,
          receiverName: selectedRecipient?.name || selectedOption?.textContent || "friend",
          amount,
          reference
        });
        showConfirmation("Money sent");
        return;
      }
      try {
        await transferFunds({ senderId: user.id, receiverId, amount, reference });
        showConfirmation("Money sent");
      } catch (e) {
        alert(e?.message || "Transfer failed.");
      }
    };
  }

  if (quickAmountBtns.length && amountInput) {
    quickAmountBtns.forEach((btn) => {
      btn.onclick = () => {
        const cleanValue = btn.textContent?.replace(/[^\d.]/g, "") || "";
        amountInput.value = cleanValue ? `£ ${cleanValue}` : "";
      };
    });
  }

  loadRecipients();
}

function initBillSplitting() {
  const sendLink = document.querySelector("#goSendMoney");
  const insightsLink = document.querySelector("#goInsights");
  const splitBtn = document.querySelector("#splitBillBtn");
  const billSelect = document.querySelector("#billSelect");
  const billSplitView = document.querySelector("#billSplitView");
  const billTxList = document.querySelector("#billTxList");
  const billFriendsList = document.querySelector("#billFriendsList");
  const billContinue = document.querySelector("#billContinue");
  const billCard = document.querySelector("#billCard");
  const billAttendees = document.querySelector("#billAttendees");
  const billTotal = document.querySelector("#billTotal");
  if (sendLink) sendLink.onclick = () => go("/payments");
  if (insightsLink) insightsLink.onclick = () => go("/insights");
  if (splitBtn) splitBtn.onclick = () => showConfirmation("Bill split");

  const transactions = [
    { id: "t1", merchant: "McDonald's", amount: 14.5, time: "10:34 AM", date: "14/11/2025", icon: "M" },
    { id: "t2", merchant: "Sainsbury's", amount: 23.2, time: "6:12 PM", date: "12/11/2025", icon: "S" },
    { id: "t3", merchant: "Cinema", amount: 18.0, time: "8:05 PM", date: "10/11/2025", icon: "C" }
  ];

  let selectedTx = null;
  const selectedFriends = new Set();

  const renderTx = () => {
    if (!billTxList) return;
    billTxList.innerHTML = "";
    transactions.forEach((tx) => {
      const row = document.createElement("div");
      row.className = "settings-item";
      row.innerHTML = `
        <span><strong>£${tx.amount.toFixed(2)}</strong> • ${tx.merchant}</span>
        <button class="action-btn">${selectedTx?.id === tx.id ? "Selected" : "Select"}</button>
      `;
      row.querySelector("button").onclick = () => {
        selectedTx = tx;
        renderTx();
      };
      billTxList.appendChild(row);
    });
  };

  const renderFriends = (friends) => {
    if (!billFriendsList) return;
    billFriendsList.innerHTML = "";
    if (!friends.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No friends yet.";
      billFriendsList.appendChild(empty);
      return;
    }
    friends.forEach((f) => {
      const row = document.createElement("div");
      row.className = "settings-item";
      const checked = selectedFriends.has(f.id);
      row.innerHTML = `
        <span>${f.name}</span>
        <button class="action-btn">${checked ? "Remove" : "Add"}</button>
      `;
      row.querySelector("button").onclick = () => {
        if (checked) selectedFriends.delete(f.id);
        else selectedFriends.add(f.id);
        renderFriends(friends);
      };
      billFriendsList.appendChild(row);
    });
  };

  const renderSplit = (friends) => {
    if (!billCard || !billAttendees || !billTotal || !selectedTx) return;
    billCard.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="brand-box" style="background:#fff3e1;border:none;">${selectedTx.icon}</div>
        <div>
          <div><strong>£${selectedTx.amount.toFixed(2)}</strong> <span style="margin-left:6px;">Spent at ${selectedTx.merchant}</span></div>
          <div style="font-size:12px;color:#436254;">${selectedFriends.size + 1} Attendees • ${selectedTx.time} • ${selectedTx.date}</div>
        </div>
      </div>
    `;
    billTotal.textContent = `£${selectedTx.amount.toFixed(2)}`;
    billAttendees.innerHTML = "";
    const totalPeople = selectedFriends.size + 1;
    const per = totalPeople ? selectedTx.amount / totalPeople : 0;

    const youRow = document.createElement("div");
    youRow.className = "attendee-item";
    youRow.innerHTML = `
      <div class="attendee-left">
        <div class="avatar-circle">Y</div>
        You
      </div>
      <div>Owe <strong>£${per.toFixed(2)}</strong></div>
    `;
    billAttendees.appendChild(youRow);

    friends.filter((f) => selectedFriends.has(f.id)).forEach((f) => {
      const row = document.createElement("div");
      row.className = "attendee-item";
      row.innerHTML = `
        <div class="attendee-left">
          <div class="avatar-circle">${f.name[0]}</div>
          ${f.name}
        </div>
        <div>Owes <strong>£${per.toFixed(2)}</strong></div>
      `;
      billAttendees.appendChild(row);
    });
  };

  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const preselectId = params.get("tx");

  if (preselectId) {
    selectedTx = transactions.find((t) => t.id === preselectId) || null;
  }

  getProfile().then((profile) => {
    const friends = Array.isArray(profile.friends) ? profile.friends : [];
    renderTx();
    renderFriends(friends);

    if (billContinue) {
      billContinue.onclick = () => {
        if (!selectedTx || selectedFriends.size === 0) return;
        if (billSelect) billSelect.classList.add("hidden");
        if (billSplitView) billSplitView.classList.remove("hidden");
        renderSplit(friends);
      };
    }

    if (preselectId && selectedTx && billSelect && billSplitView) {
      billSelect.classList.add("hidden");
      billSplitView.classList.remove("hidden");
      renderSplit(friends);
    }
  });
}

function initTransaction() {
  const icon = document.querySelector("#txIcon");
  const merchant = document.querySelector("#txMerchant");
  const meta = document.querySelector("#txMeta");
  const amount = document.querySelector("#txAmount");
  const location = document.querySelector("#txLocation");
  const status = document.querySelector("#txStatus");
  const category = document.querySelector("#txCategory");
  const card = document.querySelector("#txCard");
  const splitBtn = document.querySelector("#txSplitBtn");

  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const id = params.get("id") || "t1";
  const fallback = {
    merchant: "Merchant",
    amount: 14.5,
    time: "10:34 AM",
    date: "14/11/2025",
    icon: "💳",
    location: "Oxford Road, Manchester",
    category: "Transfer"
  };

  const renderTx = (tx, userId = null) => {
    const isIncome = userId && tx.to_user === userId;
    if (icon) icon.textContent = isIncome ? "⬇️" : "⬆️";
    if (merchant) merchant.textContent = tx.reference || (isIncome ? "Incoming transfer" : "Sent transfer");
    if (meta) {
      const date = tx.created_at ? new Date(tx.created_at).toLocaleString("en-GB") : `${fallback.date} • ${fallback.time}`;
      meta.textContent = date;
    }
    if (amount) amount.textContent = `£${Number(tx.amount || fallback.amount).toFixed(2)}`;
    if (location) location.textContent = "Oxford Road, Manchester";
    if (status) status.textContent = "Completed";
    if (category) category.textContent = "Transfer";
    if (card) card.textContent = "Lloyds Debit";
  };

  fetchTransactionById(id).then(async (remoteTx) => {
    if (remoteTx) {
      const user = await getSupabaseUser();
      renderTx(remoteTx, user?.id || null);
    } else {
      renderTx(fallback);
    }
  });

  if (splitBtn) splitBtn.onclick = () => go(`/bill-splitting?tx=${encodeURIComponent(id)}`);
}

function initAddMoney() {
  const openCheque = document.querySelector("#openCheque");
  const openMove = document.querySelector("#openMoveFromPot");
  const openAddToPot = document.querySelector("#openAddToPot");
  if (openCheque) openCheque.onclick = () => go("/scan-cheque");
  if (openMove) openMove.onclick = () => go("/move-from-pot");
  if (openAddToPot) openAddToPot.onclick = () => go("/add-to-pot");
}

function initScanCheque() {
  const video = document.querySelector("#chequeVideo");
  const capture = document.querySelector("#chequeCapture");

  if (video) {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch(() => {
        video.poster = "./one-logo.png";
      });
  }

  if (capture) {
    capture.onclick = () => showConfirmation("Money added");
  }
}

function initMoveFromPot() {
  const confirm = document.querySelector("#movePotConfirm");
  const select = document.querySelector("#movePotSelect");
  const amountInput = document.querySelector("#movePotAmount");
  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const preselectId = params.get("id");

  const load = async () => {
    if (!select) return;
    const pots = await getBudgetPots();
    select.innerHTML = "";
    if (!pots.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No pots available";
      select.appendChild(opt);
      return;
    }
    pots.forEach((pot) => {
      const opt = document.createElement("option");
      opt.value = pot.id;
      opt.textContent = `${pot.emoji || "🪴"} ${pot.name} (${formatMoney(pot.balance)})`;
      select.appendChild(opt);
    });
    if (preselectId) select.value = preselectId;
  };

  if (confirm) {
    confirm.onclick = async () => {
      const potId = select?.value || "";
      const amount = Number(amountInput?.value || 0);
      if (!potId) return alert("Select a pot.");
      if (!amount || amount <= 0) return alert("Enter an amount.");
      const pots = await getBudgetPots();
      const pot = pots.find((p) => p.id === potId);
      if (!pot) return alert("Pot not found.");
      if (amount > pot.balance) return alert("Not enough in this pot.");
      pot.balance = Number(pot.balance) - amount;
      await setBudgetPots(pots);
      await applySimulatedBalanceAdjustment(amount);
      showConfirmation("Money moved");
    };
  }

  load();
}

function initAddToPot() {
  const confirm = document.querySelector("#addPotConfirm");
  const select = document.querySelector("#addPotSelect");
  const amountInput = document.querySelector("#addPotAmount");
  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const preselectId = params.get("id");

  const load = async () => {
    if (!select) return;
    const pots = await getBudgetPots();
    select.innerHTML = "";
    if (!pots.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No pots available";
      select.appendChild(opt);
      return;
    }
    pots.forEach((pot) => {
      const opt = document.createElement("option");
      opt.value = pot.id;
      opt.textContent = `${pot.emoji || "🪴"} ${pot.name}`;
      select.appendChild(opt);
    });
    if (preselectId) select.value = preselectId;
  };

  if (confirm) {
    confirm.onclick = async () => {
      const potId = select?.value || "";
      const amount = Number(amountInput?.value || 0);
      if (!potId) return alert("Select a pot.");
      if (!amount || amount <= 0) return alert("Enter an amount.");
      const available = await getAvailableMainAccountBalance();
      if (amount > available) {
        showActionModal({
          title: "Insufficient Funds",
          message: `You only have ${formatMoney(available)} available in your current account.`
        });
        return;
      }
      const pots = await getBudgetPots();
      const pot = pots.find((p) => p.id === potId);
      if (!pot) return alert("Pot not found.");
      const prevBalance = Number(pot.balance) || 0;
      pot.balance = Number(pot.balance) + amount;
      await setBudgetPots(pots);
      await applySimulatedBalanceAdjustment(-amount);
      const goal = Number(pot.goal) || 0;
      if (goal > 0 && prevBalance < goal && Number(pot.balance) >= goal) {
        showTopNotification(`${pot.emoji || "Pot"} ${pot.name} goal completed`);
      }
      showConfirmation("Money added");
    };
  }

  load();
}

function initPotCreate() {
  const nameInput = document.querySelector("#potName");
  const emojiInput = document.querySelector("#potEmoji");
  const goalInput = document.querySelector("#potGoal");
  const createBtn = document.querySelector("#potCreateBtn");
  const colorWrap = document.querySelector("#potColorOptions");
  let chosenColor = POT_COLORS[0];

  if (colorWrap) {
    const buttons = Array.from(colorWrap.querySelectorAll(".color-swatch"));
    buttons.forEach((btn) => {
      const color = btn.dataset.color || POT_COLORS[0];
      btn.style.background = color;
      btn.onclick = () => {
        chosenColor = color;
        buttons.forEach((b) => b.classList.toggle("selected", b === btn));
      };
    });
    if (buttons[0]) buttons[0].classList.add("selected");
  }

  if (createBtn) {
    createBtn.onclick = async () => {
      const name = nameInput?.value.trim();
      if (!name) return alert("Enter a pot name.");
      const emoji = (emojiInput?.value || "🪴").trim() || "🪴";
      const goal = Number(goalInput?.value || 0);
      const pots = await getBudgetPots();
      const pot = {
        id: `pot_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
        name,
        emoji,
        color: chosenColor,
        goal: goal > 0 ? goal : 0,
        balance: 0
      };
      pots.push(pot);
      await setBudgetPots(pots);
      go(`/pot-detail?id=${encodeURIComponent(pot.id)}`);
    };
  }
}

function initPotDetail() {
  const title = document.querySelector("#potDetailTitle");
  const hero = document.querySelector("#potDetailHero");
  const emoji = document.querySelector("#potDetailEmoji");
  const balance = document.querySelector("#potDetailBalance");
  const goal = document.querySelector("#potDetailGoal");
  const progress = document.querySelector("#potDetailProgress");
  const nameEl = document.querySelector("#potDetailName");
  const goalAmount = document.querySelector("#potDetailGoalAmount");
  const balanceAmount = document.querySelector("#potDetailBalanceAmount");
  const addBtn = document.querySelector("#potDetailAdd");
  const removeBtn = document.querySelector("#potDetailRemove");

  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const id = params.get("id");

  const render = async () => {
    const pots = await getBudgetPots();
    const pot = pots.find((p) => p.id === id);
    if (!pot) return;
    if (title) title.textContent = pot.name;
    if (emoji) emoji.textContent = pot.emoji || "🪴";
    if (hero) hero.style.background = pot.color || POT_COLORS[0];
    if (balance) balance.textContent = formatMoney(pot.balance);
    const pct = pot.goal ? Math.min(100, Math.round((pot.balance / pot.goal) * 100)) : 0;
    if (goal) goal.textContent = pot.goal ? `Goal ${formatMoney(pot.goal)} • ${pct}% complete` : "No goal set";
    if (progress) progress.style.width = `${pct}%`;
    if (nameEl) nameEl.textContent = pot.name;
    if (goalAmount) goalAmount.textContent = pot.goal ? formatMoney(pot.goal) : "—";
    if (balanceAmount) balanceAmount.textContent = formatMoney(pot.balance);
  };

  if (addBtn) addBtn.onclick = () => go(`/add-to-pot?id=${encodeURIComponent(id || "")}`);
  if (removeBtn) removeBtn.onclick = () => go(`/move-from-pot?id=${encodeURIComponent(id || "")}`);

  render();
}

async function initInsights() {
  const sendLink = document.querySelector("#goSendMoney");
  const splitLink = document.querySelector("#goSplitBill");
  if (sendLink) sendLink.onclick = () => go("/payments");
  if (splitLink) splitLink.onclick = () => go("/bill-splitting");

  const periodBtns = document.querySelectorAll("[data-period]");
  const totalEl = document.querySelector("#insightsTotal");
  const donutEl = document.querySelector("#insightsDonut");
  const donutLabel = document.querySelector("#insightsDonutLabel");
  const legendEl = document.querySelector("#insightsLegend");
  const safeEl = document.querySelector("#insightsSafe");
  const sparkEl = document.querySelector("#insightsSpark");
  const barsEl = document.querySelector("#insightsBars");
  const trendLabel = document.querySelector("#insightsTrendLabel");
  const categoriesEl = document.querySelector("#insightsCategories");
  const barReadout = document.querySelector("#insightsBarReadout");
  const analysisMeta = document.querySelector("#insightsAnalysisMeta");
  const analysisList = document.querySelector("#insightsAnalysisList");
  const refreshBtn = document.querySelector("#insightsRefreshBtn");

  const PERIOD_CONFIG = {
    week: { days: 7, label: "Last 7 days", mode: "day" },
    month: { days: 30, label: "Last 30 days", mode: "day" },
    year: { months: 12, label: "Last 12 months", mode: "month" }
  };

  const fmt = (n) => `£${Math.round(Number(n) || 0).toLocaleString()}`;
  const now = new Date();
  let refreshSeed = 0;
  let activePeriod = "week";
  let db = null;
  let realTxCount = 0;
  let syntheticTxCount = 0;

  const saveHomeInsightsSnapshot = (period, periodData) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.insightsHomeCache);
      const cache = raw ? JSON.parse(raw) : {};
      cache[period] = {
        total: periodData.total,
        categories: periodData.categories,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.insightsHomeCache, JSON.stringify(cache));
      localStorage.setItem(STORAGE_KEYS.insightsActivePeriod, period);
    } catch {}
  };

  const fallbackDb = {
    categories: [
      { name: "Bills", color: "#2c8f63", monthlyTarget: 520, keywords: ["rent", "bill", "electric", "water"] },
      { name: "Groceries", color: "#0aa85d", monthlyTarget: 260, keywords: ["tesco", "aldi", "sainsbury", "grocery"] },
      { name: "Transport", color: "#45be87", monthlyTarget: 170, keywords: ["uber", "bus", "train", "fuel"] },
      { name: "Eating Out", color: "#7dd3ae", monthlyTarget: 190, keywords: ["restaurant", "coffee", "takeaway"] },
      { name: "Shopping", color: "#a3dec2", monthlyTarget: 150, keywords: ["amazon", "shop"] },
      { name: "Leisure", color: "#c5ebda", monthlyTarget: 120, keywords: ["netflix", "gym", "cinema"] },
      { name: "Transfers", color: "#dff5ea", monthlyTarget: 110, keywords: ["transfer", "send"] },
      { name: "Other", color: "#ecf9f3", monthlyTarget: 90, keywords: [] }
    ],
    syntheticTransactions: [],
    analysisTemplates: {
      momentumHigh: ["Spending is moving faster than your recent baseline."],
      momentumStable: ["Spending momentum is stable versus your baseline."],
      topCategoryPressure: ["Your top category is above its normal range this period."],
      topCategoryHealthy: ["Your top category is within the expected range."]
    }
  };

  const jitter = (value, spread = 0.14) => {
    const bump = (Math.random() * 2 - 1) * spread;
    return Math.max(0, value * (1 + bump));
  };

  const pickLine = (lines) => {
    if (!Array.isArray(lines) || !lines.length) return "";
    return lines[(refreshSeed + Math.floor(Math.random() * lines.length)) % lines.length];
  };

  const dateKey = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const classifyCategory = (text = "") => {
    const lower = String(text).toLowerCase();
    const matched = db.categories.find((cat) => (cat.keywords || []).some((kw) => lower.includes(String(kw).toLowerCase())));
    return matched?.name || "Other";
  };

  const getCategoryMeta = (name) => db.categories.find((c) => c.name === name) || db.categories[db.categories.length - 1];

  const toMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const loadDb = async () => {
    try {
      const res = await fetch("./assets/data/insights-sim.json");
      if (!res.ok) return fallbackDb;
      const parsed = await res.json();
      return parsed || fallbackDb;
    } catch {
      return fallbackDb;
    }
  };

  const loadRealTransactions = async () => {
    try {
      const profile = await getProfile();
      const user = await ensureRemoteUserProfile(profile);
      if (!user) return [];
      const txs = await fetchTransactions(user.id, 250);
      return (txs || []).map((tx) => {
        const amount = Math.abs(Number(tx.amount) || 0);
        const when = tx.created_at ? new Date(tx.created_at) : new Date();
        const isExpense = tx.from_user === user.id;
        const ref = tx.reference || (isExpense ? "sent transfer" : "incoming transfer");
        return {
          amount,
          date: when,
          kind: isExpense ? "expense" : "income",
          category: isExpense ? classifyCategory(ref) : "Income",
          description: ref,
          source: "real"
        };
      });
    } catch {
      return [];
    }
  };

  const buildSyntheticTransactions = () => {
    const entries = Array.isArray(db.syntheticTransactions) ? db.syntheticTransactions : [];
    return entries.map((entry) => {
      const daysBack = Math.max(0, Number(entry.dayOffset) || 0);
      const when = new Date(now);
      when.setDate(when.getDate() - daysBack);
      return {
        amount: jitter(Number(entry.amount) || 0),
        date: when,
        kind: entry.kind === "income" ? "income" : "expense",
        category: entry.kind === "income" ? "Income" : (entry.category || "Other"),
        description: entry.description || "Synthetic record",
        source: "synthetic"
      };
    });
  };

  const buildDataset = async () => {
    const real = await loadRealTransactions();
    const synthetic = buildSyntheticTransactions();
    realTxCount = real.length;
    syntheticTxCount = synthetic.length;
    return [...real, ...synthetic].filter((tx) => tx.date instanceof Date && !Number.isNaN(tx.date.getTime()) && tx.amount > 0);
  };

  const renderAnalysis = (periodData) => {
    if (!analysisList || !analysisMeta) return;
    const { total, income, categories, trendValues } = periodData;
    const top = categories[0] || { name: "Other", amount: 0 };
    const target = Number(getCategoryMeta(top.name).monthlyTarget || 0);
    const overTarget = target > 0 && top.amount > target;
    const half = Math.max(1, Math.floor(trendValues.length / 2));
    const firstHalf = trendValues.slice(0, half).reduce((sum, v) => sum + v, 0);
    const secondHalf = trendValues.slice(half).reduce((sum, v) => sum + v, 0);
    const momentumUp = secondHalf > firstHalf * 1.12;
    const net = income - total;
    const topPct = total ? Math.round((top.amount / total) * 100) : 0;

    const lines = [
      `Net movement for this ${activePeriod} window is ${fmt(net)} (${fmt(income)} in, ${fmt(total)} out).`,
      momentumUp
        ? pickLine(db.analysisTemplates?.momentumHigh)
        : pickLine(db.analysisTemplates?.momentumStable),
      overTarget
        ? pickLine(db.analysisTemplates?.topCategoryPressure)
        : pickLine(db.analysisTemplates?.topCategoryHealthy),
      `${top.name} is your largest category at ${fmt(top.amount)} (${topPct}% of spend).`
    ].filter(Boolean);

    analysisMeta.textContent = `Built from ${realTxCount} recent account transactions + ${syntheticTxCount} simulated finance records.`;
    analysisList.innerHTML = "";
    lines.forEach((line) => {
      const item = document.createElement("div");
      item.className = "insights-analysis-item";
      item.textContent = line;
      analysisList.appendChild(item);
    });
  };

  const renderBars = (trend) => {
    if (!barsEl) return;
    barsEl.innerHTML = "";
    barsEl.style.gridTemplateColumns = `repeat(${Math.max(1, trend.length)}, minmax(0, 1fr))`;
    const max = Math.max(1, ...trend.map((p) => p.value));
    const setReadout = (barEl, point) => {
      if (!barReadout) return;
      barsEl.querySelectorAll(".insights-bar").forEach((el) => el.classList.remove("active"));
      if (barEl) barEl.classList.add("active");
      barReadout.textContent = `${point.label}: ${fmt(point.value)}`;
    };

    trend.forEach((point, idx) => {
      const bar = document.createElement("div");
      bar.className = "insights-bar";
      bar.setAttribute("role", "button");
      bar.setAttribute("tabindex", "0");
      bar.setAttribute("aria-label", `${point.label}: ${fmt(point.value)}`);
      bar.innerHTML = `<span style="height:${Math.max(6, (point.value / max) * 100)}%"></span>`;
      bar.onmouseenter = () => setReadout(bar, point);
      bar.onclick = () => setReadout(bar, point);
      bar.onfocus = () => setReadout(bar, point);
      bar.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setReadout(bar, point);
        }
      };
      barsEl.appendChild(bar);

      if (idx === trend.length - 1) setReadout(bar, point);
    });
  };

  const buildPeriodData = (period, transactions) => {
    const cfg = PERIOD_CONFIG[period] || PERIOD_CONFIG.week;
    const expenseTx = transactions.filter((tx) => tx.kind === "expense");
    const incomeTx = transactions.filter((tx) => tx.kind === "income");
    const total = expenseTx.reduce((sum, tx) => sum + tx.amount, 0);
    const income = incomeTx.reduce((sum, tx) => sum + tx.amount, 0);

    const categoryTotals = new Map();
    expenseTx.forEach((tx) => {
      categoryTotals.set(tx.category, (categoryTotals.get(tx.category) || 0) + tx.amount);
    });
    const categories = [...categoryTotals.entries()]
      .map(([name, amount]) => ({ name, amount, color: getCategoryMeta(name).color }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    const trend = [];
    if (cfg.mode === "day") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (cfg.days - 1));
      const bucket = new Map();
      for (let i = 0; i < cfg.days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        bucket.set(dateKey(d), 0);
      }
      expenseTx.forEach((tx) => {
        const key = dateKey(tx.date);
        if (bucket.has(key)) bucket.set(key, bucket.get(key) + tx.amount);
      });
      bucket.forEach((value, key) => {
        const d = new Date(`${key}T00:00:00`);
        const label = cfg.days <= 7
          ? d.toLocaleDateString("en-GB", { weekday: "short" })
          : `${d.getDate()}/${d.getMonth() + 1}`;
        trend.push({ label, value });
      });
    } else {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setMonth(monthStart.getMonth() - (cfg.months - 1));
      const bucket = new Map();
      for (let i = 0; i < cfg.months; i++) {
        const d = new Date(monthStart);
        d.setMonth(monthStart.getMonth() + i);
        bucket.set(toMonthKey(d), 0);
      }
      expenseTx.forEach((tx) => {
        const key = toMonthKey(tx.date);
        if (bucket.has(key)) bucket.set(key, bucket.get(key) + tx.amount);
      });
      bucket.forEach((value, key) => {
        const [year, month] = key.split("-").map(Number);
        const d = new Date(year, month - 1, 1);
        trend.push({ label: d.toLocaleDateString("en-GB", { month: "short" }), value });
      });
    }

    const monthExpenses = transactions
      .filter((tx) => tx.kind === "expense")
      .filter((tx) => now.getTime() - tx.date.getTime() <= 30 * 86400000)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const monthIncome = transactions
      .filter((tx) => tx.kind === "income")
      .filter((tx) => now.getTime() - tx.date.getTime() <= 30 * 86400000)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const safeToSpend = Math.max(0, (monthIncome - monthExpenses) * 0.45 + 80);

    return {
      total,
      income,
      safeToSpend,
      categories,
      trend,
      trendValues: trend.map((t) => t.value)
    };
  };

  const render = async (period) => {
    activePeriod = period;
    const all = await buildDataset();
    const cfg = PERIOD_CONFIG[period] || PERIOD_CONFIG.week;
    const cutoff = new Date(now);
    if (cfg.mode === "day") cutoff.setDate(cutoff.getDate() - (cfg.days - 1));
    else cutoff.setMonth(cutoff.getMonth() - (cfg.months - 1), 1);
    cutoff.setHours(0, 0, 0, 0);

    const filtered = all.filter((tx) => tx.date >= cutoff);
    const d = buildPeriodData(period, filtered);
    if (totalEl) totalEl.textContent = fmt(d.total);
    if (safeEl) safeEl.textContent = fmt(d.safeToSpend);
    if (trendLabel) trendLabel.textContent = cfg.label;

    if (legendEl) {
      legendEl.innerHTML = "";
      d.categories.forEach((c) => {
        const row = document.createElement("div");
        row.className = "insights-legend-row";
        row.innerHTML = `<span class="insights-dot" style="background:${c.color}"></span><span>${c.name}</span><span class="muted">${fmt(c.amount)}</span>`;
        legendEl.appendChild(row);
      });
    }

    if (donutEl && donutLabel) {
      const top = d.categories[0]?.amount || 0;
      const pct = d.total ? Math.round((top / d.total) * 100) : 0;
      donutEl.setAttribute("stroke-dasharray", `${pct * 2.76} 276`);
      donutLabel.textContent = `${pct}%`;
    }

    if (sparkEl) {
      sparkEl.innerHTML = "";
      const spark = d.trend.slice(-7);
      const max = Math.max(1, ...spark.map((p) => p.value));
      spark.forEach((point) => {
        const bar = document.createElement("div");
        bar.style.height = `${Math.max(20, (point.value / max) * 60)}px`;
        sparkEl.appendChild(bar);
      });
    }

    renderBars(d.trend);

    if (categoriesEl) {
      categoriesEl.innerHTML = "";
      d.categories.forEach((c) => {
        const tile = document.createElement("div");
        tile.className = "insights-category";
        tile.innerHTML = `<div class="insights-category-top"><span>${c.name}</span><span>${fmt(c.amount)}</span></div><div class="insights-bar-mini"><span style="width:${d.total ? (c.amount / d.total) * 100 : 0}%;background:${c.color}"></span></div>`;
        categoriesEl.appendChild(tile);
      });
    }

    renderAnalysis(d);
    saveHomeInsightsSnapshot(period, d);
  };

  db = await loadDb();

  periodBtns.forEach((btn) => {
    btn.onclick = () => {
      periodBtns.forEach((b) => b.classList.toggle("active", b === btn));
      render(btn.dataset.period || "week");
    };
  });

  if (refreshBtn) {
    refreshBtn.onclick = () => {
      refreshSeed += 1;
      render(activePeriod);
    };
  }

  const storedPeriod = localStorage.getItem(STORAGE_KEYS.insightsActivePeriod) || "week";
  const initialBtn = [...periodBtns].find((btn) => btn.dataset.period === storedPeriod);
  if (initialBtn) {
    periodBtns.forEach((b) => b.classList.toggle("active", b === initialBtn));
  }
  await render(initialBtn?.dataset.period || "week");
}

function initHomeInsightsCard() {
  const donutEl = document.querySelector("#homeInsightsDonut");
  const label = document.querySelector("#homeInsightsLabel");
  const totalEl = document.querySelector("#homeInsightsTotal");
  const legendEl = document.querySelector("#homeInsightsLegend");
  const periodBtns = document.querySelectorAll(".insights-mini-tabs .insights-chip");
  if (!donutEl || !label) return;

  const fallbackData = {
    week: {
      total: 210,
      categories: [
        { name: "Groceries", amount: 78, color: "#0aa85d" },
        { name: "Subscriptions", amount: 24, color: "#8dd9b3" },
        { name: "Entertainment", amount: 32, color: "#4cbe86" },
        { name: "Bills", amount: 46, color: "#2c8f63" },
        { name: "Other", amount: 30, color: "#b5e5cf" }
      ]
    },
    month: {
      total: 820,
      categories: [
        { name: "Groceries", amount: 240, color: "#0aa85d" },
        { name: "Subscriptions", amount: 80, color: "#8dd9b3" },
        { name: "Entertainment", amount: 120, color: "#4cbe86" },
        { name: "Bills", amount: 260, color: "#2c8f63" },
        { name: "Other", amount: 120, color: "#b5e5cf" }
      ]
    },
    year: {
      total: 9900,
      categories: [
        { name: "Groceries", amount: 2900, color: "#0aa85d" },
        { name: "Subscriptions", amount: 1200, color: "#8dd9b3" },
        { name: "Entertainment", amount: 1600, color: "#4cbe86" },
        { name: "Bills", amount: 2500, color: "#2c8f63" },
        { name: "Other", amount: 1700, color: "#b5e5cf" }
      ]
    }
  };

  const getCachedData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.insightsHomeCache);
      const cache = raw ? JSON.parse(raw) : {};
      return {
        week: cache.week || fallbackData.week,
        month: cache.month || fallbackData.month,
        year: cache.year || fallbackData.year
      };
    } catch {
      return fallbackData;
    }
  };

  const fmt = (value) => `£${Math.round(value).toLocaleString()}`;

  const render = (period) => {
    const data = getCachedData();
    const d = data[period] || data.week;
    const focus = d.categories?.[0] || { name: "Other", amount: 0, color: "#0aa85d" };
    const pct = d.total ? Math.round((focus.amount / d.total) * 100) : 0;
    donutEl.setAttribute("stroke-dasharray", `${pct * 2.76} 276`);
    label.textContent = `${pct}%`;
    if (totalEl) totalEl.textContent = fmt(d.total);

    if (legendEl) {
      legendEl.innerHTML = "";
      (d.categories || []).forEach((c) => {
        const row = document.createElement("div");
        row.innerHTML = `<span class="insights-dot" style="background:${c.color};"></span>${c.name} <strong>${fmt(c.amount)}</strong>`;
        legendEl.appendChild(row);
      });
    }
  };

  periodBtns.forEach((btn) => {
    btn.onclick = () => {
      periodBtns.forEach((b) => b.classList.toggle("active", b === btn));
      localStorage.setItem(STORAGE_KEYS.insightsActivePeriod, btn.dataset.period || "week");
      render(btn.dataset.period || "week");
    };
  });

  const storedActive = localStorage.getItem(STORAGE_KEYS.insightsActivePeriod) || "week";
  const active = [...periodBtns].find((btn) => btn.dataset.period === storedActive)
    || document.querySelector(".insights-mini-tabs .insights-chip.active");
  if (active) {
    periodBtns.forEach((b) => b.classList.toggle("active", b === active));
  }
  render(active?.dataset.period || "week");
}

function initBudgetPots() {
  const moveBtn = document.querySelector("#moveMoneyBtn");
  const grid = document.querySelector("#potsGrid");
  const empty = document.querySelector("#potsEmpty");
  const totalEl = document.querySelector("#potsTotal");
  const newBtn = document.querySelector("#newPotBtn");
  if (moveBtn) moveBtn.onclick = () => go("/move-from-pot");
  if (newBtn) newBtn.onclick = () => go("/pot-create");

  const render = async () => {
    const pots = await getBudgetPots();
    if (grid) grid.innerHTML = "";
    const total = pots.reduce((sum, pot) => sum + Number(pot.balance || 0), 0);
    if (totalEl) totalEl.textContent = formatMoney(total);

    if (!pots.length) {
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";

    pots.forEach((pot) => {
      const pct = pot.goal ? Math.min(100, Math.round((pot.balance / pot.goal) * 100)) : 0;
      const card = document.createElement("button");
      card.className = "pot-card";
      card.type = "button";
      card.style.background = pot.color || POT_COLORS[0];
      card.innerHTML = `
        <div style="font-size:18px;">${formatMoney(pot.balance)}</div>
        <div style="font-size:12px;">${pot.goal ? `${pct}% of goal` : "No goal set"}</div>
        <div style="margin-top:8px;">${pot.emoji || "🪴"} ${pot.name}</div>
      `;
      card.onclick = () => go(`/pot-detail?id=${encodeURIComponent(pot.id)}`);
      grid.appendChild(card);
    });
  };

  render();
}

function initDealDash() {
  const search = document.querySelector("#dealSearch");
  const chips = document.querySelectorAll("[data-sort]");
  const label = document.querySelector("#dealSortLabel");
  const results = document.querySelector("#dealResults");
  const empty = document.querySelector("#dealEmpty");
  const loading = document.querySelector("#dealLoading");
  let allItems = [];
  let activeSort = "Closest";
  let searchTimer = null;
  let loadingTimer = null;
  let lastRenderCount = 6;
  let locationCoords = null;

  if (!chips.length) return;

  const fmt = (value) => `£${Number(value).toFixed(2)}`;
  const hashNumber = (str = "") => [...String(str)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const distanceForItem = (item) => {
    const base = Number(item.distanceMiles || 0);
    if (!locationCoords) return base;
    const coordNoise = Math.abs((locationCoords.lat * 7.13 + locationCoords.lng * 3.71) % 1);
    const itemNoise = (hashNumber(item.id || item.name || "") % 17) / 100;
    return Math.max(0.1, base * (0.72 + coordNoise * 0.4) + itemNoise - 0.12);
  };

  const render = (items) => {
    if (!results) return;
    results.innerHTML = "";
    if (!items.length) {
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "deal-card";
      card.innerHTML = `
        <div class="deal-brand">
          <div class="brand-box">${(item.store || "S").slice(0, 1)}</div>
          <div>
            <div>${item.name}</div>
            <div style="font-weight:800;">${fmt(item.price)} <span class="muted" style="font-weight:600;">${item.unit || ""}</span></div>
            <div class="muted" style="font-size:12px;">${item.store}</div>
          </div>
        </div>
        <div class="deal-meta">
          <span>${Number((item._distanceMiles ?? item.distanceMiles) || 0).toFixed(1)} mi</span>
          <span>${item.address || ""}</span>
        </div>
      `;
      results.appendChild(card);
    });
    lastRenderCount = items.length || lastRenderCount;
  };

  const filterAndSort = () => {
    const term = search?.value.trim().toLowerCase() || "";
    let filtered = allItems.filter((item) => {
      if (!term) return true;
      return [item.name, item.brand, item.store, item.category].some((field) =>
        String(field || "").toLowerCase().includes(term)
      );
    });

    if (activeSort === "Cheapest") {
      filtered = filtered.sort((a, b) => a.price - b.price);
    } else if (activeSort === "Popular") {
      filtered = filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } else {
      filtered = filtered.sort((a, b) => ((a._distanceMiles ?? a.distanceMiles) || 0) - ((b._distanceMiles ?? b.distanceMiles) || 0));
    }

    render(filtered);
  };

  const showSearchLoading = (cb) => {
    if (loadingTimer) clearTimeout(loadingTimer);
    if (loading) {
      const count = Math.max(lastRenderCount, 6);
      loading.innerHTML = Array.from({ length: count })
        .map(
          () => `
          <div class="deal-skeleton">
            <div class="skeleton-circle"></div>
            <div class="skeleton-lines">
              <span></span>
              <span class="short"></span>
            </div>
            <div class="skeleton-meta"></div>
          </div>
        `
        )
        .join("");
      loading.classList.remove("hidden");
    }
    loadingTimer = setTimeout(() => {
      cb();
      if (loading) loading.classList.add("hidden");
    }, 350);
  };

  chips.forEach((chip) => {
    chip.onclick = () => {
      chips.forEach((c) => c.classList.toggle("active", c === chip));
      activeSort = chip.dataset.sort || "Closest";
      if (label) label.textContent = activeSort;
      showSearchLoading(filterAndSort);
    };
  });

  if (search) {
    search.oninput = () => {
      const val = search.value.trim();
      search.dataset.hasValue = val ? "true" : "false";
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        showSearchLoading(filterAndSort);
      }, 250);
    };
  }

  const loadStart = Date.now();
  const minDelay = 600;
  if (loading) {
    loading.innerHTML = Array.from({ length: 6 })
      .map(
        () => `
        <div class="deal-skeleton">
          <div class="skeleton-circle"></div>
          <div class="skeleton-lines">
            <span></span>
            <span class="short"></span>
          </div>
          <div class="skeleton-meta"></div>
        </div>
      `
      )
      .join("");
    loading.classList.remove("hidden");
  }
  fetch("./assets/data/deal-dash.json")
    .then((res) => res.json())
    .then(async (data) => {
      const profile = await getProfile();
      locationCoords = profile?.settings?.location ? profile?.locationCoords || null : null;
      allItems = Array.isArray(data) ? data : [];
      allItems = allItems.map((item) => ({
        ...item,
        _distanceMiles: distanceForItem(item)
      }));
      lastRenderCount = allItems.length || lastRenderCount;
      filterAndSort();
      const wait = Math.max(0, minDelay - (Date.now() - loadStart));
      if (loading) setTimeout(() => loading.classList.add("hidden"), wait);
    })
    .catch(() => {
      allItems = [];
      filterAndSort();
      const wait = Math.max(0, minDelay - (Date.now() - loadStart));
      if (loading) setTimeout(() => loading.classList.add("hidden"), wait);
    });
}

function initFriends() {
  const input = document.querySelector("#friendSearchInput");
  const results = document.querySelector("#friendSearchResults");
  const requestsWrap = document.querySelector("#friendRequests");
  const listWrap = document.querySelector("#friendList");

  const render = (profile) => {
    const friends = Array.isArray(profile.friends) ? profile.friends : [];
    const requests = Array.isArray(profile.friendRequests) ? profile.friendRequests : [];
    const dmUnread = profile?.dmUnread && typeof profile.dmUnread === "object" ? profile.dmUnread : {};

    if (requestsWrap) {
      requestsWrap.innerHTML = "";
      if (!requests.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No pending requests.";
        requestsWrap.appendChild(empty);
      } else {
        requests.forEach((req) => {
          const row = document.createElement("div");
          row.className = "settings-item";
          row.innerHTML = `<span>${req.name}</span>`;
          const actions = document.createElement("div");
          actions.style.display = "flex";
          actions.style.gap = "8px";
          const accept = document.createElement("button");
          accept.className = "action-btn";
          accept.textContent = "Accept";
          const decline = document.createElement("button");
          decline.className = "action-btn";
          decline.textContent = "Decline";
          accept.onclick = async () => {
            const nextFriends = [...friends, req];
            const nextRequests = requests.filter((r) => r.id !== req.id);
            await updateProfile({ friends: nextFriends, friendRequests: nextRequests });
            const updated = await getProfile();
            render(updated);
          };
          decline.onclick = async () => {
            const nextRequests = requests.filter((r) => r.id !== req.id);
            await updateProfile({ friendRequests: nextRequests });
            const updated = await getProfile();
            render(updated);
          };
          actions.appendChild(accept);
          actions.appendChild(decline);
          row.appendChild(actions);
          requestsWrap.appendChild(row);
        });
      }
    }

    if (listWrap) {
      listWrap.innerHTML = "";
      if (!friends.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No friends added yet.";
        listWrap.appendChild(empty);
      } else {
        friends.forEach((f) => {
          const row = document.createElement("div");
          row.className = "settings-item friend-list-item";

          const info = document.createElement("div");
          info.className = "friend-list-info";
          info.innerHTML = `<strong>${f.name}</strong>`;
          const unreadCount = Math.max(0, Number(dmUnread[f.id] || 0));
          if (unreadCount > 0) {
            const unread = document.createElement("span");
            unread.className = "friend-unread";
            unread.textContent = `New message ${unreadCount > 1 ? `(${unreadCount})` : ""}`;
            info.appendChild(unread);
          }

          const actions = document.createElement("div");
          actions.className = "friend-list-actions";

          const sendBtn = document.createElement("button");
          sendBtn.className = "friend-action-btn";
          sendBtn.type = "button";
          sendBtn.textContent = "Send money";
          sendBtn.onclick = () => go(`/payments?to=${encodeURIComponent(f.id)}`);

          const splitBtn = document.createElement("button");
          splitBtn.className = "friend-action-btn secondary";
          splitBtn.type = "button";
          splitBtn.textContent = "Split bill";
          splitBtn.onclick = () => go("/bill-splitting");

          const messageBtn = document.createElement("button");
          messageBtn.className = "friend-action-btn dm";
          messageBtn.type = "button";
          messageBtn.textContent = "Message";
          messageBtn.onclick = () => go(`/dms?friend=${encodeURIComponent(f.id)}`);

          actions.appendChild(sendBtn);
          actions.appendChild(splitBtn);
          actions.appendChild(messageBtn);
          row.appendChild(info);
          row.appendChild(actions);
          listWrap.appendChild(row);
        });
      }
    }
  };

  const search = async (query) => {
    const profile = await getProfile();
    const friends = Array.isArray(profile.friends) ? profile.friends : [];
    const requests = Array.isArray(profile.friendRequests) ? profile.friendRequests : [];
    const currentUser = await getSupabaseUser();
    const q = query.trim().toLowerCase();
    if (!results) return;
    results.innerHTML = "";
    if (!q) return;

    let directory = [];
    try {
      const users = await fetchUsers();
      directory = users
        .filter((u) => u.id !== currentUser?.id)
        .map((u) => ({ id: u.id, name: u.name || "User", handle: "" }));
    } catch {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Search unavailable right now.";
      results.appendChild(empty);
      return;
    }

    const matches = directory.filter((p) => p.name.toLowerCase().includes(q));

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No matches found.";
      results.appendChild(empty);
      return;
    }

    matches.forEach((person) => {
      const row = document.createElement("div");
      row.className = "friend-result";
      const name = document.createElement("div");
      name.innerHTML = `<strong>${person.name}</strong>`;
      const btn = document.createElement("button");
      btn.className = "action-btn";
      const alreadyFriend = friends.some((f) => f.id === person.id);
      const alreadyRequested = requests.some((r) => r.id === person.id);
      btn.disabled = alreadyFriend || alreadyRequested;
      btn.textContent = alreadyFriend ? "Friends" : alreadyRequested ? "Requested" : "Add";
      btn.onclick = async () => {
        if (alreadyFriend || alreadyRequested) return;
        const nextRequests = [...requests, person];
        await updateProfile({ friendRequests: nextRequests });
        const updated = await getProfile();
        render(updated);
        search(query);
      };
      row.appendChild(name);
      row.appendChild(btn);
      results.appendChild(row);
    });
  };

  getProfile().then((profile) => render(profile));

  if (input) {
    input.oninput = () => search(input.value);
  }
}

function initDMs() {
  const friendList = document.querySelector("#dmFriendList");
  const titleEl = document.querySelector("#dmThreadTitle");
  const messagesEl = document.querySelector("#dmThreadMessages");
  const messageInput = document.querySelector("#dmMessageInput");
  const sendMessageBtn = document.querySelector("#dmSendMessageBtn");
  const amountInput = document.querySelector("#dmAmountInput");
  const sendMoneyBtn = document.querySelector("#dmSendMoneyBtn");
  const requestMoneyBtn = document.querySelector("#dmRequestMoneyBtn");
  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const preselectId = params.get("friend") || "";
  let currentFriendId = preselectId;
  let friends = [];
  let threads = {};
  let unreadByFriend = {};

  const normalizeUnread = (value) => {
    if (!value || typeof value !== "object") return {};
    const out = {};
    Object.entries(value).forEach(([id, count]) => {
      const next = Math.max(0, Number(count || 0));
      if (next > 0) out[id] = next;
    });
    return out;
  };

  const persistThreads = async () => {
    localStorage.setItem(STORAGE_KEYS.dmThreads, JSON.stringify(threads));
    localStorage.setItem(STORAGE_KEYS.dmUnread, JSON.stringify(unreadByFriend));
    await updateProfile({ dmThreads: threads, dmUnread: unreadByFriend });
  };

  const threadFor = (friendId) => {
    if (!threads[friendId]) threads[friendId] = [];
    return threads[friendId];
  };

  const appendMessage = async (friendId, message) => {
    const thread = threadFor(friendId);
    thread.push({
      id: message.id || `dm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: message.createdAt || new Date().toISOString(),
      ...message
    });
    const isIncoming = message?.direction === "in";
    if (isIncoming) {
      const isOpenThread = currentFriendId === friendId;
      const isVisible = document.visibilityState === "visible";
      if (!isOpenThread || !isVisible) {
        unreadByFriend[friendId] = Math.max(0, Number(unreadByFriend[friendId] || 0)) + 1;
      }
    }
    await persistThreads();
    renderFriendList();
    renderThread();
  };

  const friendById = (id) => friends.find((f) => f.id === id);

  const renderFriendList = () => {
    if (!friendList) return;
    friendList.innerHTML = "";
    if (!friends.length) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "No friends available.";
      friendList.appendChild(empty);
      return;
    }
    friends.forEach((f) => {
      const btn = document.createElement("button");
      btn.className = "dm-friend-btn";
      btn.type = "button";
      const nameLabel = document.createElement("span");
      nameLabel.textContent = f.name || "Friend";
      btn.appendChild(nameLabel);
      const unreadCount = Math.max(0, Number(unreadByFriend[f.id] || 0));
      if (unreadCount > 0) {
        const unread = document.createElement("span");
        unread.className = "dm-unread";
        unread.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
        btn.appendChild(unread);
      }
      btn.classList.toggle("active", f.id === currentFriendId);
      btn.onclick = async () => {
        currentFriendId = f.id;
        if (unreadByFriend[f.id]) {
          delete unreadByFriend[f.id];
          await persistThreads();
        }
        renderFriendList();
        renderThread();
      };
      friendList.appendChild(btn);
    });
  };

  const renderThread = () => {
    const friend = friendById(currentFriendId);
    if (!friend) {
      if (titleEl) titleEl.textContent = "Choose a friend";
      if (messagesEl) messagesEl.innerHTML = `<div class="muted">Pick a friend to start chatting.</div>`;
      return;
    }
    if (titleEl) titleEl.textContent = friend.name || "Friend";
    if (unreadByFriend[friend.id]) {
      delete unreadByFriend[friend.id];
      persistThreads().then(() => renderFriendList());
    }
    if (!messagesEl) return;
    const thread = threadFor(friend.id);
    messagesEl.innerHTML = "";
    if (!thread.length) {
      messagesEl.innerHTML = `<div class="muted">No messages yet.</div>`;
      return;
    }
    thread.forEach((msg) => {
      const row = document.createElement("div");
      row.className = `dm-msg ${msg.direction === "out" ? "out" : "in"}`;
      if (msg.type === "payment") {
        row.innerHTML = `<strong>${msg.direction === "out" ? "You sent" : "Incoming"} ${formatMoney(msg.amount || 0)}</strong><span>${msg.text || ""}</span>`;
      } else if (msg.type === "request") {
        row.innerHTML = `<strong>Request ${formatMoney(msg.amount || 0)}</strong><span>${msg.text || ""}</span>`;
      } else {
        row.textContent = msg.text || "";
      }
      messagesEl.appendChild(row);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const sendTextMessage = async () => {
    const friend = friendById(currentFriendId);
    const text = messageInput?.value?.trim() || "";
    if (!friend || !text) return;
    await appendMessage(friend.id, { type: "text", direction: "out", text });
    const isTaylor = String(friend.name || "").trim().toLowerCase() === "taylor brooks";
    if (isTaylor) {
      setTimeout(async () => {
        await appendMessage(friend.id, { type: "text", direction: "in", text: "yes sure!!" });
        await appendMessage(friend.id, {
          type: "payment",
          direction: "in",
          amount: 10,
          text: `Sent ${formatMoney(10)}`
        });
        await applySimulatedBalanceAdjustment(10);
      }, 700);
    }
    if (messageInput) messageInput.value = "";
  };

  const sendMoneyFromDM = async (requestOnly = false) => {
    const friend = friendById(currentFriendId);
    const amount = Number(amountInput?.value || 0);
    if (!friend) return showActionModal({ title: "Choose a Friend", message: "Select a friend first." });
    if (!amount || amount <= 0) return showActionModal({ title: "Invalid Amount", message: "Enter a valid amount first." });

    if (requestOnly) {
      await appendMessage(friend.id, {
        type: "request",
        direction: "out",
        amount,
        text: `Can you send me ${formatMoney(amount)}?`
      });
      return;
    }

    const available = await getAvailableMainAccountBalance();
    if (amount > available) {
      showActionModal({
        title: "Insufficient Funds",
        message: `You only have ${formatMoney(available)} available in your current account.`
      });
      return;
    }

    const isFake = String(friend.id || "").startsWith("fake_friend_");
    if (isFake) {
      await recordSimulatedTransfer({
        receiverId: friend.id,
        receiverName: friend.name || "friend",
        amount,
        reference: `DM to ${friend.name || "friend"}`
      });
    } else {
      const user = await getSupabaseUser();
      if (!user) return showActionModal({ title: "Not Signed In", message: "Please sign in to send money." });
      await transferFunds({
        senderId: user.id,
        receiverId: friend.id,
        amount,
        reference: `DM to ${friend.name || "friend"}`
      });
    }
    await appendMessage(friend.id, {
      type: "payment",
      direction: "out",
      amount,
      text: `Sent ${formatMoney(amount)}`
    });
    if (amountInput) amountInput.value = "";
  };

  if (sendMessageBtn) sendMessageBtn.onclick = sendTextMessage;
  if (messageInput) {
    messageInput.onkeydown = (e) => {
      if (e.key === "Enter") sendTextMessage();
    };
  }
  if (sendMoneyBtn) sendMoneyBtn.onclick = () => sendMoneyFromDM(false);
  if (requestMoneyBtn) requestMoneyBtn.onclick = () => sendMoneyFromDM(true);

  getProfile().then((profile) => {
    friends = Array.isArray(profile.friends) ? profile.friends : [];
    const localThreads = localStorage.getItem(STORAGE_KEYS.dmThreads);
    const localUnread = localStorage.getItem(STORAGE_KEYS.dmUnread);
    try {
      threads = (localThreads ? JSON.parse(localThreads) : profile.dmThreads) || {};
    } catch {
      threads = profile.dmThreads || {};
    }
    try {
      unreadByFriend = normalizeUnread(localUnread ? JSON.parse(localUnread) : profile.dmUnread);
    } catch {
      unreadByFriend = normalizeUnread(profile.dmUnread);
    }
    if (!currentFriendId && friends[0]) currentFriendId = friends[0].id;
    renderFriendList();
    renderThread();
  });
}

function initMoneyMinutes() {
  const reels = document.querySelectorAll(".reel-card");
  reels.forEach((reel) => {
    const video = reel.querySelector("video");
    const btn = reel.querySelector(".reel-sound");
    if (!video || !btn) return;

    const updateIcon = () => {
      btn.textContent = video.muted ? "🔇" : "🔊";
    };

    btn.onclick = async () => {
      video.muted = !video.muted;
      try {
        await video.play();
      } catch {
        // ignore autoplay restrictions
      }
      updateIcon();
    };

    updateIcon();
  });
}

// Learning content (modules + quizzes)
const LEARN_MODULES = [
  {
    id: "mod-foundations",
    title: "Money Foundations",
    desc: "Budgeting, goals, and smart habits.",
    quizzes: ["q1", "q2"],
    difficulty: "Beginner",
    difficultyLevel: 1
  },
  {
    id: "mod-safety",
    title: "Safe Spending",
    desc: "Avoiding overspend and building buffers.",
    quizzes: ["q3"],
    difficulty: "Beginner",
    difficultyLevel: 1
  },
  {
    id: "mod-growth",
    title: "Growing Savings",
    desc: "Pots, interest, and long-term wins.",
    quizzes: ["q4", "q5"],
    difficulty: "Intermediate",
    difficultyLevel: 2
  },
  {
    id: "mod-investing",
    title: "Investing Essentials",
    desc: "Risk, returns, and long-term portfolio basics.",
    quizzes: ["q6"],
    difficulty: "Advanced",
    difficultyLevel: 3
  },
  {
    id: "mod-credit",
    title: "Credit & Borrowing",
    desc: "Credit scores, interest costs, and debt strategy.",
    quizzes: ["q7"],
    difficulty: "Advanced",
    difficultyLevel: 3
  }
];

function modulesForCompetency(level = "beginner") {
  if (level === "expert" || level === "confident") {
    return [...LEARN_MODULES].sort((a, b) => b.difficultyLevel - a.difficultyLevel);
  }
  if (level === "comfortable") {
    return [...LEARN_MODULES]
      .filter((m) => m.difficultyLevel <= 2 || m.id === "mod-investing")
      .sort((a, b) => a.difficultyLevel - b.difficultyLevel);
  }
  return LEARN_MODULES.filter((m) => m.difficultyLevel <= 2);
}

const QUIZ_VIDEO_PLACEHOLDER = "./v24044gl0000ctelhbfog65h4q43vj90.MP4";

const QUIZ_BANK = {
  q1: {
    title: "Budget basics",
    video: QUIZ_VIDEO_PLACEHOLDER,
    questions: [
      { q: "Placeholder question 1?", choices: ["Answer A", "Answer B", "Answer C"], correct: 0 },
      { q: "Placeholder question 2?", choices: ["Option 1", "Option 2", "Option 3"], correct: 1 },
      { q: "Placeholder question 3?", choices: ["Choice 1", "Choice 2", "Choice 3"], correct: 2 }
    ]
  },
  q2: {
    title: "Needs vs wants",
    video: QUIZ_VIDEO_PLACEHOLDER,
    questions: [
      { q: "Placeholder question 1?", choices: ["A", "B", "C"], correct: 0 },
      { q: "Placeholder question 2?", choices: ["A", "B", "C"], correct: 1 }
    ]
  },
  q3: {
    title: "Safe to spend",
    video: QUIZ_VIDEO_PLACEHOLDER,
    questions: [
      { q: "Placeholder question 1?", choices: ["A", "B", "C"], correct: 2 },
      { q: "Placeholder question 2?", choices: ["A", "B", "C"], correct: 0 }
    ]
  },
  q4: {
    title: "Pots strategy",
    video: QUIZ_VIDEO_PLACEHOLDER,
    questions: [
      { q: "Placeholder question 1?", choices: ["A", "B", "C"], correct: 1 },
      { q: "Placeholder question 2?", choices: ["A", "B", "C"], correct: 2 }
    ]
  },
  q5: {
    title: "Saving momentum",
    video: QUIZ_VIDEO_PLACEHOLDER,
    questions: [
      { q: "Placeholder question 1?", choices: ["A", "B", "C"], correct: 0 }
    ]
  },
  q6: {
    title: "Risk and return",
    video: QUIZ_VIDEO_PLACEHOLDER,
    questions: [
      { q: "Higher expected returns usually come with...", choices: ["Lower risk", "Higher risk", "No risk"], correct: 1 },
      { q: "Diversification helps mainly by...", choices: ["Removing all risk", "Spreading risk", "Doubling gains"], correct: 1 }
    ]
  },
  q7: {
    title: "Credit strategy",
    video: QUIZ_VIDEO_PLACEHOLDER,
    questions: [
      { q: "Paying only minimum card payments usually...", choices: ["Reduces total interest", "Increases total interest", "Has no effect"], correct: 1 },
      { q: "A healthy credit score can help with...", choices: ["Better borrowing rates", "Worse rates", "No difference"], correct: 0 }
    ]
  }
};

function initLearn() {
  const grid = document.querySelector("#moduleGrid");
  const overallPct = document.querySelector("#learnOverallPct");
  const overallBar = document.querySelector("#learnOverallBar");
  const streakEl = document.querySelector("#learnStreak");

  getProfile().then((profile) => {
    const moduleSet = modulesForCompetency(profile.financeCompetency);
    const completed = Array.isArray(profile.quizCompleted) ? profile.quizCompleted : [];
    const totalQuizzes = moduleSet.reduce((sum, mod) => sum + mod.quizzes.length, 0);
    const pct = totalQuizzes ? Math.round((completed.length / totalQuizzes) * 100) : 0;

    if (overallPct) overallPct.textContent = `${pct}%`;
    if (overallBar) overallBar.style.width = `${pct}%`;
    if (streakEl) streakEl.textContent = `${profile.learningStreak || 0} days`;

    if (!grid) return;
    grid.innerHTML = "";
    moduleSet.forEach((mod) => {
      const doneCount = mod.quizzes.filter((q) => completed.includes(q)).length;
      const modPct = mod.quizzes.length ? Math.round((doneCount / mod.quizzes.length) * 100) : 0;
      const card = document.createElement("div");
      card.className = "module-card";
      card.innerHTML = `
        <div class="module-top">
          <div>
            <div class="module-title">${mod.title}</div>
            <div class="muted">${mod.desc}</div>
            <div class="module-difficulty level-${mod.difficultyLevel}">⚡ ${mod.difficulty}</div>
          </div>
          <div class="module-pill">${doneCount}/${mod.quizzes.length}</div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${modPct}%"></div>
        </div>
        <button class="action-btn module-open" data-module="${mod.id}" type="button">Open module</button>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll(".module-open").forEach((btn) => {
      btn.onclick = () => {
        const modId = btn.dataset.module;
        go(`/quizzes?module=${encodeURIComponent(modId)}`);
      };
    });
  });
}

function initQuizzes() {
  const list = document.querySelector("#quizList");
  const moduleTitle = document.querySelector("#quizModuleTitle");
  const moduleDesc = document.querySelector("#quizModuleDesc");
  const modulePct = document.querySelector("#quizModulePct");
  const moduleBar = document.querySelector("#quizModuleBar");
  const moduleCount = document.querySelector("#quizModuleCount");

  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  getProfile().then((profile) => {
    const moduleSet = modulesForCompetency(profile.financeCompetency);
    const modId = params.get("module") || moduleSet[0]?.id || LEARN_MODULES[0].id;
    const mod = LEARN_MODULES.find((m) => m.id === modId) || moduleSet[0] || LEARN_MODULES[0];
    if (moduleTitle) moduleTitle.textContent = mod.title;
    if (moduleDesc) moduleDesc.textContent = `${mod.desc} • ⚡ ${mod.difficulty}`;
    const completed = Array.isArray(profile.quizCompleted) ? profile.quizCompleted : [];
    const done = mod.quizzes.filter((q) => completed.includes(q)).length;
    const pct = mod.quizzes.length ? Math.round((done / mod.quizzes.length) * 100) : 0;
    if (modulePct) modulePct.textContent = `${pct}%`;
    if (moduleBar) moduleBar.style.width = `${pct}%`;
    if (moduleCount) moduleCount.textContent = `${done} / ${mod.quizzes.length} quizzes`;

    if (!list) return;
    list.innerHTML = "";
    mod.quizzes.forEach((qid) => {
      const quiz = QUIZ_BANK[qid];
      const card = document.createElement("div");
      card.className = "learn-card";
      card.innerHTML = `
        <div>
          <div class="title">${quiz.title}</div>
          <div class="meta">Video + ${quiz.questions.length} questions</div>
        </div>
        <button class="action-btn" type="button">${completed.includes(qid) ? "Review" : "Start"}</button>
      `;
      card.querySelector("button").onclick = () => go(`/quiz-video?id=${encodeURIComponent(qid)}&module=${encodeURIComponent(mod.id)}`);
      list.appendChild(card);
    });
  });
}

function initQuizVideo() {
  const title = document.querySelector("#quizVideoTitle");
  const video = document.querySelector("#quizVideo");
  const startBtn = document.querySelector("#quizStartBtn");
  const soundBtn = document.querySelector("#quizVideoSound");

  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const id = params.get("id") || "q1";
  const mod = params.get("module") || LEARN_MODULES[0].id;
  const quiz = QUIZ_BANK[id];
  if (!quiz) return;

  if (title) title.textContent = quiz.title;
  if (video) video.src = quiz.video;
  if (startBtn) startBtn.onclick = () => go(`/quiz-questions?id=${encodeURIComponent(id)}&module=${encodeURIComponent(mod)}`);

  if (video && soundBtn) {
    const updateIcon = () => {
      soundBtn.textContent = video.muted ? "🔇" : "🔊";
    };
    soundBtn.onclick = async () => {
      video.muted = !video.muted;
      try {
        await video.play();
      } catch {
        // ignore autoplay restrictions
      }
      updateIcon();
    };
    updateIcon();
  }
}

function initQuizQuestions() {
  const qEl = document.querySelector("#quizQuestion");
  const choicesEl = document.querySelector("#quizChoices");
  const progressEl = document.querySelector("#quizProgress");
  const scoreEl = document.querySelector("#quizScore");
  const nextBtn = document.querySelector("#quizNextBtn");
  const backBtn = document.querySelector("#quizBackBtn");
  const errEl = document.querySelector("#quizError");

  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const id = params.get("id") || "q1";
  const mod = params.get("module") || LEARN_MODULES[0].id;
  const quiz = QUIZ_BANK[id];
  if (!quiz) return;

  let index = 0;
  let correct = 0;
  let selected = null;

  const render = () => {
    if (errEl) errEl.textContent = "";
    const total = quiz.questions.length;
    if (progressEl) progressEl.textContent = `Question ${index + 1} of ${total}`;
    if (scoreEl) scoreEl.textContent = `${correct} correct`;
    if (qEl) qEl.textContent = quiz.questions[index].q;

    if (choicesEl) {
      choicesEl.innerHTML = "";
      quiz.questions[index].choices.forEach((c, i) => {
        const btn = document.createElement("button");
        btn.className = "quiz-choice";
        btn.textContent = c;
        btn.onclick = () => {
          selected = i;
          choicesEl.querySelectorAll(".quiz-choice").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
        };
        choicesEl.appendChild(btn);
      });
    }

    if (nextBtn) nextBtn.textContent = index === total - 1 ? "Finish" : "Next";
  };

  if (backBtn) backBtn.onclick = () => go(`/quizzes?module=${encodeURIComponent(mod)}`);

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (selected === null) {
        if (errEl) errEl.textContent = "Select an answer to continue.";
        return;
      }
      if (selected === quiz.questions[index].correct) correct += 1;
      selected = null;
      index += 1;
      if (index < quiz.questions.length) {
        render();
        return;
      }
      sessionStorage.setItem("quizResult", JSON.stringify({ id, mod, correct, total: quiz.questions.length }));
      go(`/quiz-summary?id=${encodeURIComponent(id)}&module=${encodeURIComponent(mod)}`);
    };
  }

  render();
}

function initQuizSummary() {
  const badge = document.querySelector("#quizSummaryBadge");
  const title = document.querySelector("#quizSummaryTitle");
  const text = document.querySelector("#quizSummaryText");
  const bar = document.querySelector("#quizSummaryBar");
  const doneBtn = document.querySelector("#quizSummaryDone");

  const data = JSON.parse(sessionStorage.getItem("quizResult") || "{}");
  const correct = data.correct || 0;
  const total = data.total || 0;
  const pct = total ? Math.round((correct / total) * 100) : 0;

  if (title) title.textContent = pct === 100 ? "Perfect score!" : "Quiz complete";
  if (text) text.textContent = `You got ${correct} of ${total} correct.`;
  if (bar) bar.style.width = `${pct}%`;

  if (badge) {
    badge.textContent = `${pct}%`;
    badge.classList.toggle("full", pct === 100);
  }

  getProfile().then(async (profile) => {
    const completed = Array.isArray(profile.quizCompleted) ? profile.quizCompleted : [];
    const already = data.id && completed.includes(data.id);
    if (data.id && !already) completed.push(data.id);
    const xp = already ? (profile.learningXP || 0) : (profile.learningXP || 0) + (pct === 100 ? 40 : 20);
    const streak = already ? (profile.learningStreak || 0) : (profile.learningStreak || 0) + 1;
    await updateProfile({ quizCompleted: completed, learningXP: xp, learningStreak: streak });
  });

  if (doneBtn) {
    doneBtn.onclick = () => go(`/quizzes?module=${encodeURIComponent(data.mod || LEARN_MODULES[0].id)}`);
  }
}

function initSettings() {
  const lightBtn = document.querySelector("#modeLight");
  const darkBtn = document.querySelector("#modeDark");
  const themeCards = document.querySelectorAll("[data-bg-theme]");
  const uploadBgBtn = document.querySelector("#uploadBgBtn");
  const removeBgBtn = document.querySelector("#removeBgBtn");
  const bgUploadInput = document.querySelector("#bgUploadInput");
  const customThemeCard = document.querySelector("#customThemeCard");
  const faceToggle = document.querySelector("#faceToggle");
  const simulateBtn = document.querySelector("#simulateOnboardingBtn");
  const signOutBtn = document.querySelector("#signOutBtn");
  const resetAccountBtn = document.querySelector("#resetAccountBtn");
  const deleteAccountBtn = document.querySelector("#deleteAccountBtn");
  const setTextSize = document.querySelector("#setTextSize");
  const setContrast = document.querySelector("#setContrast");
  const setMotion = document.querySelector("#setMotion");
  const setLargeTargets = document.querySelector("#setLargeTargets");
  const setAppLock = document.querySelector("#setAppLock");
  const setAutoLock = document.querySelector("#setAutoLock");
  const setBalancePrivacy = document.querySelector("#setBalancePrivacy");
  const setNotifications = document.querySelector("#setNotifications");
  const setPaymentAlerts = document.querySelector("#setPaymentAlerts");
  const setBillReminders = document.querySelector("#setBillReminders");
  const setWeeklySummary = document.querySelector("#setWeeklySummary");
  const setSounds = document.querySelector("#setSounds");
  const setHaptics = document.querySelector("#setHaptics");
  const setDataSaver = document.querySelector("#setDataSaver");
  const setLocation = document.querySelector("#setLocation");
  const setMarketing = document.querySelector("#setMarketing");
  const setStatements = document.querySelector("#setStatements");

  const currentMode = localStorage.getItem(STORAGE_KEYS.mode) || "light";
  const currentTheme = localStorage.getItem(STORAGE_KEYS.theme) || "stars";

  if (lightBtn && darkBtn) {
    const setActiveMode = (mode) => {
      lightBtn.classList.toggle("active", mode === "light");
      darkBtn.classList.toggle("active", mode === "dark");
      setMode(mode);
    };

    lightBtn.onclick = () => setActiveMode("light");
    darkBtn.onclick = () => setActiveMode("dark");
    setActiveMode(currentMode);
  }

  const setActiveTheme = (theme) => {
    themeCards.forEach((c) => c.classList.toggle("active", c.dataset.bgTheme === theme));
  };

  if (faceToggle) {
    const saved = localStorage.getItem("faceIdEnabled") === "true";
    faceToggle.checked = saved;
    faceToggle.onchange = () => localStorage.setItem("faceIdEnabled", String(faceToggle.checked));
  }

  getProfile().then((profile) => {
    const settings = { ...SETTINGS_DEFAULTS, ...(profile.settings || {}) };
    if (setTextSize) setTextSize.value = settings.textSize;
    if (setContrast) setContrast.checked = !!settings.highContrast;
    if (setMotion) setMotion.checked = !!settings.reduceMotion;
    if (setLargeTargets) setLargeTargets.checked = !!settings.largeTargets;
    if (setAppLock) setAppLock.checked = !!settings.appLock;
    if (setAutoLock) setAutoLock.value = settings.autoLock;
    if (setBalancePrivacy) setBalancePrivacy.checked = !!settings.hideBalances;
    if (setNotifications) setNotifications.checked = !!settings.notifications;
    if (setPaymentAlerts) setPaymentAlerts.checked = !!settings.paymentAlerts;
    if (setBillReminders) setBillReminders.checked = !!settings.billReminders;
    if (setWeeklySummary) setWeeklySummary.checked = !!settings.weeklySummary;
    if (setSounds) setSounds.checked = !!settings.sounds;
    if (setHaptics) setHaptics.checked = !!settings.haptics;
    if (setDataSaver) setDataSaver.checked = !!settings.dataSaver;
    if (setLocation) setLocation.checked = !!settings.location;
    if (setMarketing) setMarketing.checked = !!settings.marketing;
    if (setStatements) setStatements.value = settings.statements;
    setActiveTheme(settings.bgTheme || currentTheme);

    if (customThemeCard && settings.customBg) {
      customThemeCard.style.backgroundImage = `url(${settings.customBg})`;
      customThemeCard.style.backgroundSize = "cover";
      customThemeCard.style.color = "#fff";
    }
  });

  const persist = async (patch) => {
    const profile = await getProfile();
    const nextSettings = { ...SETTINGS_DEFAULTS, ...(profile.settings || {}), ...patch };
    await updateProfile({ settings: nextSettings });
    applySettingsToDOM(nextSettings);
    document.body.classList.toggle("balance-hidden", !!nextSettings.hideBalances);
  };

  if (setTextSize) setTextSize.onchange = () => persist({ textSize: setTextSize.value });
  if (setContrast) setContrast.onchange = () => persist({ highContrast: setContrast.checked });
  if (setMotion) setMotion.onchange = () => persist({ reduceMotion: setMotion.checked });
  if (setLargeTargets) setLargeTargets.onchange = () => persist({ largeTargets: setLargeTargets.checked });
  if (setAppLock) setAppLock.onchange = () => persist({ appLock: setAppLock.checked });
  if (setAutoLock) setAutoLock.onchange = () => persist({ autoLock: setAutoLock.value });
  if (setBalancePrivacy) setBalancePrivacy.onchange = () => persist({ hideBalances: setBalancePrivacy.checked });
  if (setNotifications) setNotifications.onchange = () => persist({ notifications: setNotifications.checked });
  if (setPaymentAlerts) setPaymentAlerts.onchange = () => persist({ paymentAlerts: setPaymentAlerts.checked });
  if (setBillReminders) setBillReminders.onchange = () => persist({ billReminders: setBillReminders.checked });
  if (setWeeklySummary) setWeeklySummary.onchange = () => persist({ weeklySummary: setWeeklySummary.checked });
  if (setSounds) setSounds.onchange = () => persist({ sounds: setSounds.checked });
  if (setHaptics) setHaptics.onchange = () => persist({ haptics: setHaptics.checked });
  if (setDataSaver) setDataSaver.onchange = () => persist({ dataSaver: setDataSaver.checked });
  if (setLocation) setLocation.onchange = () => persist({ location: setLocation.checked });
  if (setMarketing) setMarketing.onchange = () => persist({ marketing: setMarketing.checked });
  if (setStatements) setStatements.onchange = () => persist({ statements: setStatements.value });

  themeCards.forEach((card) => {
    card.onclick = () => {
      const theme = card.dataset.bgTheme;
      setActiveTheme(theme);
      setTheme(theme);
      persist({ bgTheme: theme, customBg: theme === "custom" ? (customThemeCard?.style.backgroundImage?.slice(5, -2) || "") : "" });
    };
  });

  if (uploadBgBtn && bgUploadInput) {
    uploadBgBtn.onclick = () => bgUploadInput.click();
    bgUploadInput.onchange = async () => {
      const file = bgUploadInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result || "");
        if (customThemeCard) {
          customThemeCard.style.backgroundImage = `url(${dataUrl})`;
          customThemeCard.style.backgroundSize = "cover";
          customThemeCard.style.color = "#fff";
        }
        setActiveTheme("custom");
        setTheme("custom");
        await persist({ bgTheme: "custom", customBg: dataUrl });
      };
      reader.readAsDataURL(file);
      bgUploadInput.value = "";
    };
  }

  if (removeBgBtn) {
    removeBgBtn.onclick = () => {
      if (customThemeCard) {
        customThemeCard.style.backgroundImage = "";
        customThemeCard.style.color = "";
      }
      setActiveTheme("stars");
      setTheme("stars");
      persist({ bgTheme: "stars", customBg: "" });
    };
  }

  if (simulateBtn) {
    simulateBtn.onclick = () => {
      updateProfile({ onboardingDone: false, name: "", financeCompetency: "" }).then(() => go("/splash"));
    };
  }

  if (signOutBtn) {
    signOutBtn.onclick = () => {
      signOut().then(() => go("/login"));
    };
  }

  if (resetAccountBtn) {
    resetAccountBtn.onclick = async () => {
      try {
        await callAccountAdmin("reset");
      } catch {
        // Keep going with local reset even if cloud reset fails.
      }
      await signOut();
      await resetLocalApp();
      localStorage.removeItem(STORAGE_KEYS.helper);
      localStorage.removeItem(STORAGE_KEYS.interests);
      localStorage.removeItem(STORAGE_KEYS.theme);
      localStorage.removeItem(STORAGE_KEYS.mode);
      localStorage.removeItem(STORAGE_KEYS.friendReqSeenCount);
      localStorage.removeItem(STORAGE_KEYS.insightsHomeCache);
      localStorage.removeItem(STORAGE_KEYS.insightsActivePeriod);
      go("/splash");
    };
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.onclick = async () => {
      const ok = window.confirm("Delete this account and all local data? This cannot be undone.");
      if (!ok) return;
      try {
        await callAccountAdmin("delete");
      } catch {}
      await signOut();
      await resetLocalApp();
      go("/splash");
    };
  }
}

function initOnboarding() {
  const step1 = document.querySelector("#onboardStep1");
  const step2 = document.querySelector("#onboardStep2");
  const nextBtn = document.querySelector("#onboardNext");
  const finishBtn = document.querySelector("#onboardFinish");
  const skipBtn = document.querySelector("#onboardSkip");
  const helperCards = document.querySelectorAll("[data-helper]");
  const interestCards = document.querySelectorAll("[data-interest]");
  const interestErr = document.querySelector("#interestErr");
  const nameInput = document.querySelector("#onboardName");
  const competencySelect = document.querySelector("#onboardCompetency");
  const allowLocationToggle = document.querySelector("#onboardAllowLocation");
  const locationBtn = document.querySelector("#onboardLocationBtn");
  const locationStatus = document.querySelector("#onboardLocationStatus");
  const termsAccepted = document.querySelector("#onboardTermsAccepted");

  let currentStep = 1;
  let chosenHelper = localStorage.getItem(STORAGE_KEYS.helper) || "";
  let chosenInterests = new Set(
    (localStorage.getItem(STORAGE_KEYS.interests) || "").split(",").filter(Boolean)
  );
  let chosenCoords = null;

  const renderStep = () => {
    if (step1) {
      const show = currentStep === 1;
      step1.classList.toggle("hidden", !show);
      step1.style.display = show ? "block" : "none";
      if (show) step1.removeAttribute("hidden");
      else step1.setAttribute("hidden", "hidden");
      step1.setAttribute("aria-hidden", show ? "false" : "true");
    }
    if (step2) {
      const show = currentStep === 2;
      step2.classList.toggle("hidden", !show);
      step2.style.display = show ? "block" : "none";
      if (show) step2.removeAttribute("hidden");
      else step2.setAttribute("hidden", "hidden");
      step2.setAttribute("aria-hidden", show ? "false" : "true");
      if (show && nameInput) nameInput.focus();
    }
    if (nextBtn) nextBtn.textContent = currentStep === 1 ? "Next" : "Next";
    if (finishBtn) finishBtn.disabled = currentStep !== 2;
  };

  helperCards.forEach((card) => {
    card.classList.toggle("selected", card.dataset.helper === chosenHelper);
    card.onclick = () => {
      chosenHelper = card.dataset.helper;
      helperCards.forEach((c) => c.classList.toggle("selected", c === card));
    };
  });

  interestCards.forEach((card) => {
    const id = card.dataset.interest;
    card.classList.toggle("selected", chosenInterests.has(id));
    card.onclick = () => {
      if (chosenInterests.has(id)) {
        chosenInterests.delete(id);
        card.classList.remove("selected");
      } else {
        chosenInterests.add(id);
        card.classList.add("selected");
      }
    };
  });

  if (locationBtn) {
    locationBtn.onclick = () => {
      if (!navigator.geolocation) {
        if (locationStatus) locationStatus.textContent = "Location not supported on this device.";
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          chosenCoords = {
            lat: Number(pos.coords.latitude),
            lng: Number(pos.coords.longitude),
            updatedAt: new Date().toISOString()
          };
          if (allowLocationToggle) allowLocationToggle.checked = true;
          if (locationStatus) locationStatus.textContent = "Location access granted.";
        },
        () => {
          if (locationStatus) locationStatus.textContent = "Location access denied.";
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    };
  }

  if (skipBtn) {
    skipBtn.onclick = () => {
      updateProfile({ onboardingDone: true }).then(() => go("/home"));
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentStep === 1) {
        if (chosenHelper) {
          localStorage.setItem(STORAGE_KEYS.helper, chosenHelper);
        }
        currentStep = 2;
        renderStep();
        return;
      }
    };
  }

  if (finishBtn) {
    finishBtn.onclick = () => {
      if (currentStep !== 2) return;
      if (step2?.classList.contains("hidden")) return;

      if (interestErr) interestErr.textContent = "";
      if (nameInput && !nameInput.value.trim()) {
        if (interestErr) interestErr.textContent = "Please enter your name.";
        return;
      }
      if (competencySelect && !competencySelect.value) {
        if (interestErr) interestErr.textContent = "Please select your finance confidence.";
        return;
      }
      if (chosenInterests.size < 2) {
        if (interestErr) interestErr.textContent = "Pick at least 2 interests to continue.";
        return;
      }
      if (termsAccepted && !termsAccepted.checked) {
        if (interestErr) interestErr.textContent = "Please accept the Terms & Conditions to continue.";
        return;
      }

      localStorage.setItem(STORAGE_KEYS.interests, [...chosenInterests].join(","));
      updateProfile({
        onboardingDone: true,
        name: nameInput.value.trim(),
        financeCompetency: competencySelect.value,
        locationCoords: allowLocationToggle?.checked ? chosenCoords : null,
        termsAccepted: !!termsAccepted?.checked
      }).then(async (profile) => {
        await updateRemoteName(profile.name);
        const nextSettings = {
          ...SETTINGS_DEFAULTS,
          ...(profile.settings || {}),
          location: !!allowLocationToggle?.checked
        };
        await updateProfile({ settings: nextSettings });
        const user = await getSupabaseUser();
        if (user) {
          await upsertProfile({
            userId: user.id,
            name: profile.name,
            financeCompetency: profile.financeCompetency,
            interests: [...chosenInterests],
            avatarUrl: profile.avatarDataUrl,
            helper: chosenHelper
          });
        }
        go("/tutorial");
      });
    };
  }

  getProfile().then((profile) => {
    if (nameInput) nameInput.value = profile?.name || "";
    if (competencySelect) competencySelect.value = profile?.financeCompetency || "";
    if (allowLocationToggle) allowLocationToggle.checked = !!profile?.settings?.location;
    if (termsAccepted) termsAccepted.checked = !!profile?.termsAccepted;
    if (profile?.locationCoords) {
      chosenCoords = profile.locationCoords;
      if (locationStatus) locationStatus.textContent = "Saved location available.";
    }
  });

  renderStep();
}

function initTutorial() {
  const stepEl = document.querySelector("#tutorialStep");
  const totalEl = document.querySelector("#tutorialTotal");
  const titleEl = document.querySelector("#tutorialTitle");
  const bodyEl = document.querySelector("#tutorialBody");
  const nextBtn = document.querySelector("#tutorialNext");
  const skipBtn = document.querySelector("#tutorialSkip");

  const steps = [
    { title: "Welcome to One", body: "This quick tour highlights the key features so you feel in control from day one." },
    { title: "Home snapshot", body: "Your balance, transactions, and budget pots are all in one place." },
    { title: "Payments", body: "Send money or split bills with friends in just a few taps." },
    { title: "Smart Money Table", body: "Plan budgets like a spreadsheet and track real spending live." },
    { title: "Money Minutes", body: "Swipe through tips and quick wins in the reels-style feed." },
    { title: "Settings & Account", body: "Personalise your experience and manage your account safely." }
  ];

  let index = 0;

  const render = () => {
    if (stepEl) stepEl.textContent = String(index + 1);
    if (totalEl) totalEl.textContent = String(steps.length);
    if (titleEl) titleEl.textContent = steps[index].title;
    if (bodyEl) bodyEl.textContent = steps[index].body;
    if (nextBtn) nextBtn.textContent = index === steps.length - 1 ? "Finish" : "Next";
  };

  const finish = async () => {
    await updateProfile({ tutorialDone: true });
    go("/home");
  };

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (index < steps.length - 1) {
        index += 1;
        render();
        return;
      }
      finish();
    };
  }

  if (skipBtn) {
    skipBtn.onclick = finish;
  }

  render();
}
