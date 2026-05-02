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
  transferFunds,
  fetchDatasetOverview,
  fetchDatasetProducts,
  fetchDatasetCustomerProfiles,
  fetchDatasetRecentActivity,
  fetchDatasetInteractionHotspots,
  fetchDemoAdminSnapshot,
  adminSetDemoBalance,
  adminCreateDemoTransaction
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
  dmUnread: "dmUnread",
  incomingSeenAt: "incomingSeenAt",
  tutorialWalkthroughStep: "tutorialWalkthroughStep"
};
const ROUTE_MEMORY_KEYS = {
  current: "routeCurrentPath",
  previous: "routePreviousPath"
};
const BACK_FALLBACKS = {
  "/account": "/home",
  "/admin-console": "/settings",
  "/lloyds-data": "/account",
  "/practice-investing": "/home",
  "/friends": "/home",
  "/shopping-list": "/home",
  "/spending-wrapped": "/insights",
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
  "/deal-dash"
]);

const PRACTICE_ASSETS = [
  { symbol: "AAPL", name: "Apple", type: "Stock", currency: "USD", basePrice: 187.4, drift: 0.0045 },
  { symbol: "NVDA", name: "NVIDIA", type: "Stock", currency: "USD", basePrice: 911.6, drift: 0.0072 },
  { symbol: "TSLA", name: "Tesla", type: "Stock", currency: "USD", basePrice: 174.9, drift: 0.0094 },
  { symbol: "SPY", name: "S&P 500 ETF", type: "Index Fund", currency: "USD", basePrice: 512.2, drift: 0.0036 },
  { symbol: "BTC", name: "Bitcoin", type: "Crypto", currency: "USD", basePrice: 68210, drift: 0.0125 },
  { symbol: "ETH", name: "Ethereum", type: "Crypto", currency: "USD", basePrice: 3580, drift: 0.0111 }
];

const POT_COLORS = ["#bfeeda", "#9fe2ef", "#d9b0e9", "#ffd7b5", "#c6f0ff", "#d6f7c2"];
const GUIDED_TUTORIAL_STEPS = [
  { path: "/home", selector: ".balance-card", title: "Home Card", body: "Your main balance lives here. Tap the green card to flip it and view account details on the back." },
  { path: "/payments", selector: ".payments-card", title: "Payments", body: "Send money from your account to friends. You cannot send to yourself, and balance checks stop overspending before anything moves." },
  { path: "/budget-pots", selector: "#potsGrid", title: "Budgeting Pots", body: "Create pots for goals and move money in or out. Pot transfers now feed back into your main balance and stay in sync." },
  { path: "/dms", selector: ".dm-layout", title: "DMs", body: "Message friends, send money, or request it directly inside the chat. Incoming payments and unread replies appear in notifications and recent activity." },
  { path: "/shopping-list", selector: ".shopping-search-card", title: "Shopping List", body: "Search nearby grocery deals, compare staple prices, add items straight into your list, or type your own items manually." },
  { path: "/deal-dash", selector: "#dealFeatured", title: "Deal Nest", body: "Deal Nest is your student discounts hub. Featured offers are tailored using the interests chosen during onboarding." },
  { path: "/practice-investing", selector: "#investMarketPanel", title: "Practice Investing", body: "Use this screen to practice buying and selling assets with fake money only. It is designed to explain charts, order tickets and portfolio movements without any real trading risk." },
  { path: "/learn", selector: "#learnReelsFeed", title: "Money Minutes", body: "Money Minutes runs as a vertical reels feed. The first reels match your finance confidence level, and quiz reels are mixed into the scroll." },
  { path: "/insights", selector: ".insights-analysis-head", title: "AI Insights", body: "Insights combines transaction history with simulated analysis. Refresh the page to generate a new read on spending, trends, and category behaviour." },
  { path: "/spending-wrapped", selector: "#wrappedStage", title: "Monthly wrapped", body: "This animated recap plays through your last 30 days of spending. Hold the screen to pause and replay it any time from Home or Insights." },
  { path: "/friends", selector: "#friendList", title: "Friends & Profiles", body: "Friend listings now show clearer identity details, unread markers, and profile verification so you can check the right person before paying them." },
  { path: "/home", selector: ".assistant-trigger", title: "AI Chatbot", body: "The mascot assistant is available from the floating button on every page. Open it for quick prompts about saving, spending, friends, and deals." },
  { path: "/settings", selector: ".settings-section", title: "Settings & Control", body: "Use Settings to manage themes, accessibility, privacy, onboarding replay, notifications, and account reset tools." }
];

function isDemoSessionUnlocked() {
  return sessionStorage.getItem("demo_app_unlocked") === "1";
}

function setDemoSessionUnlocked(value = true) {
  if (value) sessionStorage.setItem("demo_app_unlocked", "1");
  else sessionStorage.removeItem("demo_app_unlocked");
}

function nextRouteAfterUnlock(profile) {
  if (!profile?.onboardingDone) return "/onboarding";
  if (!profile?.tutorialDone) return "/tutorial";
  return "/home";
}

async function getBudgetPots() {
  const profile = await getProfile();
  return Array.isArray(profile.budgetPots) ? profile.budgetPots : [];
}

function getDefaultPracticePortfolio() {
  return {
    cash: 10000,
    holdings: {},
    selectedSymbol: "AAPL",
    trades: []
  };
}

async function getPracticePortfolio() {
  const profile = await getProfile();
  const raw = profile?.practicePortfolio;
  const base = getDefaultPracticePortfolio();
  if (!raw || typeof raw !== "object") return base;
  return {
    cash: Number(raw.cash ?? base.cash),
    holdings: raw.holdings && typeof raw.holdings === "object" ? raw.holdings : {},
    selectedSymbol: raw.selectedSymbol || base.selectedSymbol,
    trades: Array.isArray(raw.trades) ? raw.trades : []
  };
}

async function setPracticePortfolio(next) {
  const payload = {
    cash: Number(next.cash || 0),
    holdings: next.holdings || {},
    selectedSymbol: next.selectedSymbol || "AAPL",
    trades: Array.isArray(next.trades) ? next.trades.slice(0, 40) : []
  };
  await updateProfile({ practicePortfolio: payload });
  return payload;
}

async function setBudgetPots(pots) {
  await updateProfile({ budgetPots: pots });
  return pots;
}

function formatMoney(value) {
  return `£${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(value) {
  if (!value) return "Now";
  try {
    return new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(value);
  }
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
    counterpartyName: receiverName || "friend",
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
  return tx;
}

async function recordSimulatedIncomingTransfer({ senderId, senderName, amount, reference }) {
  const ledger = await getSimulatedLedger();
  const tx = {
    id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from_user: senderId,
    to_user: "local_user",
    counterpartyName: senderName || "friend",
    amount: Number(amount) || 0,
    reference: reference || `Transfer from ${senderName || "friend"}`,
    created_at: new Date().toISOString(),
    _simulated: true
  };
  const next = {
    balanceDelta: Number(ledger.balanceDelta || 0) + tx.amount,
    transactions: [tx, ...(ledger.transactions || [])].slice(0, 100)
  };
  await updateProfile({ simulatedLedger: next });
  await syncPendingBalanceDelta(null, next);
  return tx;
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

function closeContentModal() {
  const overlay = document.querySelector("#contentModalOverlay");
  if (!overlay) return;
  if (typeof overlay._cleanup === "function") {
    overlay._cleanup();
    overlay._cleanup = null;
  }
  overlay.classList.remove("show");
}

function showContentModal({ kicker = "One", title = "Details", subtitle = "", bodyHtml = "", actionText = "Close", onOpen = null } = {}) {
  let overlay = document.querySelector("#contentModalOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "contentModalOverlay";
    overlay.className = "content-modal-overlay";
    overlay.innerHTML = `
      <div class="content-modal-panel" role="dialog" aria-modal="true" aria-live="polite">
        <div class="content-modal-head">
          <div>
            <div id="contentModalKicker" class="content-modal-kicker"></div>
            <div id="contentModalTitle" class="content-modal-title"></div>
            <div id="contentModalSubtitle" class="content-modal-subtitle"></div>
          </div>
          <button id="contentModalClose" class="content-modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div id="contentModalBody" class="content-modal-body"></div>
        <button id="contentModalAction" class="primary-btn" type="button">Close</button>
      </div>
    `;
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeContentModal();
    });
    document.body.appendChild(overlay);
  }
  const kickerEl = overlay.querySelector("#contentModalKicker");
  const titleEl = overlay.querySelector("#contentModalTitle");
  const subtitleEl = overlay.querySelector("#contentModalSubtitle");
  const bodyEl = overlay.querySelector("#contentModalBody");
  const closeBtn = overlay.querySelector("#contentModalClose");
  const actionBtn = overlay.querySelector("#contentModalAction");
  if (typeof overlay._cleanup === "function") {
    overlay._cleanup();
    overlay._cleanup = null;
  }
  if (kickerEl) kickerEl.textContent = kicker;
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  if (closeBtn) closeBtn.onclick = closeContentModal;
  if (actionBtn) {
    actionBtn.textContent = actionText;
    actionBtn.onclick = closeContentModal;
  }
  overlay.classList.add("show");
  overlay._cleanup = null;
  if (typeof onOpen === "function") onOpen(overlay);
  return overlay;
}

async function findTransactionById(id) {
  const remoteTx = await fetchTransactionById(id);
  if (remoteTx) return remoteTx;
  const ledger = await getSimulatedLedger();
  return (ledger.transactions || []).find((tx) => tx.id === id) || null;
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
  toast.innerHTML = `
    <div class="top-goal-toast-body">${message}</div>
    <button id="topGoalToastAction" class="top-goal-toast-action hidden" type="button"></button>
  `;
  const actionBtn = toast.querySelector("#topGoalToastAction");
  const payload = showTopNotification._payload || {};
  if (actionBtn && payload.actionLabel && typeof payload.onAction === "function") {
    actionBtn.textContent = payload.actionLabel;
    actionBtn.classList.remove("hidden");
    actionBtn.onclick = () => {
      toast.classList.remove("show");
      payload.onAction();
    };
  }
  toast.classList.remove("show");
  // Restart animation for rapid consecutive completions
  void toast.offsetWidth;
  toast.classList.add("show");
  const durationMs = Number(payload.durationMs || 5200);
  setTimeout(() => {
    toast.classList.remove("show");
  }, durationMs);
  showTopNotification._payload = null;
}

showTopNotification.withAction = (message, actionLabel, onAction, durationMs = 5200) => {
  showTopNotification._payload = { actionLabel, onAction, durationMs };
  showTopNotification(message);
};

function getHashParams() {
  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  return new URLSearchParams(query);
}

function classifyAssistantCategory(tx) {
  const haystack = `${tx?.reference || ""} ${tx?.counterpartyName || ""}`.toLowerCase();
  if (haystack.includes("tesco") || haystack.includes("grocery") || haystack.includes("weekly shop") || haystack.includes("top-up")) return "Groceries";
  if (haystack.includes("train") || haystack.includes("uber") || haystack.includes("travel") || haystack.includes("bus")) return "Travel";
  if (haystack.includes("coffee") || haystack.includes("dinner") || haystack.includes("lunch") || haystack.includes("costa") || haystack.includes("gusto") || haystack.includes("eating")) return "Food & drink";
  if (haystack.includes("apple") || haystack.includes("storage") || haystack.includes("subscription") || haystack.includes("steam")) return "Subscriptions & digital";
  if (haystack.includes("cinema") || haystack.includes("gig") || haystack.includes("concert") || haystack.includes("asos") || haystack.includes("vue")) return "Lifestyle";
  if (tx?.counterpartyName) return "Friends";
  if ((tx?.from_user || "").includes("employer") || (tx?.reference || "").toLowerCase().includes("wages")) return "Income";
  return "General";
}

function escapeAssistantHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ASSISTANT_INLINE_LINKS = {
  "/learn": { label: "Explain", prompt: "What should I learn next?", host: ".reels-header" },
  "/insights": { label: "Interpret", prompt: "Summarise my spending", host: ".top-bar" },
  "/practice-investing": { label: "Coach", prompt: "Explain this trading screen", host: ".top-bar" },
  "/shopping-list": { label: "Plan", prompt: "Plan a cheaper food shop", host: ".top-bar" },
  "/deal-dash": { label: "Find", prompt: "Find deals for my interests", host: ".top-bar" },
  "/payments": { label: "Check", prompt: "Help me send money safely", host: ".top-bar" },
  "/budget-pots": { label: "Guide", prompt: "Build me a savings plan", host: ".top-bar" },
  "/dms": { label: "Draft", prompt: "How should I ask for money back?", host: ".top-bar" },
  "/friends": { label: "Verify", prompt: "Who should I pay from friends?", host: ".top-bar" }
};

function getAssistantTriggerImageSrc() {
  const helper = localStorage.getItem(STORAGE_KEYS.helper) || "louie";
  return helper === "lucy" ? "./lucy.png" : "./louie.png";
}

function openAssistantWithPrompt(prompt = "") {
  const panel = document.querySelector("#assistantPanel");
  const input = document.querySelector("#assistantInput");
  const send = document.querySelector("#assistantSendBtn");
  if (!panel || !input || !send) return;
  panel.classList.add("open");
  if (prompt) {
    input.value = prompt;
    send.click();
  } else {
    input.focus();
  }
}

function openAssistantWithPreset(userText, responsePayload) {
  const wrap = document.querySelector("#assistantWidget");
  const panel = document.querySelector("#assistantPanel");
  if (panel) panel.classList.add("open");
  if (wrap && typeof wrap.__assistantOpenPreset === "function") {
    wrap.__assistantOpenPreset(userText, responsePayload);
    return;
  }
  openAssistantWithPrompt(userText || "");
}

function mountAssistantInlineLinks(path) {
  document.querySelectorAll(".assistant-inline-link").forEach((el) => el.remove());
  const config = ASSISTANT_INLINE_LINKS[path];
  if (!config) return;
  const host = document.querySelector(config.host || ".top-bar");
  const avatar = host?.querySelector(".avatar-btn");
  if (!host || !avatar) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "assistant-inline-link";
  btn.innerHTML = `<img src="${getAssistantTriggerImageSrc()}" alt="" /><span>${escapeAssistantHtml(config.label)}</span>`;
  btn.onclick = () => openAssistantWithPrompt(config.prompt || "");
  avatar.before(btn);
}

function getAssistantPageMeta(path) {
  const map = {
    "/home": {
      title: "Home agent",
      subtitle: "Live overview of balance, spending pressure, and next best moves.",
      prompts: [
        "Give me a money health check",
        "Build me a savings plan",
        "What should I do next?",
        "Can I afford £50?"
      ]
    },
    "/deal-dash": {
      title: "Deals scout",
      subtitle: "Scans your interests and directs you to the strongest student offers.",
      prompts: [
        "Find deals for my interests",
        "Show me nearby grocery savings",
        "What deal should I open first?",
        "How can I save this week?"
      ]
    },
    "/shopping-list": {
      title: "Shopping planner",
      subtitle: "Helps turn grocery search into a cheaper, cleaner shopping run.",
      prompts: [
        "Plan a cheaper food shop",
        "What should I add to my list?",
        "Show me nearby grocery savings",
        "Build me a savings plan"
      ]
    },
    "/payments": {
      title: "Payments guide",
      subtitle: "Checks sending flow, affordability, and the safest next action.",
      prompts: [
        "Help me send money safely",
        "Can I afford £20?",
        "Who should I pay from friends?",
        "Give me a money health check"
      ]
    },
    "/dms": {
      title: "Conversation agent",
      subtitle: "Supports money requests, friend replies, and payment follow-up.",
      prompts: [
        "How should I ask for money back?",
        "Summarise my friend activity",
        "Help me send money safely",
        "What should I do next?"
      ]
    },
    "/practice-investing": {
      title: "Practice investing coach",
      subtitle: "Explains the chart, fake portfolio moves, and what each control does.",
      prompts: [
        "Explain this trading screen",
        "What asset should I practise with?",
        "Teach me risk in simple terms",
        "What should I learn next?"
      ]
    },
    "/learn": {
      title: "Money Minutes coach",
      subtitle: "Links your confidence level to the next short lesson worth watching.",
      prompts: [
        "What should I learn next?",
        "Explain investing in simple terms",
        "Give me a money health check",
        "Build me a savings plan"
      ]
    },
    "/insights": {
      title: "Insights analyst",
      subtitle: "Turns recent transactions into trends, warnings, and concrete next steps.",
      prompts: [
        "Summarise my spending",
        "What category is hurting me most?",
        "Build me a savings plan",
        "Show my monthly wrapped"
      ]
    }
  };
  return map[path] || {
    title: "One Agent",
    subtitle: "Task-based support across spending, saving, learning, deals, and practice trading.",
    prompts: [
      "Give me a money health check",
      "Build me a savings plan",
      "Find deals for my interests",
      "What should I learn next?"
    ]
  };
}

async function buildAssistantSnapshot(profile) {
  const user = await ensureRemoteUserProfile(profile).catch(() => null);
  const remoteTx = user ? await fetchTransactions(user.id, 24).catch(() => []) : [];
  const ledger = await getSimulatedLedger().catch(() => ({ balanceDelta: 0, transactions: [] }));
  const localTx = Array.isArray(ledger.transactions) ? ledger.transactions : [];
  const merged = [...remoteTx, ...localTx]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 24);
  const outgoing = merged.filter((tx) => (tx.from_user === user?.id || tx.from_user === "local_user") && Number(tx.amount || 0) > 0);
  const incoming = merged.filter((tx) => tx.to_user === user?.id || tx.to_user === "local_user");

  const categoryTotals = outgoing.reduce((acc, tx) => {
    const key = classifyAssistantCategory(tx);
    acc[key] = Number(acc[key] || 0) + Number(tx.amount || 0);
    return acc;
  }, {});
  const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || ["General", 0];

  const merchantTotals = outgoing.reduce((acc, tx) => {
    const key = tx.counterpartyName || tx.reference || "Recent spend";
    acc[key] = Number(acc[key] || 0) + Number(tx.amount || 0);
    return acc;
  }, {});
  const topMerchantEntry = Object.entries(merchantTotals).sort((a, b) => b[1] - a[1])[0] || ["No merchant data yet", 0];

  const balance = await getAvailableMainAccountBalance().catch(() => 0);
  const pots = await getBudgetPots().catch(() => []);
  const practice = await getPracticePortfolio().catch(() => getDefaultPracticePortfolio());
  const dmUnread = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.dmUnread) || "{}");
      return Object.values(parsed).filter(Boolean).length;
    } catch {
      return 0;
    }
  })();
  const potTotal = (Array.isArray(pots) ? pots : []).reduce((sum, pot) => sum + Number(pot?.balance ?? pot?.amount ?? pot?.saved ?? 0), 0);
  const interests = Array.isArray(profile?.interests) ? profile.interests : [];
  const confidence = profile?.financeConfidence || profile?.finance_competency || "comfortable";

  return {
    userName: profile?.name || user?.name || "there",
    balance,
    interests,
    confidence,
    outgoing,
    incoming,
    recentTransactions: merged,
    topCategory: topCategoryEntry[0],
    topCategoryAmount: Number(topCategoryEntry[1] || 0),
    topMerchant: topMerchantEntry[0],
    topMerchantAmount: Number(topMerchantEntry[1] || 0),
    potsCount: Array.isArray(pots) ? pots.length : 0,
    potTotal,
    unreadThreads: dmUnread,
    practiceCash: Number(practice?.cash || 0),
    practicePositions: Object.values(practice?.holdings || {}).filter((item) => Number(item?.quantity || 0) > 0).length
  };
}

function getAssistantActionsForIntent(intent) {
  const actionMap = {
    overview: [
      { label: "Open insights", route: "/insights" },
      { label: "View wrapped", route: "/spending-wrapped" },
      { label: "Check budget pots", route: "/budget-pots" }
    ],
    savings: [
      { label: "Open budget pots", route: "/budget-pots" },
      { label: "Find student deals", route: "/deal-dash" },
      { label: "Plan groceries", route: "/shopping-list" }
    ],
    deals: [
      { label: "Open Deal Nest", route: "/deal-dash" },
      { label: "Open shopping list", route: "/shopping-list" }
    ],
    payments: [
      { label: "Open payments", route: "/payments" },
      { label: "Check friends", route: "/friends" },
      { label: "Open DMs", route: "/dms" }
    ],
    learning: [
      { label: "Open Money Minutes", route: "/learn" },
      { label: "Open practice investing", route: "/practice-investing" }
    ],
    investing: [
      { label: "Open practice investing", route: "/practice-investing" },
      { label: "Watch Money Minutes", route: "/learn" }
    ],
    insights: [
      { label: "Open insights", route: "/insights" },
      { label: "View wrapped", route: "/spending-wrapped" }
    ]
  };
  return actionMap[intent] || actionMap.overview;
}

function buildAssistantResponse(question, snapshot, path) {
  const query = String(question || "").trim();
  const lower = query.toLowerCase();
  const name = snapshot.userName.split(" ")[0] || snapshot.userName;
  const amountMatch = lower.match(/(?:£|gbp)?\s?(\d+(?:\.\d{1,2})?)/);
  const requestedAmount = amountMatch ? Number(amountMatch[1]) : null;
  const topCategoryLine = snapshot.topCategoryAmount > 0
    ? `${snapshot.topCategory} is your top outgoing area at ${formatMoney(snapshot.topCategoryAmount)}.`
    : "I do not have enough outgoing spend to isolate a top category yet.";
  const genericBullets = [
    `Available balance: ${formatMoney(snapshot.balance)}`,
    `Recent outgoing payments checked: ${snapshot.outgoing.length}`,
    topCategoryLine
  ];

  if (lower.includes("afford") && requestedAmount !== null) {
    const remaining = snapshot.balance - requestedAmount;
    const body = remaining >= 0
      ? `I checked your current balance and recent flow. A ${formatMoney(requestedAmount)} spend should fit right now, with ${formatMoney(remaining)} left afterwards.`
      : `I checked your current balance and this would push you ${formatMoney(Math.abs(remaining))} past what is available right now.`;
    return {
      intent: "payments",
      title: remaining >= 0 ? "Affordability check passed" : "Affordability check failed",
      body,
      bullets: [
        `Current available balance: ${formatMoney(snapshot.balance)}`,
        `Top spend area: ${snapshot.topCategory}`,
        remaining >= 0 ? `Projected remaining balance: ${formatMoney(remaining)}` : `Shortfall: ${formatMoney(Math.abs(remaining))}`
      ],
      actions: getAssistantActionsForIntent("payments")
    };
  }

  if (lower.includes("save") || lower.includes("savings") || lower.includes("plan")) {
    const starterMove = Math.max(10, Math.min(40, Math.round(snapshot.balance * 0.06)));
    const trimTarget = Math.max(5, Math.min(25, Math.round(snapshot.topCategoryAmount * 0.18)));
    return {
      intent: "savings",
      title: "7-day savings plan",
      body: `I checked your balance, recent spend pattern, and pots. The cleanest move is a small automatic-looking shift, not a dramatic cut.` ,
      bullets: [
        `Move ${formatMoney(starterMove)} into a pot first so it is protected from daily spending.`,
        snapshot.topCategoryAmount > 0 ? `Try to trim ${formatMoney(trimTarget)} from ${snapshot.topCategory} this week.` : "Keep non-essential spends below two transactions this week.",
        `Use Deal Nest and Shopping List together before your next grocery run.`
      ],
      actions: getAssistantActionsForIntent("savings")
    };
  }

  if (lower.includes("deal") || lower.includes("discount") || lower.includes("grocery") || lower.includes("shopping")) {
    const interestText = snapshot.interests.length ? snapshot.interests.slice(0, 3).join(", ") : "your profile interests";
    return {
      intent: "deals",
      title: "Deals route ready",
      body: `I can route you to the strongest student deals first. I used ${interestText} plus your recent spending pattern to decide where to start.`,
      bullets: [
        `Featured deals are strongest when they match the interests you chose during onboarding.`,
        snapshot.topCategory === "Groceries" ? "Your spend suggests grocery savings should come first." : `Your current pressure point is ${snapshot.topCategory}.`,
        "Shopping List is the best place to turn grocery results into a tracked list."
      ],
      actions: getAssistantActionsForIntent("deals")
    };
  }

  if (lower.includes("send") || lower.includes("pay") || lower.includes("friend") || lower.includes("request") || lower.includes("dm")) {
    return {
      intent: "payments",
      title: "Payments plan",
      body: `I would verify the friend profile first, then send from Payments or DMs depending on whether you want a conversation attached.` ,
      bullets: [
        `Unread money-related chats: ${snapshot.unreadThreads}`,
        `Recent friend-transfer activity is already reflected in transactions and notifications.`,
        `If you mention an amount like “Can I afford £20?”, I will run a quick balance check first.`
      ],
      actions: getAssistantActionsForIntent("payments")
    };
  }

  if (lower.includes("invest") || lower.includes("trade") || lower.includes("risk") || lower.includes("asset")) {
    return {
      intent: "investing",
      title: "Practice investing guide",
      body: `This mode is purely fake money, which makes it the right place to learn how price movement, order size, and P/L fit together.` ,
      bullets: [
        `Practice cash available: ${formatMoney(snapshot.practiceCash)}`,
        `Open practice positions: ${snapshot.practicePositions}`,
        `Use 1 minute for live movement and 1 hour / 1 day / 1 month to compare broader trends.`
      ],
      actions: getAssistantActionsForIntent("investing")
    };
  }

  if (lower.includes("learn") || lower.includes("module") || lower.includes("tutorial") || lower.includes("money minutes")) {
    return {
      intent: "learning",
      title: "Next learning move",
      body: `Based on your ${snapshot.confidence} confidence level, I would keep the next step short and relevant rather than sending you into a full lesson stack.` ,
      bullets: [
        `Money Minutes is already tailored to your onboarding confidence.`,
        snapshot.topCategory === "Friends" ? "A budgeting or boundaries reel would make sense next because friend transfers are showing up strongly." : `A short reel on ${snapshot.topCategory.toLowerCase()} control would be the most relevant next watch.`,
        "Practice Investing is the follow-on screen if you want to apply the lesson immediately."
      ],
      actions: getAssistantActionsForIntent("learning")
    };
  }

  if (lower.includes("insight") || lower.includes("wrapped") || lower.includes("summary") || lower.includes("spending") || lower.includes("health check") || lower.includes("what should i do next") || lower.includes("category")) {
    return {
      intent: "insights",
      title: "Agent money brief",
      body: `I checked your live demo balance, recent transactions, and saved goals. Here is the highest-value readout right now, ${name}.`,
      bullets: [
        `Available balance: ${formatMoney(snapshot.balance)}`,
        `Top category: ${snapshot.topCategory} at ${formatMoney(snapshot.topCategoryAmount)}`,
        snapshot.topMerchantAmount > 0 ? `Most repeated spend target: ${snapshot.topMerchant} at ${formatMoney(snapshot.topMerchantAmount)}` : "Merchant pattern is still building.",
        snapshot.potsCount ? `Budget pots active: ${snapshot.potsCount}, holding ${formatMoney(snapshot.potTotal)}.` : "You do not have active pots yet."
      ],
      actions: getAssistantActionsForIntent("insights")
    };
  }

  return {
    intent: "overview",
    title: "What I can do for you",
    body: "I work best when you give me a clear money task. I can check affordability, build a savings plan, point you to deals, explain practice investing, and route you to the right screen.",
    bullets: genericBullets,
    actions: getAssistantActionsForIntent("overview")
  };
}

function renderAssistantResponseCard(payload) {
  if (payload?.kind === "pot-flow") {
    return renderAssistantPotFlowCard(payload);
  }
  const bullets = Array.isArray(payload?.bullets) ? payload.bullets.filter(Boolean) : [];
  const actions = Array.isArray(payload?.actions) ? payload.actions.filter(Boolean) : [];
  return `
    <div class="assistant-card">
      <div class="assistant-card-kicker">Agentic Analysis</div>
      <div class="assistant-card-title">${escapeAssistantHtml(payload?.title || "One Agent")}</div>
      <div class="assistant-card-body">${escapeAssistantHtml(payload?.body || "")}</div>
      ${bullets.length ? `<div class="assistant-bullets">${bullets.map((item) => `<div class="assistant-bullet"><span></span><div>${escapeAssistantHtml(item)}</div></div>`).join("")}</div>` : ""}
      ${actions.length ? `<div class="assistant-actions">${actions.map((action) => `<button class="assistant-action-btn" type="button" data-assistant-route="${escapeAssistantHtml(action.route || "")}">${escapeAssistantHtml(action.label || "Open")}</button>`).join("")}</div>` : ""}
    </div>
  `;
}

function renderAssistantPotFlowCard(payload) {
  const step = payload?.step || "name";
  const title = escapeAssistantHtml(payload?.title || "Create a budgeting pot");
  const body = escapeAssistantHtml(payload?.body || "");
  const selectedName = payload?.potName ? `<div class="assistant-flow-summary">Name: <strong>${escapeAssistantHtml(payload.potName)}</strong></div>` : "";
  const selectedColor = payload?.colorLabel ? `<div class="assistant-flow-summary">Colour: <strong>${escapeAssistantHtml(payload.colorLabel)}</strong></div>` : "";
  const colorChoices = Array.isArray(payload?.colorChoices) ? payload.colorChoices : [];
  const emojiChoices = Array.isArray(payload?.emojiChoices) ? payload.emojiChoices : [];

  return `
    <div class="assistant-card assistant-flow-card">
      <div class="assistant-card-kicker">Agentic Sequence</div>
      <div class="assistant-card-title">${title}</div>
      <div class="assistant-card-body">${body}</div>
      ${selectedName || selectedColor ? `<div class="assistant-flow-stack">${selectedName}${selectedColor}</div>` : ""}
      ${step === "name" ? `<div class="assistant-flow-note">Reply in the chat box with the pot name you want.</div>` : ""}
      ${step === "color" ? `
        <div class="assistant-flow-label">Choose a colour</div>
        <div class="assistant-color-grid">
          ${colorChoices.map((choice) => `
            <button class="assistant-color-btn" type="button" data-assistant-pot-color="${escapeAssistantHtml(choice.value)}" data-assistant-pot-label="${escapeAssistantHtml(choice.label)}">
              <span class="assistant-color-swatch" style="background:${escapeAssistantHtml(choice.value)};"></span>
              <span>${escapeAssistantHtml(choice.label)}</span>
            </button>
          `).join("")}
        </div>
      ` : ""}
      ${step === "emoji" ? `
        <div class="assistant-flow-label">Pick an emoji</div>
        <div class="assistant-emoji-grid">
          ${emojiChoices.map((choice) => `
            <button class="assistant-emoji-btn ${choice.recommended ? "recommended" : ""}" type="button" data-assistant-pot-emoji="${escapeAssistantHtml(choice.value)}">
              <span class="assistant-emoji-symbol">${escapeAssistantHtml(choice.value)}</span>
              <span>${escapeAssistantHtml(choice.label)}</span>
            </button>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderAssistantContext(snapshot, path) {
  const pageMeta = getAssistantPageMeta(path);
  const chips = [
    `Live demo data`,
    `Balance ${formatMoney(snapshot.balance)}`,
    `Top spend ${snapshot.topCategory}`,
    snapshot.potsCount ? `${snapshot.potsCount} pots` : `No pots yet`,
    snapshot.unreadThreads ? `${snapshot.unreadThreads} unread chats` : `Chats up to date`
  ];
  return `
    <div class="assistant-context-row">
      ${chips.map((chip) => `<span class="assistant-context-chip">${escapeAssistantHtml(chip)}</span>`).join("")}
    </div>
    <div class="assistant-context-note">${escapeAssistantHtml(pageMeta.subtitle)}</div>
  `;
}

function initAssistantWidget(profile, path = window.location.hash.replace(/^#/, "") || "/home") {
  let wrap = document.querySelector("#assistantWidget");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "assistantWidget";
    wrap.className = "assistant-widget";
    wrap.innerHTML = `
      <button id="assistantBackdrop" class="assistant-backdrop" type="button" aria-label="Close assistant"></button>
      <div id="assistantPanel" class="assistant-panel">
        <div class="assistant-head">
          <div>
            <div class="assistant-head-top">
              <div id="assistantHeadName" style="font-weight:800;">Louie</div>
            </div>
            
          </div>
          <button id="assistantClearBtn" class="assistant-clear-btn" type="button">New chat</button>
        </div>
        <div class="assistant-context" id="assistantContext"></div>
        <div class="assistant-log" id="assistantLog"></div>
        <div class="assistant-footer">
          <div class="assistant-prompts" id="assistantPrompts"></div>
          <div class="assistant-compose">
            <input id="assistantInput" class="input" type="text" placeholder="Ask for a plan, check, explanation, or next step..." />
            <button id="assistantSendBtn" class="primary-btn" type="button" style="width:auto;padding:10px 12px;">Send</button>
          </div>
        </div>
      </div>
      <button id="assistantTrigger" class="assistant-trigger" type="button" aria-label="Open assistant">
        <img id="assistantTriggerImg" alt="Assistant mascot" />
      </button>
    `;
    document.body.appendChild(wrap);
  }

  const helper = localStorage.getItem(STORAGE_KEYS.helper) || "louie";
  const img = wrap.querySelector("#assistantTriggerImg");
  if (img) img.src = helper === "lucy" ? "./lucy.png" : "./louie.png";

  const backdrop = wrap.querySelector("#assistantBackdrop");
  const panel = wrap.querySelector("#assistantPanel");
  const trigger = wrap.querySelector("#assistantTrigger");
  const prompts = wrap.querySelector("#assistantPrompts");
  const log = wrap.querySelector("#assistantLog");
  const input = wrap.querySelector("#assistantInput");
  const send = wrap.querySelector("#assistantSendBtn");
  const context = wrap.querySelector("#assistantContext");
  const clearBtn = wrap.querySelector("#assistantClearBtn");
  if (!backdrop || !panel || !trigger || !prompts || !log || !input || !send || !context || !clearBtn) return;

  const pageMeta = getAssistantPageMeta(path);
  const assistantState = {
    flow: null
  };
  const headName = wrap.querySelector("#assistantHeadName");
  if (headName) headName.textContent = helper === "lucy" ? "Lucy" : "Louie";
  prompts.innerHTML = "";
  pageMeta.prompts.forEach((prompt) => {
    const btn = document.createElement("button");
    btn.className = "assistant-prompt-btn";
    btn.type = "button";
    btn.textContent = prompt;
    btn.onclick = () => {
      input.value = prompt;
      handleSend();
    };
    prompts.appendChild(btn);
  });

  const addLog = (payload, role = "assistant") => {
    const row = document.createElement("div");
    row.className = `assistant-msg ${role === "user" ? "user" : "assistant"}`.trim();
    if (role === "user") {
      row.textContent = String(payload || "");
    } else {
      row.innerHTML = typeof payload === "string" ? escapeAssistantHtml(payload) : renderAssistantResponseCard(payload);
    }
    row.classList.add("enter");
    log.appendChild(row);
    requestAnimationFrame(() => row.classList.remove("enter"));
    log.scrollTop = log.scrollHeight;
    return row;
  };

  const startBudgetPotFlow = () => {
    assistantState.flow = {
      type: "budget-pot",
      step: "name",
      potName: "",
      color: "",
      colorLabel: "",
      emoji: ""
    };
    addLog({
      kind: "pot-flow",
      step: "name",
      title: "Let’s make a new budgeting pot",
      body: "What would you like to call it?"
    }, "assistant");
  };

  const showBudgetPotColorStep = () => {
    if (!assistantState.flow) return;
    assistantState.flow.step = "color";
    addLog({
      kind: "pot-flow",
      step: "color",
      title: "Choose the colour",
      body: "I’ve saved the name. Pick the colour you want for the new pot.",
      potName: assistantState.flow.potName,
      colorChoices: [
        { value: POT_COLORS[0], label: "Mint" },
        { value: POT_COLORS[1], label: "Sky" },
        { value: POT_COLORS[2], label: "Lilac" },
        { value: POT_COLORS[3], label: "Peach" },
        { value: POT_COLORS[4], label: "Ice" },
        { value: POT_COLORS[5], label: "Sage" }
      ]
    }, "assistant");
  };

  const showBudgetPotEmojiStep = () => {
    if (!assistantState.flow) return;
    assistantState.flow.step = "emoji";
    addLog({
      kind: "pot-flow",
      step: "emoji",
      title: "Pick the emoji",
      body: "I’d recommend the car emoji for this one, but you can choose another if you want.",
      potName: assistantState.flow.potName,
      colorLabel: assistantState.flow.colorLabel,
      emojiChoices: [
        { value: "🚗", label: "Car", recommended: true },
        { value: "🏎️", label: "Sport" },
        { value: "🚕", label: "Taxi" },
        { value: "🛻", label: "Pickup" },
        { value: "🚌", label: "Bus" }
      ]
    }, "assistant");
  };

  const completeBudgetPotFlow = async () => {
    const flow = assistantState.flow;
    if (!flow?.potName || !flow?.color || !flow?.emoji) return;
    const pots = await getBudgetPots();
    const pot = {
      id: `pot_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      name: flow.potName,
      emoji: flow.emoji,
      color: flow.color,
      goal: 0,
      balance: 0
    };
    pots.push(pot);
    await setBudgetPots(pots);
    assistantState.flow = null;
    addLog({
      title: "Budgeting pot created",
      body: `${pot.name} is ready. I used ${pot.emoji} with the ${flow.colorLabel.toLowerCase()} colour and left the goal open so you can set it later.`,
      bullets: [
        `Pot name: ${pot.name}`,
        `Emoji: ${pot.emoji}`,
        "You can add a goal or move money into it from the Budgeting Pots screen."
      ],
      actions: [
        { label: "Open this pot", route: `/pot-detail?id=${encodeURIComponent(pot.id)}` },
        { label: "View all pots", route: "/budget-pots" }
      ]
    }, "assistant");
  };

  const showTyping = () => {
    const row = document.createElement("div");
    row.className = "assistant-msg assistant-typing";
    row.innerHTML = `<span></span><span></span><span></span>`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  };

  let snapshotPromise = buildAssistantSnapshot(profile)
    .then((snapshot) => {
      wrap.__assistantSnapshot = snapshot;
      context.innerHTML = renderAssistantContext(snapshot, path);
      if (!log.dataset.seeded) {
        addLog({
          title: `Hi ${snapshot.userName.split(" ")[0]}. I am your money agent.`,
          body: "I am using your live demo balance, recent transactions, pots, and app activity to make the next recommendation concrete.",
          bullets: [
            `Available balance right now: ${formatMoney(snapshot.balance)}`,
            `Main spending pressure: ${snapshot.topCategory}`,
            `Try asking for a health check, a savings plan, or the best next screen to open.`
          ],
          actions: getAssistantActionsForIntent("overview")
        });
        log.dataset.seeded = "1";
      }
      return snapshot;
    })
    .catch(() => {
      context.innerHTML = `<div class="assistant-context-note">Live context is temporarily unavailable, but I can still guide you around the app.</div>`;
      return {
        userName: profile?.name || "there",
        balance: 0,
        interests: [],
        confidence: profile?.financeConfidence || profile?.finance_competency || "comfortable",
        outgoing: [],
        incoming: [],
        recentTransactions: [],
        topCategory: "General",
        topCategoryAmount: 0,
        topMerchant: "No merchant data yet",
        topMerchantAmount: 0,
        potsCount: 0,
        potTotal: 0,
        unreadThreads: 0,
        practiceCash: 0,
        practicePositions: 0
      };
    });

  const handleSend = async () => {
    const q = input.value.trim();
    if (!q) return;
    addLog(q, "user");
    input.value = "";
    if (assistantState.flow?.type === "budget-pot" && assistantState.flow.step === "name") {
      assistantState.flow.potName = q;
      const typing = showTyping();
      setTimeout(() => {
        typing.remove();
        showBudgetPotColorStep();
      }, 420);
      return;
    }
    if (q.toLowerCase().includes("help me make a new budgeting pot")) {
      const typing = showTyping();
      setTimeout(() => {
        typing.remove();
        startBudgetPotFlow();
      }, 420);
      return;
    }
    const typing = showTyping();
    const snapshot = await snapshotPromise;
    const delayMs = 700 + Math.floor(Math.random() * 550);
    const response = buildAssistantResponse(q, snapshot, path);
    setTimeout(() => {
      typing.remove();
      addLog(response, "assistant");
    }, delayMs);
  };

  wrap.__assistantOpenPreset = (userText, responsePayload) => {
    if (userText) addLog(userText, "user");
    const typing = showTyping();
    const delayMs = 520 + Math.floor(Math.random() * 280);
    setTimeout(() => {
      typing.remove();
      addLog(responsePayload, "assistant");
    }, delayMs);
  };

  log.onclick = (event) => {
    const action = event.target.closest("[data-assistant-route]");
    if (action) {
      const route = action.getAttribute("data-assistant-route") || "/home";
      go(route);
      return;
    }
    const colorBtn = event.target.closest("[data-assistant-pot-color]");
    if (colorBtn && assistantState.flow?.type === "budget-pot") {
      assistantState.flow.color = colorBtn.getAttribute("data-assistant-pot-color") || POT_COLORS[0];
      assistantState.flow.colorLabel = colorBtn.getAttribute("data-assistant-pot-label") || "Colour";
      showBudgetPotEmojiStep();
      return;
    }
    const emojiBtn = event.target.closest("[data-assistant-pot-emoji]");
    if (emojiBtn && assistantState.flow?.type === "budget-pot") {
      assistantState.flow.emoji = emojiBtn.getAttribute("data-assistant-pot-emoji") || "🚗";
      completeBudgetPotFlow();
    }
  };

  clearBtn.onclick = async () => {
    log.innerHTML = "";
    delete log.dataset.seeded;
    assistantState.flow = null;
    snapshotPromise = buildAssistantSnapshot(profile).catch(() => ({
      userName: profile?.name || "there",
      balance: 0,
      interests: [],
      confidence: profile?.financeConfidence || profile?.finance_competency || "comfortable",
      outgoing: [],
      incoming: [],
      recentTransactions: [],
      topCategory: "General",
      topCategoryAmount: 0,
      topMerchant: "No merchant data yet",
      topMerchantAmount: 0,
      potsCount: 0,
      potTotal: 0,
      unreadThreads: 0,
      practiceCash: 0,
      practicePositions: 0
    }));
    const snapshot = await snapshotPromise;
    context.innerHTML = renderAssistantContext(snapshot, path);
    addLog({
      title: `Fresh start for ${snapshot.userName.split(" ")[0]}`,
      body: "I refreshed your money context and I am ready to run a new task.",
      bullets: [
        `Balance now: ${formatMoney(snapshot.balance)}`,
        `Top focus area: ${snapshot.topCategory}`,
        `Ask me for a health check, savings plan, deals route, or learning suggestion.`
      ],
      actions: getAssistantActionsForIntent("overview")
    }, "assistant");
    input.focus();
  };

  const setAssistantOpen = (open) => {
    panel.classList.toggle("open", open);
    backdrop.classList.toggle("open", open);
  };

  trigger.onclick = () => setAssistantOpen(!panel.classList.contains("open"));
  backdrop.onclick = () => setAssistantOpen(false);
  send.onclick = handleSend;
  input.onkeydown = (e) => {
    if (e.key === "Enter") handleSend();
  };
}

function clearTutorialOverlay() {
  document.querySelectorAll(".tutorial-focus").forEach((el) => el.classList.remove("tutorial-focus"));
  const overlay = document.querySelector("#guidedTutorialOverlay");
  if (overlay) overlay.remove();
}

function maybeRenderGuidedTutorial(path) {
  clearTutorialOverlay();
  const params = getHashParams();
  if (params.get("tutorial") !== "1") return;
  const step = Number(params.get("step") || localStorage.getItem(STORAGE_KEYS.tutorialWalkthroughStep) || 0);
  if (!Number.isFinite(step) || step < 0 || step >= GUIDED_TUTORIAL_STEPS.length) return;
  const config = GUIDED_TUTORIAL_STEPS[step];
  if (!config || config.path !== path) return;

  const target = document.querySelector(config.selector);
  if (target) target.classList.add("tutorial-focus");

  const overlay = document.createElement("div");
  overlay.id = "guidedTutorialOverlay";
  overlay.className = "guided-tutorial-overlay";
  overlay.innerHTML = `
    <div class="guided-tutorial-card">
      <div class="guided-tutorial-top">
        <strong>${config.title}</strong>
        <span class="guided-tutorial-label">Live Screen</span>
      </div>
      <p class="muted" style="margin:0;">${config.body}</p>
      <div class="guided-tutorial-actions">
        <button id="guidedTutorialSkip" class="action-btn" type="button">Skip</button>
        <button id="guidedTutorialNext" class="primary-btn" type="button">${step === GUIDED_TUTORIAL_STEPS.length - 1 ? "Finish" : "Next"}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const skipBtn = overlay.querySelector("#guidedTutorialSkip");
  const nextBtn = overlay.querySelector("#guidedTutorialNext");
  const finish = async () => {
    localStorage.removeItem(STORAGE_KEYS.tutorialWalkthroughStep);
    clearTutorialOverlay();
    const profile = await updateProfile({ tutorialDone: true });
    setDemoSessionUnlocked(true);
    go(nextRouteAfterUnlock(profile));
  };
  if (skipBtn) skipBtn.onclick = finish;
  if (nextBtn) {
    nextBtn.onclick = async () => {
      if (step >= GUIDED_TUTORIAL_STEPS.length - 1) {
        await finish();
        return;
      }
      const nextStep = step + 1;
      localStorage.setItem(STORAGE_KEYS.tutorialWalkthroughStep, String(nextStep));
      const next = GUIDED_TUTORIAL_STEPS[nextStep];
      go(`${next.path}?tutorial=1&step=${nextStep}`);
    };
  }
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
  if (path !== "/practice-investing" && window.__practiceInvestingTicker) {
    clearInterval(window.__practiceInvestingTicker);
    window.__practiceInvestingTicker = null;
  }
  rememberRoute(path);
  hydrateTheme();
  const profile = await getProfile();
  applySettingsToDOM({ ...SETTINGS_DEFAULTS, ...(profile.settings || {}) });
  initAssistantWidget(profile, path);
  mountAssistantInlineLinks(path);
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
    showTopNotification.withAction(
      `You have ${pendingRequests} new ${label}`,
      "Open",
      () => go("/friends")
    );
  }
  localStorage.setItem(STORAGE_KEYS.friendReqSeenCount, String(pendingRequests));

  let handler = null;
  if (path === "/login") handler = initLogin;
  else if (path === "/splash") handler = initSplash;
  else if (path === "/unlock") handler = initUnlock;
  else if (path === "/onboarding") handler = initOnboarding;
  else if (path === "/home") handler = initHome;
  else if (path === "/account") handler = initAccount;
  else if (path === "/lloyds-data") handler = initLloydsData;
  else if (path === "/practice-investing") handler = initPracticeInvesting;
  else if (path === "/friends") handler = initFriends;
  else if (path === "/friend-profile") handler = initFriendProfile;
  else if (path === "/dms") handler = initDMs;
  else if (path === "/shopping-list") handler = initShoppingList;
  else if (path === "/tutorial") handler = initTutorial;
  else if (path === "/learn") handler = initLearn;
  else if (path === "/quizzes") handler = initQuizzes;
  else if (path === "/quiz-video") handler = initQuizVideo;
  else if (path === "/quiz-questions") handler = initQuizQuestions;
  else if (path === "/quiz-summary") handler = initQuizSummary;
  else if (path === "/transaction") handler = initTransaction;
  else if (path === "/add-money") handler = initAddMoney;
  else if (path === "/add-to-pot") handler = initAddToPot;
  else if (path === "/scan-cheque") handler = initScanCheque;
  else if (path === "/move-from-pot") handler = initMoveFromPot;
  else if (path === "/payments") handler = initPayments;
  else if (path === "/bill-splitting") handler = initBillSplitting;
  else if (path === "/insights") handler = initInsights;
  else if (path === "/spending-wrapped") handler = initSpendingWrapped;
  else if (path === "/budget-pots") handler = initBudgetPots;
  else if (path === "/pot-create") handler = initPotCreate;
  else if (path === "/pot-detail") handler = initPotDetail;
  else if (path === "/deal-dash") handler = initDealNest;
  else if (path === "/money-minutes") handler = initMoneyMinutes;
  else if (path === "/settings") handler = initSettings;
  else if (path === "/admin-console") handler = initAdminConsole;

  if (handler) await handler();
  maybeRenderGuidedTutorial(path);
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
  const openDatasetBtn = document.querySelector("#openDatasetBtn");

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

  if (openDatasetBtn) {
    openDatasetBtn.onclick = () => go("/lloyds-data");
  }
}

function initLloydsData() {
  const overviewEl = document.querySelector("#datasetOverview");
  const productsEl = document.querySelector("#datasetProducts");
  const customersEl = document.querySelector("#datasetCustomers");
  const activityEl = document.querySelector("#datasetActivity");
  const hotspotsEl = document.querySelector("#datasetHotspots");
  const statusEl = document.querySelector("#datasetStatus");

  const safeMoney = (value) => formatMoney(Number(value || 0));
  const safeDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  Promise.all([
    fetchDatasetOverview(),
    fetchDatasetProducts(12),
    fetchDatasetCustomerProfiles(10),
    fetchDatasetRecentActivity(8),
    fetchDatasetInteractionHotspots(6)
  ])
    .then(([overview, products, customers, activity, hotspots]) => {
      if (statusEl) {
        statusEl.textContent = overview
          ? `Imported dataset now live in Supabase: ${overview.customer_count || 0} customers, ${overview.transaction_count || 0} transactions.`
          : "Dataset not available yet.";
      }

      if (overviewEl && overview) {
        const cards = [
          { label: "Products", value: overview.product_count || 0 },
          { label: "Customers", value: overview.customer_count || 0 },
          { label: "Accounts", value: overview.account_count || 0 },
          { label: "Transactions", value: overview.transaction_count || 0 },
          { label: "Interactions", value: overview.interaction_count || 0 },
          { label: "Outgoing", value: safeMoney(overview.total_outgoing) }
        ];
        overviewEl.innerHTML = cards
          .map(
            (item) => `
              <div class="dataset-stat-card">
                <div class="dataset-stat-label">${item.label}</div>
                <div class="dataset-stat-value">${item.value}</div>
              </div>
            `
          )
          .join("");
      }

      if (productsEl) {
        productsEl.innerHTML = products.length
          ? products
              .map(
                (item) => `
                  <div class="dataset-product-card">
                    <div class="dataset-product-type">${item.product_type || "Product"}</div>
                    <div class="dataset-product-name">${item.product_name}</div>
                    <div class="dataset-product-meta">ID ${item.product_id}</div>
                    <div class="dataset-product-copy">${item.product_benefits || "No extra benefits listed in the source dataset."}</div>
                  </div>
                `
              )
              .join("")
          : `<div class="muted">No products imported yet.</div>`;
      }

      if (customersEl) {
        customersEl.innerHTML = customers.length
          ? customers
              .map(
                (item) => `
                  <div class="dataset-customer-row">
                    <div>
                      <div class="dataset-customer-name">${item.display_name || "Customer"}</div>
                      <div class="dataset-customer-meta">${item.city || "Unknown city"} • ${item.income_band || "Unknown income band"}</div>
                    </div>
                    <div class="dataset-customer-side">
                      <strong>${item.account_count || 0} accounts</strong>
                      <span>${item.linked_products || "No linked products"}</span>
                    </div>
                  </div>
                `
              )
              .join("")
          : `<div class="muted">No customer records imported yet.</div>`;
      }

      if (activityEl) {
        activityEl.innerHTML = activity.length
          ? activity
              .map(
                (item) => `
                  <div class="dataset-activity-row">
                    <div>
                      <div class="dataset-activity-title">${item.transaction_category || "Transaction"} • ${item.customer_name || "Customer"}</div>
                      <div class="dataset-activity-meta">${item.product_name || "Product"} • ${safeDate(item.transaction_date)} • ${item.payment_type_description || item.payment_type || "Payment"}</div>
                    </div>
                    <div class="dataset-activity-amount ${Number(item.transaction_amount || 0) < 0 ? "negative" : "positive"}">${safeMoney(item.transaction_amount)}</div>
                  </div>
                `
              )
              .join("")
          : `<div class="muted">No transaction activity imported yet.</div>`;
      }

      if (hotspotsEl) {
        hotspotsEl.innerHTML = hotspots.length
          ? hotspots
              .map(
                (item) => `
                  <div class="dataset-hotspot-row">
                    <div>
                      <div class="dataset-hotspot-name">${item.area_description || "Area"}</div>
                      <div class="dataset-hotspot-meta">Latest visit ${safeDate(item.latest_visit_date)}</div>
                    </div>
                    <div class="dataset-hotspot-count">${item.visit_count || 0}</div>
                  </div>
                `
              )
              .join("")
          : `<div class="muted">No interaction data imported yet.</div>`;
      }
    })
    .catch((error) => {
      if (statusEl) statusEl.textContent = `Dataset could not be loaded: ${error?.message || error}`;
    });
}

function initPracticeInvesting() {
  const selectEl = document.querySelector("#investAssetSelect");
  const assetLabelEl = document.querySelector("#investAssetLabel");
  const assetTypeEl = document.querySelector("#investAssetType");
  const priceEl = document.querySelector("#investPrice");
  const changeEl = document.querySelector("#investChange");
  const areaPathEl = document.querySelector("#investAreaPath");
  const linePathEl = document.querySelector("#investLinePath");
  const captionEl = document.querySelector("#investPriceCaption");
  const timeframeBtns = document.querySelectorAll("#investTimeframe [data-range]");
  const cashEl = document.querySelector("#investCash");
  const portfolioValueEl = document.querySelector("#investPortfolioValue");
  const positionQtyEl = document.querySelector("#investPositionQty");
  const pnlEl = document.querySelector("#investPnL");
  const quantityEl = document.querySelector("#investQuantity");
  const orderValueEl = document.querySelector("#investOrderValue");
  const cashAfterEl = document.querySelector("#investCashAfter");
  const positionsEl = document.querySelector("#investPositions");
  const tradeBtn = document.querySelector("#investTradeBtn");
  const buyBtn = document.querySelector("#investBuyBtn");
  const sellBtn = document.querySelector("#investSellBtn");
  const maxBtn = document.querySelector("#investMaxBtn");
  const resetBtn = document.querySelector("#investResetBtn");
  const learnBtn = document.querySelector("#investLearnBtn");
  const closeBtn = document.querySelector("#investCloseBtn");
  const quickBtns = document.querySelectorAll(".invest-quick-btn");
  const heroCard = document.querySelector("#investHeroCard");

  if (!selectEl) return;

  if (window.__practiceInvestingTicker) {
    clearInterval(window.__practiceInvestingTicker);
    window.__practiceInvestingTicker = null;
  }

  const state = {
    side: "buy",
    portfolio: getDefaultPracticePortfolio(),
    selectedSymbol: "AAPL",
    market: {},
    timeframe: "1m",
    guideStep: -1
  };

  const guideSteps = [
    { selector: "#investMarketPanel", title: "Market picker", body: "Choose a stock, ETF or crypto here. Prices on this page are simulated and move automatically to mimic a live market." },
    { selector: "#investChartCard", title: "Price chart", body: "This chart shows the recent simulated move for the selected asset. The price and percentage change update every few seconds." },
    { selector: "#investTradeBar", title: "Buy and sell", body: "The main trade buttons stay visible near the top. Choose buy or sell first, then set a quantity below." },
    { selector: "#investOrderPanel", title: "Order ticket", body: "Set the number of units here and review the estimated order value before placing a practice trade." },
    { selector: "#investPortfolioPanel", title: "Portfolio", body: "This section tracks your open positions, average entry price and live unrealised profit or loss." }
  ];

  const money = (value) => formatMoney(Number(value || 0));

  const getAsset = () => PRACTICE_ASSETS.find((item) => item.symbol === state.selectedSymbol) || PRACTICE_ASSETS[0];

  const generateSeries = (asset, points, amplitude, trendWeight) => {
    const series = [];
    let current = asset.basePrice;
    for (let idx = 0; idx < points; idx += 1) {
      const wave = Math.sin(idx / 2.8) * asset.basePrice * amplitude * 1.7;
      const drift = (idx - points / 2) * asset.basePrice * trendWeight;
      current = Math.max(0.01, asset.basePrice + wave + drift + ((Math.random() - 0.5) * asset.basePrice * amplitude));
      series.push(Number(current.toFixed(2)));
    }
    return series;
  };

  const ensureSeries = (symbol) => {
    if (state.market[symbol]) return state.market[symbol];
    const asset = PRACTICE_ASSETS.find((item) => item.symbol === symbol) || PRACTICE_ASSETS[0];
    const minute = generateSeries(asset, 24, asset.drift * 1.1, asset.drift * 0.02);
    const hour = generateSeries(asset, 30, asset.drift * 1.8, asset.drift * 0.06);
    const day = generateSeries(asset, 32, asset.drift * 2.9, asset.drift * 0.12);
    const month = generateSeries(asset, 30, asset.drift * 4.4, asset.drift * 0.22);
    state.market[symbol] = {
      price: minute.at(-1) || asset.basePrice,
      seriesByRange: {
        "1m": minute,
        "1h": hour,
        "1d": day,
        "1mo": month
      }
    };
    return state.market[symbol];
  };

  const chartPath = (series) => {
    if (!series.length) return { line: "", area: "" };
    const width = 320;
    const height = 170;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = Math.max(1, max - min);
    const coords = series.map((value, index) => {
      const x = (index / Math.max(1, series.length - 1)) * width;
      const y = height - (((value - min) / range) * (height - 20) + 10);
      return [Number(x.toFixed(2)), Number(y.toFixed(2))];
    });
    const line = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return { line, area };
  };

  const selectedQty = () => Math.max(1, Number(quantityEl?.value || 1));

  const getHolding = (symbol) => {
    const raw = state.portfolio.holdings?.[symbol];
    if (!raw || typeof raw !== "object") return { quantity: 0, averagePrice: 0 };
    return {
      quantity: Number(raw.quantity || 0),
      averagePrice: Number(raw.averagePrice || 0)
    };
  };

  const totalPortfolioValue = () => {
    let total = Number(state.portfolio.cash || 0);
    Object.entries(state.portfolio.holdings || {}).forEach(([symbol, holding]) => {
      const market = ensureSeries(symbol);
      total += Number(holding.quantity || 0) * Number(market.price || 0);
    });
    return total;
  };

  const removeGuide = () => {
    document.querySelectorAll(".tutorial-focus").forEach((el) => el.classList.remove("tutorial-focus"));
    document.querySelector("#practiceInvestGuide")?.remove();
  };

  const renderGuide = () => {
    removeGuide();
    if (state.guideStep < 0 || state.guideStep >= guideSteps.length) return;
    const step = guideSteps[state.guideStep];
    const target = document.querySelector(step.selector);
    if (target) target.classList.add("tutorial-focus");
    const overlay = document.createElement("div");
    overlay.id = "practiceInvestGuide";
    overlay.className = "guided-tutorial-overlay";
    overlay.innerHTML = `
      <div class="guided-tutorial-card">
        <div class="guided-tutorial-top">
          <strong>${step.title}</strong>
          <span>${state.guideStep + 1} / ${guideSteps.length}</span>
        </div>
        <p class="muted">${step.body}</p>
        <div class="guided-tutorial-actions">
          <button id="practiceGuideSkip" class="action-btn" type="button">Close</button>
          <button id="practiceGuideNext" class="primary-btn" type="button">${state.guideStep === guideSteps.length - 1 ? "Done" : "Next"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#practiceGuideSkip")?.addEventListener("click", () => {
      state.guideStep = -1;
      removeGuide();
    });
    overlay.querySelector("#practiceGuideNext")?.addEventListener("click", () => {
      state.guideStep += 1;
      if (state.guideStep >= guideSteps.length) {
        state.guideStep = -1;
        removeGuide();
        return;
      }
      renderGuide();
    });
  };

  const renderStats = () => {
    const asset = getAsset();
    const market = ensureSeries(asset.symbol);
    const series = market.seriesByRange?.[state.timeframe] || market.seriesByRange?.["1m"] || [];
    const first = series[0] || market.price || asset.basePrice;
    const pct = first ? (((market.price - first) / first) * 100) : 0;
    const position = getHolding(asset.symbol);
    const currentPositionValue = position.quantity * market.price;
    const currentPnL = position.quantity * (market.price - position.averagePrice);
    const totalValue = totalPortfolioValue();
    const { line, area } = chartPath(series);

    if (assetLabelEl) assetLabelEl.textContent = `${asset.name} (${asset.symbol})`;
    if (assetTypeEl) assetTypeEl.textContent = `${asset.type} • Simulated ${asset.currency} pricing`;
    if (priceEl) priceEl.textContent = money(market.price);
    if (changeEl) {
      changeEl.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
      changeEl.className = `invest-change ${pct > 0 ? "positive" : pct < 0 ? "negative" : "neutral"}`;
    }
    if (linePathEl) linePathEl.setAttribute("d", line);
    if (areaPathEl) areaPathEl.setAttribute("d", area);
    if (captionEl) {
      const rangeCopy = {
        "1m": "the last minute",
        "1h": "the last hour",
        "1d": "the last day",
        "1mo": "the last month"
      };
      captionEl.textContent = `${asset.symbol} has moved between ${money(Math.min(...series))} and ${money(Math.max(...series))} over ${rangeCopy[state.timeframe] || "this period"}.`;
    }
    if (cashEl) cashEl.textContent = money(state.portfolio.cash);
    if (portfolioValueEl) portfolioValueEl.textContent = money(totalValue);
    if (positionQtyEl) positionQtyEl.textContent = `${position.quantity || 0} units`;
    if (pnlEl) {
      pnlEl.textContent = `${currentPnL >= 0 ? "+" : ""}${money(currentPnL)}`;
      pnlEl.className = `invest-stat-value ${currentPnL > 0 ? "positive" : currentPnL < 0 ? "negative" : "neutral"}`;
    }

    const qty = selectedQty();
    const orderValue = qty * market.price;
    if (orderValueEl) orderValueEl.textContent = money(orderValue);
    const projectedCash = state.side === "buy"
      ? Number(state.portfolio.cash || 0) - orderValue
      : Number(state.portfolio.cash || 0) + orderValue;
    if (cashAfterEl) cashAfterEl.textContent = money(projectedCash);
    if (tradeBtn) tradeBtn.textContent = `${state.side === "buy" ? "Buy" : "Sell"} ${qty} in practice`;

    if (positionsEl) {
      const entries = Object.entries(state.portfolio.holdings || {}).filter(([, holding]) => Number(holding.quantity || 0) > 0);
      positionsEl.innerHTML = entries.length
        ? entries
            .map(([symbol, holding]) => {
              const assetMeta = PRACTICE_ASSETS.find((item) => item.symbol === symbol) || { name: symbol };
              const latest = ensureSeries(symbol).price;
              const pnl = Number(holding.quantity || 0) * (latest - Number(holding.averagePrice || 0));
              return `
                <div class="invest-list-row">
                  <div>
                    <div class="invest-list-title">${assetMeta.name} (${symbol})</div>
                    <div class="invest-list-meta">${holding.quantity} units • Avg ${money(holding.averagePrice)} • Live ${money(latest)}</div>
                  </div>
                  <div class="invest-list-side ${pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral"}">${pnl >= 0 ? "+" : ""}${money(pnl)}</div>
                </div>
              `;
            })
            .join("")
        : `<div class="muted">No positions yet. Use fake cash to place your first practice trade.</div>`;
    }
  };

  const persistAndRender = async () => {
    await setPracticePortfolio(state.portfolio);
    renderStats();
  };

  const updateSideUI = () => {
    if (buyBtn) buyBtn.classList.toggle("active", state.side === "buy");
    if (sellBtn) sellBtn.classList.toggle("active", state.side === "sell");
    renderStats();
  };

  const updateTimeframeUI = () => {
    timeframeBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.range === state.timeframe));
    renderStats();
  };

  const selectAsset = async (symbol) => {
    state.selectedSymbol = symbol;
    state.portfolio.selectedSymbol = symbol;
    await setPracticePortfolio(state.portfolio);
    renderStats();
  };

  if (buyBtn) {
    buyBtn.addEventListener("click", () => {
      state.side = "buy";
      updateSideUI();
    });
  }

  if (sellBtn) {
    sellBtn.addEventListener("click", () => {
      state.side = "sell";
      updateSideUI();
    });
  }

  timeframeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.timeframe = btn.dataset.range || "1m";
      updateTimeframeUI();
    });
  });

  quickBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextQty = selectedQty() + Number(btn.dataset.qty || 0);
      if (quantityEl) quantityEl.value = String(nextQty);
      renderStats();
    });
  });

  if (quantityEl) quantityEl.addEventListener("input", renderStats);

  if (maxBtn) {
    maxBtn.addEventListener("click", () => {
      const asset = getAsset();
      const market = ensureSeries(asset.symbol);
      const holding = getHolding(asset.symbol);
      const maxQty = state.side === "buy"
        ? Math.max(1, Math.floor(Number(state.portfolio.cash || 0) / Math.max(0.01, market.price)))
        : Math.max(1, Math.floor(Number(holding.quantity || 0)));
      if (quantityEl) quantityEl.value = String(maxQty || 1);
      renderStats();
    });
  }

  if (tradeBtn) {
    tradeBtn.addEventListener("click", async () => {
      const asset = getAsset();
      const market = ensureSeries(asset.symbol);
      const qty = selectedQty();
      const total = Number((qty * market.price).toFixed(2));
      const holding = getHolding(asset.symbol);

      if (state.side === "buy") {
        if (total > Number(state.portfolio.cash || 0)) {
          showActionModal({ title: "Not Enough Practice Cash", message: "This practice order is larger than your fake wallet. Lower the quantity or reset the practice wallet." });
          return;
        }
        const nextQty = holding.quantity + qty;
        const nextAvg = nextQty ? (((holding.quantity * holding.averagePrice) + total) / nextQty) : market.price;
        state.portfolio.cash = Number((Number(state.portfolio.cash || 0) - total).toFixed(2));
        state.portfolio.holdings[asset.symbol] = { quantity: nextQty, averagePrice: Number(nextAvg.toFixed(2)) };
      } else {
        if (qty > holding.quantity) {
          showActionModal({ title: "Not Enough Units", message: "You cannot sell more fake units than you currently hold in this practice portfolio." });
          return;
        }
        const nextQty = holding.quantity - qty;
        state.portfolio.cash = Number((Number(state.portfolio.cash || 0) + total).toFixed(2));
        if (nextQty <= 0) delete state.portfolio.holdings[asset.symbol];
        else state.portfolio.holdings[asset.symbol] = { quantity: nextQty, averagePrice: holding.averagePrice };
      }

      state.portfolio.trades = [
        {
          id: `practice_trade_${Date.now()}`,
          symbol: asset.symbol,
          side: state.side,
          quantity: qty,
          price: Number(market.price.toFixed(2)),
          total,
          createdAt: new Date().toISOString()
        },
        ...(state.portfolio.trades || [])
      ].slice(0, 40);

      await persistAndRender();
      showTopNotification.withAction(
        `${state.side === "buy" ? "Bought" : "Sold"} ${qty} ${asset.symbol} in practice mode.`,
        "Open",
        () => go("/practice-investing"),
        4200
      );
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      state.portfolio = getDefaultPracticePortfolio();
      state.selectedSymbol = state.portfolio.selectedSymbol;
      if (selectEl) selectEl.value = state.selectedSymbol;
      if (quantityEl) quantityEl.value = "1";
      await persistAndRender();
      showTopNotification("Practice wallet reset.");
    });
  }

  if (learnBtn) {
    learnBtn.addEventListener("click", () => {
      state.guideStep = 0;
      renderGuide();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (heroCard) heroCard.classList.add("hidden");
    });
  }

  selectEl.innerHTML = PRACTICE_ASSETS
    .map((asset) => `<option value="${asset.symbol}">${asset.name} (${asset.symbol}) • ${asset.type}</option>`)
    .join("");
  selectEl.addEventListener("change", () => {
    selectAsset(selectEl.value);
  });

  getPracticePortfolio().then(async (portfolio) => {
    state.portfolio = portfolio;
    state.selectedSymbol = portfolio.selectedSymbol || "AAPL";
    if (selectEl) selectEl.value = state.selectedSymbol;
    PRACTICE_ASSETS.forEach((asset) => ensureSeries(asset.symbol));
    renderStats();
    window.__practiceInvestingTicker = setInterval(() => {
      PRACTICE_ASSETS.forEach((asset) => {
        const market = ensureSeries(asset.symbol);
        const volatility = asset.basePrice * asset.drift;
        const next = Math.max(0.01, market.price + ((Math.random() - 0.5) * volatility * 2.4));
        market.price = Number(next.toFixed(2));
        market.seriesByRange["1m"] = [...market.seriesByRange["1m"].slice(-23), market.price];
      });
      renderStats();
    }, 1800);
  });
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
      go(isDemoSessionUnlocked() ? nextRouteAfterUnlock(profile) : "/unlock");
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
    else if (!isDemoSessionUnlocked()) go("/unlock");
    else go(nextRouteAfterUnlock(latest));
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
  const openPracticeInvesting = document.querySelector("#openPracticeInvesting");
  const openLearn = document.querySelector("#openLearn");
  const openInsights = document.querySelector("#openInsights");
  const topActions = document.querySelector(".top-actions");
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
  const balanceCard = document.querySelector("#homeBalanceCard");
  const cardDetails = document.querySelector("#cardDetails");
  const homePotsSummaryBalance = document.querySelector("#homePotsSummaryBalance");
  const cardName = document.querySelector("#cardAccountName");
  const cardNameTop = document.querySelector("#cardAccountNameTop");

  const syncBalanceCardHeight = () => {
    if (!balanceCard) return;
    const faces = Array.from(balanceCard.querySelectorAll(".flip-card-face"));
    const maxHeight = faces.reduce((max, face) => Math.max(max, face.scrollHeight || 0), 0);
    if (maxHeight > 0) {
      const targetHeight = Math.min(Math.max(188, maxHeight), 198);
      balanceCard.style.minHeight = `${targetHeight}px`;
      const inner = balanceCard.querySelector(".flip-card-inner");
      if (inner) inner.style.minHeight = `${targetHeight}px`;
    }
  };

  const setCardName = (fullName = "") => {
    const firstName = String(fullName || "").trim().split(" ")[0] || "Account";
    if (cardName) cardName.textContent = firstName;
    if (cardNameTop) cardNameTop.textContent = firstName;
  };

  if (sendBtn) sendBtn.onclick = () => go("/payments");
  if (addBtn) addBtn.onclick = () => go("/add-money");
  if (potsBtn) potsBtn.onclick = () => go("/budget-pots");
  if (viewAllPots) viewAllPots.onclick = () => go("/budget-pots");
  if (homeMoveMoney) homeMoveMoney.onclick = () => go("/move-from-pot");
  if (openShoppingList) openShoppingList.onclick = () => go("/shopping-list");
  if (openPracticeInvesting) openPracticeInvesting.onclick = () => go("/practice-investing");
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

  if (topActions && !topActions.querySelector("#homeWrappedBtn")) {
    const wrappedBtn = document.createElement("button");
    wrappedBtn.id = "homeWrappedBtn";
    wrappedBtn.className = "top-wrapped-btn";
    wrappedBtn.type = "button";
    wrappedBtn.textContent = "Wrapped";
    wrappedBtn.onclick = () => go("/spending-wrapped");
    const settingsBtn = topActions.querySelector("#homeTopSettingsBtn");
    if (settingsBtn) topActions.insertBefore(wrappedBtn, settingsBtn);
    else topActions.prepend(wrappedBtn);
  }

  const toggleFlip = () => {
    if (!balanceCard) return;
    balanceCard.classList.toggle("flipped");
  };
  if (balanceExpand) {
    balanceExpand.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFlip();
    };
  }
  if (balanceCard) {
    balanceCard.onclick = () => toggleFlip();
    balanceCard.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleFlip();
      }
    };
    if (!balanceCard.dataset.heightBound) {
      window.addEventListener("resize", syncBalanceCardHeight);
      balanceCard.dataset.heightBound = "1";
    }
  }

  getProfile().then((profile) => {
    const settings = { ...SETTINGS_DEFAULTS, ...(profile.settings || {}) };
    document.body.classList.toggle("balance-hidden", !!settings.hideBalances);
    const nameEl = document.querySelector("#homeName");
    if (nameEl) nameEl.textContent = profile.name || "there";
    setCardName(profile.name || "");
    requestAnimationFrame(syncBalanceCardHeight);
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
    const friendList = Array.isArray(profile.friends) ? profile.friends : [];
    const fakeNameById = new Map(friendList.map((f) => [String(f.id), f.name || "friend"]));
    const user = await ensureRemoteUserProfile(profile);
    let remoteUsers = [];
    try {
      remoteUsers = await fetchUsers();
    } catch {
      remoteUsers = [];
    }
    const userNameById = new Map((remoteUsers || []).map((u) => [String(u.id), u.name || "User"]));
    const nameFor = (id) => {
      const key = String(id || "");
      return fakeNameById.get(key) || userNameById.get(key) || "friend";
    };
    if (user && Number(ledger.balanceDelta || 0) !== 0) {
      const sync = await syncPendingBalanceDelta(profile, ledger);
      ledger = sync.ledger;
    }
    if (!user) {
      const localTx = (ledger.transactions || []).map((tx) => ({
        ...tx,
        _direction: String(tx.from_user || "") === "local_user" ? "expense" : "income",
        _title: String(tx.from_user || "") === "local_user"
          ? `To ${tx.counterpartyName || nameFor(tx.to_user)}`
          : `From ${tx.counterpartyName || nameFor(tx.from_user)}`,
        _icon: String(tx.from_user || "") === "local_user" ? "⬆️" : "⬇️",
        _amountLabel: `${String(tx.from_user || "") === "local_user" ? "-" : "+"}${formatMoney(tx.amount)}`
      }));
      allTransactions = localTx;
      const localBalance = Math.max(0, 250 + Number(ledger.balanceDelta || 0));
      if (balanceEl) balanceEl.textContent = formatMoney(localBalance);
      if (balanceOverlayEl) balanceOverlayEl.textContent = formatMoney(localBalance);
    if (homePotsSummaryBalance) homePotsSummaryBalance.textContent = formatMoney(localBalance);
    renderTransactions("all");
    requestAnimationFrame(syncBalanceCardHeight);
    return;
    }
    const remote = await fetchUserById(user.id);
    if (remote?.name && remote.name !== profile.name) {
      await updateProfile({ name: remote.name });
      const nameEl = document.querySelector("#homeName");
      if (nameEl) nameEl.textContent = remote.name;
      setCardName(remote.name);
    } else if (remote?.name) {
      setCardName(remote.name);
    }

    const remoteBalance = await fetchBalance(user.id);
    const displayBalance = remoteBalance + Number(ledger.balanceDelta || 0);
    if (balanceEl) balanceEl.textContent = formatMoney(displayBalance);
    if (balanceOverlayEl) balanceOverlayEl.textContent = formatMoney(displayBalance);
    if (homePotsSummaryBalance) homePotsSummaryBalance.textContent = formatMoney(displayBalance);

    const txs = await fetchTransactions(user.id, 10);
    const remoteMapped = txs.map((tx) => {
      const isIncome = tx.to_user === user.id;
      const title = isIncome
        ? `From ${nameFor(tx.from_user)}`
        : `To ${nameFor(tx.to_user)}`;
      return {
        ...tx,
        _direction: isIncome ? "income" : "expense",
        _title: title,
        _icon: isIncome ? "⬇️" : "⬆️",
        _amountLabel: `${isIncome ? "+" : "-"}${formatMoney(tx.amount)}`
      };
    });
    const localMapped = (ledger.transactions || []).map((tx) => ({
      ...tx,
      _direction: String(tx.from_user || "") === "local_user" ? "expense" : "income",
      _title: String(tx.from_user || "") === "local_user"
        ? `To ${tx.counterpartyName || nameFor(tx.to_user)}`
        : `From ${tx.counterpartyName || nameFor(tx.from_user)}`,
      _icon: String(tx.from_user || "") === "local_user" ? "⬆️" : "⬇️",
      _amountLabel: `${String(tx.from_user || "") === "local_user" ? "-" : "+"}${formatMoney(tx.amount)}`
    }));
    allTransactions = [...localMapped, ...remoteMapped]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    renderTransactions("all");
    requestAnimationFrame(syncBalanceCardHeight);

    const newestIncoming = remoteMapped.find((tx) => tx._direction === "income");
    if (newestIncoming?.created_at) {
      const seenAt = localStorage.getItem(STORAGE_KEYS.incomingSeenAt) || "";
      if (!seenAt || new Date(newestIncoming.created_at).getTime() > new Date(seenAt).getTime()) {
        showTopNotification.withAction(
          `Incoming ${formatMoney(newestIncoming.amount || 0)} received.`,
          "Open",
          () => go(`/transaction?id=${encodeURIComponent(newestIncoming.id)}`)
        );
        localStorage.setItem(STORAGE_KEYS.incomingSeenAt, newestIncoming.created_at);
      }
    }
  };

  loadRemoteSnapshot();

  const baseOrder = ["transactions", "pots", "shopping", "investing", "learn", "insights"];
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
  const search = document.querySelector("#shoppingSearch");
  const shell = document.querySelector(".shopping-shell");
  const dealsSection = document.querySelector("#shoppingDealsSection");
  const listSection = document.querySelector("#shoppingListSection");
  const resultsEl = document.querySelector("#shoppingSearchResults");
  const emptyEl = document.querySelector("#shoppingSearchEmpty");
  const countEl = document.querySelector("#shoppingCount");
  const resultCountEl = document.querySelector("#shoppingSearchCount");
  const comparisonSummary = document.querySelector("#shoppingComparisonSummary");
  const refreshBtn = document.querySelector("#shoppingRefreshDeals");
  const clearBtn = document.querySelector("#shoppingClearAll");
  let groceryItems = [];

  const fmt = (value) => `GBP ${Number(value).toFixed(2)}`;
  const normalise = (value) => String(value || "").trim().toLowerCase();

  const buildComparisonMap = (items) => {
    const map = new Map();
    items.forEach((item) => {
      const key = normalise(item.name);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    map.forEach((entries) => entries.sort((a, b) => Number(a.price || 0) - Number(b.price || 0)));
    return map;
  };

  const syncSectionOrder = () => {
    if (!shell || !dealsSection || !listSection) return;
    const hasSearch = Boolean(search?.value.trim());
    if (hasSearch) {
      shell.appendChild(dealsSection);
      shell.appendChild(listSection);
      return;
    }
    shell.appendChild(listSection);
    shell.appendChild(dealsSection);
  };

  const renderList = async () => {
    const profile = await getProfile();
    const items = Array.isArray(profile.shoppingList) ? profile.shoppingList : [];
    if (countEl) countEl.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "shopping-list-empty";
      empty.innerHTML = `
        <div class="deal-empty-title">Your list is empty</div>
        <div class="muted">Add grocery deals above or type your own item.</div>
      `;
      listEl.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "shopping-item";
      row.innerHTML = `
        <div class="shopping-item-main">
          <div class="shopping-item-dot"></div>
          <div>
            <div class="shopping-name">${item}</div>
            <div class="shopping-inline-meta">Saved to your next shop</div>
          </div>
        </div>
      `;

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
        renderList();
      };

      const removeBtn = document.createElement("button");
      removeBtn.className = "action-btn";
      removeBtn.textContent = "Remove";
      removeBtn.onclick = async () => {
        const profileNow = await getProfile();
        const list = Array.isArray(profileNow.shoppingList) ? profileNow.shoppingList : [];
        list.splice(index, 1);
        await updateProfile({ shoppingList: list });
        renderList();
        renderResults();
      };

      actions.appendChild(editBtn);
      actions.appendChild(removeBtn);
      row.appendChild(actions);
      listEl.appendChild(row);
    });
  };

  const addItem = async (rawValue) => {
    const val = String(rawValue || input?.value || "").trim();
    if (!val) return;
    const profile = await getProfile();
    const list = Array.isArray(profile.shoppingList) ? profile.shoppingList : [];
    if (!list.some((item) => normalise(item) === normalise(val))) {
      list.push(val);
      await updateProfile({ shoppingList: list });
    }
    if (input) input.value = "";
    renderList();
    renderResults();
  };

  const renderResults = async () => {
    if (!resultsEl) return;
    const term = search?.value.trim().toLowerCase() || "";
    syncSectionOrder();
    const filtered = groceryItems.filter((item) => {
      if (!term) return true;
      return [item.name, item.brand, item.store, item.category].some((field) =>
        String(field || "").toLowerCase().includes(term)
      );
    });

    if (resultCountEl) resultCountEl.textContent = `${filtered.length} results`;
    resultsEl.innerHTML = "";
    const comparisonMap = buildComparisonMap(groceryItems);
    const comparisonCandidates = [...comparisonMap.values()].filter((entries) => entries.length > 1);
    if (comparisonSummary) {
      if (comparisonCandidates.length && filtered.length) {
        const bestPick = comparisonCandidates
          .map((entries) => {
            const best = entries[0];
            const second = entries[1];
            return {
              name: best.name,
              store: best.store,
              price: Number(best.price || 0),
              saving: Math.max(0, Number(second?.price || 0) - Number(best.price || 0))
            };
          })
          .sort((a, b) => b.saving - a.saving)[0];
        comparisonSummary.classList.remove("hidden");
        comparisonSummary.innerHTML = `
          <strong>Quick compare:</strong>
          <span>${escapeAssistantHtml(bestPick.name)} is cheapest at ${escapeAssistantHtml(bestPick.store)} for ${fmt(bestPick.price)}${bestPick.saving ? `, saving ${fmt(bestPick.saving)} versus the next option.` : "."}</span>
        `;
      } else {
        comparisonSummary.classList.add("hidden");
        comparisonSummary.innerHTML = "";
      }
    }
    if (!filtered.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    if (emptyEl) emptyEl.classList.add("hidden");

    const profile = await getProfile();
    const list = Array.isArray(profile.shoppingList) ? profile.shoppingList : [];
    filtered.slice(0, 10).forEach((item) => {
      const added = list.some((entry) => normalise(entry) === normalise(item.name));
      const options = comparisonMap.get(normalise(item.name)) || [item];
      const cheapest = options[0] || item;
      const diff = Number(item.price || 0) - Number(cheapest.price || 0);
      const compareText = options.length > 1
        ? diff <= 0
          ? `Best price nearby`
          : `${fmt(diff)} more than ${cheapest.store}`
        : "No direct comparison nearby";
      const card = document.createElement("div");
      card.className = "shopping-search-card-item";
      card.innerHTML = `
        <div class="shopping-result-main">
          <div class="shopping-result-brand">${item.store}</div>
          <div class="shopping-result-title">${item.name}</div>
          <div class="shopping-result-meta">${fmt(item.price)} • ${item.unit || "each"} • ${Number(item.distanceMiles || 0).toFixed(1)} mi</div>
          <div class="shopping-result-compare ${options.length > 1 ? "" : "neutral"}">${compareText}</div>
        </div>
        <button class="primary-btn shopping-add-result" type="button" ${added ? "disabled" : ""}>${added ? "Added" : "Add"}</button>
      `;
      card.querySelector(".shopping-add-result")?.addEventListener("click", () => addItem(item.name));
      resultsEl.appendChild(card);
    });
  };

  const loadDeals = async () => {
    try {
      const res = await fetch("./assets/data/deal-dash.json");
      const data = await res.json();
      groceryItems = Array.isArray(data) ? data : [];
    } catch {
      groceryItems = [];
    }
    renderResults();
  };

  if (addBtn) addBtn.onclick = () => addItem();
  if (input) {
    input.onkeydown = (e) => {
      if (e.key === "Enter") addItem();
    };
  }
  if (search) search.oninput = () => renderResults();
  if (refreshBtn) refreshBtn.onclick = () => loadDeals();
  if (clearBtn) {
    clearBtn.onclick = async () => {
      await updateProfile({ shoppingList: [] });
      renderList();
      renderResults();
    };
  }

  renderList();
  syncSectionOrder();
  loadDeals();
}

function initPayments() {
  const sendBtn = document.querySelector("#sendMoneyBtn");
  const sendToSelect = document.querySelector("#sendToSelect");
  const sendFromSelect = document.querySelector("#sendFromAccount");
  const amountInput = document.querySelector("#sendAmount");
  const referenceInput = document.querySelector("#sendReference");
  const scanQrBtn = document.querySelector("#scanQrBtn");
  const showMyQrBtn = document.querySelector("#showMyQrBtn");
  const quickAmountBtns = document.querySelectorAll(".amount-quick-picks button");
  let recipients = [];
  const hash = window.location.hash || "";
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const preselectRecipientId = params.get("to") || "";
  const qrImageSrc = "./QR_code_for_mobile_English_Wikipedia.svg";

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

  const chooseRandomRecipient = () => {
    if (!sendToSelect || !recipients.length) return null;
    const pool = recipients.filter((recipient) => String(recipient?.id || "").trim());
    if (!pool.length) return null;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    if (!selected) return null;
    sendToSelect.value = selected.id;
    return selected;
  };

  const openQrModal = (mode = "scan") => {
    if (mode === "show") {
      showContentModal({
        kicker: "QR Payments",
        title: "Your demo QR code",
        subtitle: "Friends could scan this to pay or request money in a real flow.",
        bodyHtml: `
          <div class="content-modal-section">
            <div class="payments-qr-image-shell">
              <img class="payments-qr-image" src="${qrImageSrc}" alt="Example QR code" />
            </div>
            <div class="content-modal-section-copy" style="margin-top:12px;">Account: Main current account<br/>Name: Demo One user</div>
          </div>
        `
      });
      return;
    }

    showContentModal({
      kicker: "QR Payments",
      title: "Scan a QR code",
      subtitle: "Camera preview only in this demo. No real QR code is processed.",
      bodyHtml: `
        <div class="qr-camera-shell">
          <video id="qrDemoVideo" autoplay muted playsinline></video>
          <div id="qrDemoFallback" class="qr-camera-fallback hidden">
            <img class="payments-qr-image scan-preview" src="${qrImageSrc}" alt="QR code scan preview" />
          </div>
        </div>
        <div class="qr-camera-caption">Scanning QR code...</div>
      `,
      actionText: "Close",
      onOpen: (overlay) => {
        const video = overlay.querySelector("#qrDemoVideo");
        const fallback = overlay.querySelector("#qrDemoFallback");
        const scanTimer = window.setTimeout(() => {
          const picked = chooseRandomRecipient();
          closeContentModal();
          if (picked) {
            showTopNotification(`QR code scanned. Recipient set to ${picked.name || "friend"}.`);
          }
        }, 3000);
        const streamPromise = navigator.mediaDevices?.getUserMedia
          ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
          : Promise.reject(new Error("Camera unavailable"));
        overlay._cleanup = () => {
          window.clearTimeout(scanTimer);
          if (video?.srcObject) {
            video.srcObject.getTracks().forEach((track) => track.stop());
            video.srcObject = null;
          }
        };
        streamPromise
          .then((stream) => {
            if (video) video.srcObject = stream;
          })
          .catch(() => {
            if (video) video.classList.add("hidden");
            if (fallback) fallback.classList.remove("hidden");
          });
      }
    });
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
      let createdTx = null;
      if (isFakeRecipient) {
        const recipientName = selectedRecipient?.name || selectedOption?.textContent || "friend";
        createdTx = await recordSimulatedTransfer({
          receiverId,
          receiverName: recipientName,
          amount,
          reference
        });
        showTopNotification.withAction(
          `You paid ${recipientName} ${formatMoney(amount)}.`,
          "Receipt",
          () => go(`/transaction?id=${encodeURIComponent(createdTx?.id || "")}`)
        );
        showConfirmation("Money sent");
        return;
      }
      try {
        createdTx = await transferFunds({ senderId: user.id, receiverId, amount, reference });
        const recipientName = selectedRecipient?.name || selectedOption?.textContent || "friend";
        showTopNotification.withAction(
          `You paid ${recipientName} ${formatMoney(amount)}.`,
          "Receipt",
          () => go(`/transaction?id=${encodeURIComponent(createdTx?.id || "")}`)
        );
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

  if (scanQrBtn) scanQrBtn.onclick = () => openQrModal("scan");
  if (showMyQrBtn) showMyQrBtn.onclick = () => openQrModal("show");

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
  const billPaidBy = document.querySelector("#billPaidBy");
  const billSplitDmHint = document.querySelector("#billSplitDmHint");
  if (sendLink) sendLink.onclick = () => go("/payments");
  if (insightsLink) insightsLink.onclick = () => go("/insights");

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
    if (billPaidBy) billPaidBy.textContent = "Me";
    if (billSplitDmHint) billSplitDmHint.textContent = `If you split this now, each selected friend gets a DM request for their share.`;
    billCard.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="brand-box" style="background:#fff3e1;border:none;">${selectedTx.icon}</div>
        <div>
          <div><strong>£${selectedTx.amount.toFixed(2)}</strong> <span style="margin-left:6px;">Paid by me at ${selectedTx.merchant}</span></div>
          <div style="font-size:12px;color:#436254;">${selectedFriends.size + 1} people • ${selectedTx.time} • ${selectedTx.date}</div>
          <div class="bill-paid-pill" style="margin-top:8px;">Paid by Me</div>
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
        Me
      </div>
      <div>Paid <strong>£${selectedTx.amount.toFixed(2)}</strong></div>
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

  const pushSplitIntoDMs = async (friends) => {
    if (!selectedTx || !selectedFriends.size) return;
    const profile = await getProfile();
    let threads = {};
    let unread = {};
    try {
      threads = JSON.parse(localStorage.getItem(STORAGE_KEYS.dmThreads) || "null") || profile.dmThreads || {};
    } catch {
      threads = profile.dmThreads || {};
    }
    try {
      unread = JSON.parse(localStorage.getItem(STORAGE_KEYS.dmUnread) || "null") || profile.dmUnread || {};
    } catch {
      unread = profile.dmUnread || {};
    }
    const totalPeople = selectedFriends.size + 1;
    const per = totalPeople ? Number(selectedTx.amount || 0) / totalPeople : 0;
    const selected = friends.filter((f) => selectedFriends.has(f.id));
    selected.forEach((friend) => {
      if (!threads[friend.id]) threads[friend.id] = [];
      threads[friend.id].push({
        id: `dm_split_${Date.now()}_${friend.id}`,
        createdAt: new Date().toISOString(),
        type: "request",
        direction: "out",
        amount: Number(per.toFixed(2)),
        text: `Split bill for ${selectedTx.merchant}. I paid, so you owe ${formatMoney(per)}.`
      });
    });
    localStorage.setItem(STORAGE_KEYS.dmThreads, JSON.stringify(threads));
    localStorage.setItem(STORAGE_KEYS.dmUnread, JSON.stringify(unread));
    await updateProfile({ dmThreads: threads, dmUnread: unread });
    const firstFriend = selected[0];
    showTopNotification.withAction(
      `Split requests sent to ${selected.length} friend${selected.length === 1 ? "" : "s"} in DMs.`,
      "Open",
      () => go(`/dms?friend=${encodeURIComponent(firstFriend?.id || "")}`)
    );
    showTopNotification(`Split requests sent to ${selected.length} friend${selected.length === 1 ? "" : "s"} in DMs.`);
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

    if (splitBtn) {
      splitBtn.onclick = async () => {
        if (!selectedTx || selectedFriends.size === 0) {
          showActionModal({
            title: "Select people first",
            message: "Choose a transaction and at least one friend to split the bill."
          });
          return;
        }
        await pushSplitIntoDMs(friends);
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
  const receiptBtn = document.querySelector("#txReceiptBtn");

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

  const openReceipt = async (tx, userId = null) => {
    const isIncome = tx && (tx.to_user === userId || tx.to_user === "local_user");
    const otherPartyId = isIncome ? tx?.from_user : tx?.to_user;
    const otherPartyName = tx?.counterpartyName
      || (await fetchUserById(otherPartyId))?.name
      || (isIncome ? "Incoming payment" : "Outgoing payment");
    showContentModal({
      kicker: "Payment Receipt",
      title: tx?.reference || (isIncome ? "Incoming transfer" : "Transfer sent"),
      subtitle: `Transaction reference ${tx?.id || "demo-transfer"}`,
      bodyHtml: `
        <div class="receipt-summary">
          <div class="content-modal-kicker">${isIncome ? "Received" : "Sent"}</div>
          <div class="receipt-summary-amount">${formatMoney(tx?.amount || fallback.amount)}</div>
        </div>
        <div class="receipt-grid">
          <div class="receipt-row"><span>${isIncome ? "From" : "To"}</span><strong>${escapeAssistantHtml(otherPartyName)}</strong></div>
          <div class="receipt-row"><span>Date</span><strong>${escapeAssistantHtml(formatDateTime(tx?.created_at))}</strong></div>
          <div class="receipt-row"><span>Status</span><strong>Completed</strong></div>
          <div class="receipt-row"><span>Reference</span><strong>${escapeAssistantHtml(tx?.reference || "Transfer")}</strong></div>
        </div>
      `
    });
  };

  const renderTx = (tx, userId = null) => {
    const isIncome = tx && (tx.to_user === userId || tx.to_user === "local_user");
    if (icon) icon.textContent = isIncome ? "⬇️" : "⬆️";
    if (merchant) merchant.textContent = tx.reference || (isIncome ? "Incoming transfer" : "Sent transfer");
    if (meta) {
      const date = tx.created_at ? formatDateTime(tx.created_at) : `${fallback.date} • ${fallback.time}`;
      meta.textContent = date;
    }
    if (amount) amount.textContent = `£${Number(tx.amount || fallback.amount).toFixed(2)}`;
    if (location) location.textContent = "Oxford Road, Manchester";
    if (status) status.textContent = "Completed";
    if (category) category.textContent = "Transfer";
    if (card) card.textContent = "Lloyds Debit";
    if (receiptBtn) {
      receiptBtn.onclick = () => openReceipt(tx, userId);
    }
  };

  findTransactionById(id).then(async (tx) => {
    if (tx) {
      const user = await getSupabaseUser();
      renderTx(tx, user?.id || null);
      return;
    }
    renderTx(fallback);
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
  const note = document.querySelector("#addPotLimitNote");
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
    updateLimitNote();
  };

  const updateLimitNote = async () => {
    if (!note || !select) return;
    const pots = await getBudgetPots();
    const pot = pots.find((p) => p.id === select.value);
    if (!pot) {
      note.textContent = "";
      return;
    }
    const goal = Number(pot.goal) || 0;
    const balance = Number(pot.balance) || 0;
    if (goal > 0) {
      note.textContent = `${pot.name} can take up to ${formatMoney(Math.max(0, goal - balance))} more before it reaches its goal.`;
      return;
    }
    note.textContent = `${pot.name} has no goal cap set yet.`;
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
      const goal = Number(pot.goal) || 0;
      if (goal > 0 && prevBalance + amount > goal) {
        showActionModal({
          title: "Goal limit reached",
          message: `${pot.name} has a target of ${formatMoney(goal)}. You can only add up to ${formatMoney(Math.max(0, goal - prevBalance))} right now.`
        });
        return;
      }
      pot.balance = Number(pot.balance) + amount;
      await setBudgetPots(pots);
      await applySimulatedBalanceAdjustment(-amount);
      if (goal > 0 && prevBalance < goal && Number(pot.balance) >= goal) {
        showTopNotification(`${pot.emoji || "Pot"} ${pot.name} goal completed`);
      }
      showConfirmation("Money added");
    };
  }

  if (select) select.onchange = () => { updateLimitNote(); };

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
  const wrappedBtn = document.querySelector("#openSpendingWrapped");

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
  if (wrappedBtn) wrappedBtn.onclick = () => go("/spending-wrapped");

  const storedPeriod = localStorage.getItem(STORAGE_KEYS.insightsActivePeriod) || "week";
  const initialBtn = [...periodBtns].find((btn) => btn.dataset.period === storedPeriod);
  if (initialBtn) {
    periodBtns.forEach((b) => b.classList.toggle("active", b === initialBtn));
  }
  await render(initialBtn?.dataset.period || "week");
}

const WRAPPED_CATEGORY_META = [
  { name: "Bills", color: "#4ad6a1", keywords: ["rent", "bill", "electric", "water", "subscription", "netflix", "spotify"] },
  { name: "Groceries", color: "#7c5cff", keywords: ["tesco", "aldi", "sainsbury", "lidl", "waitrose", "morrisons", "coop", "milk", "bread", "pasta", "grocery"] },
  { name: "Transport", color: "#2dd4bf", keywords: ["uber", "bus", "train", "fuel", "tube", "taxi"] },
  { name: "Eating Out", color: "#ff7f50", keywords: ["coffee", "cafe", "restaurant", "takeaway", "deliveroo", "ubereats", "itsu", "gusto"] },
  { name: "Shopping", color: "#ff4db8", keywords: ["amazon", "asos", "nike", "shop", "urban", "currys", "apple"] },
  { name: "Leisure", color: "#ffd166", keywords: ["cinema", "gym", "game", "steam", "concert", "music", "vue", "cineworld"] },
  { name: "Transfers", color: "#67e8f9", keywords: ["transfer", "send", "request", "friend"] },
  { name: "Other", color: "#b7f0d7", keywords: [] }
];

function classifyWrappedCategory(text = "") {
  const lower = String(text || "").toLowerCase();
  const match = WRAPPED_CATEGORY_META.find((cat) => (cat.keywords || []).some((kw) => lower.includes(String(kw).toLowerCase())));
  return match?.name || "Other";
}

function getWrappedCategoryMeta(name = "Other") {
  return WRAPPED_CATEGORY_META.find((cat) => cat.name === name) || WRAPPED_CATEGORY_META[WRAPPED_CATEGORY_META.length - 1];
}

function spendingPersonaFor(category, amount, topLabel) {
  const personas = {
    Transfers: [
      { title: "Group Piggy Bank", body: `You sent ${formatMoney(amount)} around this month, so you are basically the one everyone trusts to cover it now and settle it later.` },
      { title: "Friendship Treasurer", body: `Your top spend was moving money to other people. You are running social logistics whether you asked to or not.` }
    ],
    Groceries: [
      { title: "Campus Cart Commander", body: `${topLabel} kept showing up, which means you know exactly how to keep the fridge alive without losing the month.` },
      { title: "Snack Quartermaster", body: `Your money kept heading toward groceries, which is the clearest sign that you are the survival planner of the group.` }
    ],
    "Eating Out": [
      { title: "Table Booker", body: `You spent most on meals and coffee runs. You are the person who says "let's just grab something" and everyone follows.` },
      { title: "Latte Operations Lead", body: `${topLabel} featured heavily, so your month reads like one long series of food-fuel decisions.` }
    ],
    Shopping: [
      { title: "Parcel Magnet", body: `Your month tilted toward shopping, which means your door probably knows the delivery drivers by name.` },
      { title: "Checkout Specialist", body: `You spent the most on shopping, so your impulse control and your saved cards are clearly in constant negotiation.` }
    ],
    Transport: [
      { title: "Last-Minute Sprinter", body: `Transport topped your month. You are either everywhere all the time or making a heroic number of late recoveries.` },
      { title: "Route Optimiser", body: `Your spending says movement mattered. Trains, taxis or buses, you kept the month in motion.` }
    ],
    Leisure: [
      { title: "Main Character Weekender", body: `Leisure came out on top, so your bank statement reads like somebody who refuses to let the month be boring.` },
      { title: "Vibe Curator", body: `${topLabel} helped define the month. Your spending says the plan matters, but the atmosphere matters more.` }
    ],
    Bills: [
      { title: "Standing Order Survivor", body: `Bills led your month, which means you spent a lot of time being responsible without getting any applause for it.` },
      { title: "Direct Debit Defender", body: `You kept the essentials moving first. Not glamorous, but very hard to beat.` }
    ],
    Other: [
      { title: "Wildcard Spender", body: `Your month was spread across a mix of categories, which makes you hard to stereotype and slightly dangerous to predict.` },
      { title: "Chaos Coordinator", body: `Your top category was not dominant, so the month looks like a fast-moving mix of necessary and random decisions.` }
    ]
  };
  const pool = personas[category] || personas.Other;
  const idx = Math.abs(Math.round(amount)) % pool.length;
  return pool[idx];
}

async function buildMonthlyWrappedSummary() {
  const profile = await getProfile();
  const name = (profile.name || "there").split(" ")[0];
  const interestFallbacks = (Array.isArray(profile.interests) && profile.interests.length
    ? profile.interests
    : (localStorage.getItem(STORAGE_KEYS.interests) || "").split(",").filter(Boolean));
  const buildExampleSummary = () => {
    const prefersFood = interestFallbacks.includes("food") || interestFallbacks.includes("coffee");
    const prefersStyle = interestFallbacks.includes("clothing");
    const topCategoryName = prefersFood ? "Groceries" : (prefersStyle ? "Shopping" : "Leisure");
    const merchant = prefersFood ? "Tesco Express" : (prefersStyle ? "ASOS" : "Coffee run");
    const exampleTopThree = [
      { name: topCategoryName, amount: 124, pct: 44, color: getWrappedCategoryMeta(topCategoryName).color },
      { name: "Transfers", amount: 86, pct: 31, color: getWrappedCategoryMeta("Transfers").color },
      { name: "Eating Out", amount: 72, pct: 25, color: getWrappedCategoryMeta("Eating Out").color }
    ];
    return {
      name,
      total: 282,
      count: 11,
      topCategory: exampleTopThree[0],
      topLabel: exampleTopThree[0].name,
      topDescription: merchant,
      activeDay: "Friday",
      topThree: exampleTopThree,
      persona: spendingPersonaFor(exampleTopThree[0].name, exampleTopThree[0].amount, merchant),
      transfersAmount: 86,
      topMerchant: merchant,
      topMerchantAmount: 64,
      topMerchantCount: 3,
      evidence: [
        `${merchant} appeared 3 times in your recent outgoing activity.`,
        `${exampleTopThree[0].name} accounted for ${formatMoney(exampleTopThree[0].amount)} in this example month.`,
        "Friday was your heaviest spending day in this example month."
      ]
    };
  };
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  cutoff.setHours(0, 0, 0, 0);

  const real = await (async () => {
    try {
      const user = await ensureRemoteUserProfile(profile);
      if (!user) return [];
      const txs = await fetchTransactions(user.id, 250);
      return (txs || []).map((tx) => {
        const when = tx.created_at ? new Date(tx.created_at) : new Date();
        const isExpense = tx.from_user === user.id;
        return {
          amount: Math.abs(Number(tx.amount) || 0),
          date: when,
          kind: isExpense ? "expense" : "income",
          description: tx.counterpartyName || tx.reference || "Transfer",
          raw: tx.reference || "",
          source: "real"
        };
      });
    } catch {
      return [];
    }
  })();

  const ledger = await getSimulatedLedger();
  const simulated = (ledger.transactions || []).map((tx) => {
    const when = tx.created_at ? new Date(tx.created_at) : new Date();
    const isExpense = tx.from_user === "local_user";
    return {
      amount: Math.abs(Number(tx.amount) || 0),
      date: when,
      kind: isExpense ? "expense" : "income",
      description: tx.counterpartyName || tx.reference || "Transfer",
      raw: tx.reference || "",
      source: "simulated"
    };
  });

  const monthlyExpenses = [...real, ...simulated]
    .filter((tx) => tx.kind === "expense" && tx.date instanceof Date && !Number.isNaN(tx.date.getTime()) && tx.date >= cutoff && tx.amount > 0)
    .map((tx) => ({
      ...tx,
      category: classifyWrappedCategory(`${tx.description} ${tx.raw}`)
    }));

  if (!monthlyExpenses.length) {
    return buildExampleSummary();
  }

  const total = monthlyExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  const categoryTotals = new Map();
  const descTotals = new Map();
  const descCounts = new Map();
  const dailyTotals = new Map();
  monthlyExpenses.forEach((tx) => {
    categoryTotals.set(tx.category, (categoryTotals.get(tx.category) || 0) + tx.amount);
    descTotals.set(tx.description, (descTotals.get(tx.description) || 0) + tx.amount);
    descCounts.set(tx.description, (descCounts.get(tx.description) || 0) + 1);
    const dayKey = tx.date.toLocaleDateString("en-GB", { weekday: "long" });
    dailyTotals.set(dayKey, (dailyTotals.get(dayKey) || 0) + tx.amount);
  });

  const topThree = [...categoryTotals.entries()]
    .map(([cat, amount]) => ({ name: cat, amount, color: getWrappedCategoryMeta(cat).color }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((entry) => ({ ...entry, pct: total ? Math.round((entry.amount / total) * 100) : 0 }));

  const topCategory = topThree[0] || { name: "Other", amount: total, pct: 100, color: getWrappedCategoryMeta("Other").color };
  const topDescription = [...descTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || topCategory.name;
  const topMerchantEntry = [...descTotals.entries()].sort((a, b) => b[1] - a[1])[0] || [topDescription, 0];
  const activeDay = [...dailyTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Sunday";
  const transfersAmount = categoryTotals.get("Transfers") || 0;
  const topMerchant = topMerchantEntry[0];
  const topMerchantAmount = topMerchantEntry[1];
  const topMerchantCount = descCounts.get(topMerchant) || 0;
  const evidence = [
    `${topMerchant} appeared ${topMerchantCount} time${topMerchantCount === 1 ? "" : "s"} in your outgoing transactions.`,
    `${topCategory.name} accounted for ${formatMoney(topCategory.amount)} in the last 30 days.`,
    `${activeDay} was your heaviest spending day.`
  ];

  if (!topThree.length || !topMerchant || !topMerchantAmount) {
    return buildExampleSummary();
  }

  return {
    name,
    total,
    count: monthlyExpenses.length,
    topCategory,
    topLabel: topCategory.name,
    topDescription,
    activeDay,
    topThree,
    persona: spendingPersonaFor(topCategory.name, topCategory.amount, topDescription),
    transfersAmount,
    topMerchant,
    topMerchantAmount,
    topMerchantCount,
    evidence
  };
}

async function initSpendingWrapped() {
  const stage = document.querySelector("#wrappedStage");
  const progress = document.querySelector("#wrappedProgress");
  const page = document.querySelector(".wrapped-page");
  if (!stage || !progress || !page) return;

  const summary = await buildMonthlyWrappedSummary();
  const slides = [
    {
      theme: "theme-burst",
      eyebrow: "One Wrapped",
      title: `${summary.name}'s last 30 days`,
      copy: `You spent ${formatMoney(summary.total)} across ${summary.count} outgoing payments, purchases and transfers this month.`,
      accent: summary.topCategory.color,
      kicker: "Tap and hold to pause",
      evidence: [
        `${summary.count} outgoing transactions were counted in this recap.`,
        `Top category so far: ${summary.topCategory.name}.`
      ]
    },
    {
      theme: "theme-iris",
      eyebrow: "Top category",
      title: `${summary.topCategory.name} took the crown`,
      copy: `${formatMoney(summary.topCategory.amount)} landed here, which is ${summary.topCategory.pct}% of everything you spent.`,
      accent: summary.topCategory.color,
      kicker: "Largest share of spend",
      evidence: [
        summary.evidence[1],
        `${summary.topMerchant} was your biggest repeated line item by value.`
      ]
    },
    {
      theme: "theme-sunset",
      eyebrow: "Most repeated spend",
      title: summary.topMerchant,
      copy: `${formatMoney(summary.topMerchantAmount)} went through this line, and it appeared ${summary.topMerchantCount} time${summary.topMerchantCount === 1 ? "" : "s"} in the last 30 days.`,
      accent: "#ff8a65",
      kicker: "The statement headline",
      evidence: [
        summary.evidence[0],
        summary.evidence[2]
      ]
    },
    {
      theme: "theme-lime",
      eyebrow: "Spending personality",
      title: summary.persona.title,
      copy: summary.persona.body,
      accent: "#c7f464",
      kicker: "Highly scientific, obviously",
      evidence: [
        `${summary.topCategory.name} led your month by amount.`,
        `${summary.topMerchant} helped shape that pattern.`
      ]
    },
    {
      theme: "theme-candy",
      eyebrow: "Top three",
      title: "Your month in three lanes",
      copy: "",
      accent: "#8c7bff",
      kicker: summary.topThree.length ? summary.topThree.map((item) => `${item.name} ${item.pct}%`).join(" • ") : "No category data yet",
      stats: summary.topThree
    },
    {
      theme: "theme-night",
      eyebrow: "Bonus stat",
      title: summary.transfersAmount > 0 ? "You kept the group moving" : "You kept it personal",
      copy: summary.transfersAmount > 0
        ? `${formatMoney(summary.transfersAmount)} went to friends and shared plans. That is serious social finance energy.`
        : "Most of the month stayed focused on you and your own spending rhythm.",
      accent: "#67e8f9",
      kicker: "Replay any time from Home or Insights",
      evidence: summary.transfersAmount > 0
        ? [
            `${formatMoney(summary.transfersAmount)} of your spending was classified as transfers.`,
            `${summary.topMerchant} still remained your single biggest repeated line item.`
          ]
        : [
            `${summary.topCategory.name} was still the clearest spend pattern.`,
            `${summary.count} payments and purchases shaped this month.`
          ]
    }
  ];

  progress.innerHTML = slides.map((_, index) => `<span class="wrapped-progress-segment${index === 0 ? " active" : ""}"></span>`).join("");
  stage.innerHTML = slides.map((slide, index) => `
    <section class="wrapped-slide ${slide.theme}${index === 0 ? " active" : ""}" style="--wrapped-accent:${slide.accent};">
      <div class="wrapped-orb wrapped-orb-a"></div>
      <div class="wrapped-orb wrapped-orb-b"></div>
      <div class="wrapped-slide-inner">
        <div class="wrapped-eyebrow">${slide.eyebrow}</div>
        <h1 class="wrapped-title">${slide.title}</h1>
        <p class="wrapped-copy">${slide.copy}</p>
        ${Array.isArray(slide.stats) && slide.stats.length ? `
          <div class="wrapped-stat-list">
            ${slide.stats.map((item) => `
              <div class="wrapped-stat-pill">
                <span class="wrapped-stat-name">${item.name}</span>
                <strong>${item.pct}%</strong>
              </div>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(slide.evidence) && slide.evidence.length ? `
          <div class="wrapped-evidence-list">
            ${slide.evidence.map((line) => `<div class="wrapped-evidence-pill">${line}</div>`).join("")}
          </div>
        ` : ""}
        <div class="wrapped-kicker">${slide.kicker}</div>
      </div>
    </section>
  `).join("");

  const slideEls = Array.from(stage.querySelectorAll(".wrapped-slide"));
  const progressEls = Array.from(progress.querySelectorAll(".wrapped-progress-segment"));
  let current = 0;
  let timer = null;
  let paused = false;
  const duration = 3400;

  const render = () => {
    slideEls.forEach((slide, index) => {
      slide.classList.toggle("active", index === current);
      slide.classList.toggle("prev", index < current);
    });
    progressEls.forEach((segment, index) => {
      segment.classList.toggle("active", index === current);
      segment.classList.toggle("done", index < current);
      segment.style.setProperty("--wrapped-progress-duration", `${duration}ms`);
      segment.style.animationPlayState = paused ? "paused" : "running";
    });
  };

  const schedule = () => {
    clearTimeout(timer);
    if (paused) return;
    timer = setTimeout(() => {
      current = (current + 1) % slideEls.length;
      render();
      schedule();
    }, duration);
  };

  const setPaused = (nextPaused) => {
    paused = nextPaused;
    page.classList.toggle("paused", paused);
    progressEls.forEach((segment) => {
      segment.style.animationPlayState = paused ? "paused" : "running";
    });
    if (paused) clearTimeout(timer);
    else schedule();
  };

  ["pointerdown"].forEach((eventName) => {
    page.addEventListener(eventName, () => setPaused(true));
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
    page.addEventListener(eventName, () => setPaused(false));
  });

  render();
  schedule();
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

function initDealNest() {
  const search = document.querySelector("#dealSearch");
  const chips = document.querySelectorAll("[data-sort]");
  const label = document.querySelector("#dealSortLabel");
  const results = document.querySelector("#dealResults");
  const empty = document.querySelector("#dealEmpty");
  const loading = document.querySelector("#dealLoading");
  const featured = document.querySelector("#dealFeatured");
  const interestWrap = document.querySelector("#dealInterestChips");
  const heroCopy = document.querySelector("#dealHeroCopy");
  const featuredCount = document.querySelector("#dealFeaturedCount");
  const totalCount = document.querySelector("#dealTotalCount");
  let allItems = [];
  let activeSort = "Featured";
  let searchTimer = null;
  let loadingTimer = null;
  let lastRenderCount = 6;

  if (!chips.length) return;

  const tagMap = {
    films: "Entertainment",
    music: "Entertainment",
    days: "Travel",
    food: "Food",
    clothing: "Fashion",
    coffee: "Food",
    concerts: "Entertainment",
    tech: "Tech",
    gaming: "Tech",
    travel: "Travel"
  };

  const renderFeatured = (items) => {
    if (!featured) return;
    featured.innerHTML = "";
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "student-featured-card";
      card.style.setProperty("--deal-accent", item.accent || "#0f9b53");
      card.innerHTML = `
        <div class="student-featured-top">
          <div class="student-featured-brand">${item.brand}</div>
          <div class="student-featured-pill">${item.discount}</div>
        </div>
        <div class="student-featured-title">${item.title}</div>
        <div class="student-featured-summary">${item.summary}</div>
        <div class="student-featured-foot">
          <span>${item.category}</span>
          <span>${item.expires}</span>
        </div>
      `;
      featured.appendChild(card);
    });
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
      card.className = "deal-card student-deal-card";
      card.style.setProperty("--deal-accent", item.accent || "#0f9b53");
      card.innerHTML = `
        <div class="deal-brand student-deal-brand">
          <div class="brand-box">${(item.brand || "S").slice(0, 1)}</div>
          <div>
            <div>${item.title}</div>
            <div style="font-weight:800;">${item.discount}</div>
            <div class="muted" style="font-size:12px;">${item.brand}</div>
          </div>
        </div>
        <div class="deal-meta">
          <span>${item.category}</span>
          <span class="deal-code-chip">Code: ${item.code}</span>
        </div>
        <div class="student-deal-summary">${item.summary}</div>
        <div class="student-deal-footer">
          <span>${item.expires}</span>
          <button class="action-btn" type="button">Copy code</button>
        </div>
      `;
      card.querySelector(".action-btn")?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(item.code || "");
          showToast(`Code copied: ${item.code}`, { actionText: "Open", onAction: () => go("/deal-dash") });
        } catch {
          showToast(`Use code ${item.code}`);
        }
      });
      results.appendChild(card);
    });
    lastRenderCount = items.length || lastRenderCount;
  };

  const filterAndSort = () => {
    const term = search?.value.trim().toLowerCase() || "";
    let filtered = allItems.filter((item) => {
      if (!term) return true;
      return [item.title, item.brand, item.category, item.summary, ...(item.interestTags || [])].some((field) =>
        String(field || "").toLowerCase().includes(term)
      );
    });

    if (activeSort !== "Featured") {
      filtered = filtered.filter((item) => item.category === activeSort);
    }

    filtered = filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    render(filtered);
  };

  const personalise = async () => {
    const profile = await getProfile();
    const interests = Array.isArray(profile.interests) && profile.interests.length
      ? profile.interests
      : (localStorage.getItem(STORAGE_KEYS.interests) || "").split(",").filter(Boolean);
    if (interestWrap) {
      interestWrap.innerHTML = interests.map((interest) => `<span class="student-interest-chip">${interest}</span>`).join("");
    }
    if (heroCopy) {
      heroCopy.textContent = interests.length
        ? `Featured discounts tailored to ${interests.slice(0, 3).join(", ")}.`
        : "Popular student discounts across food, fashion, travel and tech.";
    }

    const interestCategories = new Set(interests.map((interest) => tagMap[interest]).filter(Boolean));
    const featuredItems = allItems
      .filter((item) => (item.interestTags || []).some((tag) => interests.includes(tag)) || interestCategories.has(item.category))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 6);

    renderFeatured(featuredItems.length ? featuredItems : allItems.slice(0, 6));
    if (featuredCount) featuredCount.textContent = `${featuredItems.length || Math.min(6, allItems.length)}`;
    if (totalCount) totalCount.textContent = `${allItems.length}`;
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
    }, 220);
  };

  chips.forEach((chip) => {
    chip.onclick = () => {
      chips.forEach((c) => c.classList.toggle("active", c === chip));
      activeSort = chip.dataset.sort || "Featured";
      if (label) label.textContent = activeSort;
      showSearchLoading(filterAndSort);
    };
  });

  if (search) {
    search.oninput = () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        showSearchLoading(filterAndSort);
      }, 180);
    };
  }

  const loadStart = Date.now();
  const minDelay = 420;
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
  fetch("./assets/data/student-deals.json")
    .then((res) => res.json())
    .then(async (data) => {
      allItems = Array.isArray(data) ? data : [];
      lastRenderCount = allItems.length || lastRenderCount;
      await personalise();
      filterAndSort();
      const wait = Math.max(0, minDelay - (Date.now() - loadStart));
      if (loading) setTimeout(() => loading.classList.add("hidden"), wait);
    })
    .catch(async () => {
      allItems = [];
      await personalise();
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
          const avatarLetter = String(f.name || "?").trim().charAt(0).toUpperCase() || "?";
          info.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="avatar-circle">${avatarLetter}</div>
              <div>
                <strong>${f.name}</strong>
                <div class="muted" style="font-size:12px;">@${String((f.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "")) || "friend"}</div>
              </div>
            </div>
          `;
          const unreadCount = Math.max(0, Number(dmUnread[f.id] || 0));
          if (unreadCount > 0) {
            const unread = document.createElement("span");
            unread.className = "friend-unread";
            unread.textContent = `New message ${unreadCount > 1 ? `(${unreadCount})` : ""}`;
            info.appendChild(unread);
          }
          info.style.cursor = "pointer";
          info.onclick = () => go(`/friend-profile?id=${encodeURIComponent(f.id)}`);

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
      const avatarLetter = String(person.name || "?").trim().charAt(0).toUpperCase() || "?";
      name.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="avatar-circle">${avatarLetter}</div>
          <div>
            <strong>${person.name}</strong>
            <div class="muted" style="font-size:12px;">@${String((person.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "")) || "friend"}</div>
          </div>
        </div>
      `;
      name.style.cursor = "pointer";
      name.onclick = () => go(`/friend-profile?id=${encodeURIComponent(person.id)}`);
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
      const friend = friendById(friendId);
      const incomingText = message?.type === "payment"
        ? `${friend?.name || "A friend"} sent you ${formatMoney(message.amount || 0)}.`
        : `New message from ${friend?.name || "a friend"}.`;
      if (message?.type === "payment") {
        showTopNotification.withAction(
          incomingText,
          "Open",
          () => go(`/dms?friend=${encodeURIComponent(friendId)}`)
        );
      } else if (!isOpenThread || !isVisible) {
        unreadByFriend[friendId] = Math.max(0, Number(unreadByFriend[friendId] || 0)) + 1;
        showTopNotification.withAction(
          incomingText,
          "Open",
          () => go(`/dms?friend=${encodeURIComponent(friendId)}`)
        );
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
        await recordSimulatedIncomingTransfer({
          senderId: friend.id,
          senderName: friend.name || "friend",
          amount: 10,
          reference: `DM from ${friend.name || "friend"}`
        });
        await appendMessage(friend.id, {
          type: "payment",
          direction: "in",
          amount: 10,
          text: `Sent ${formatMoney(10)}`
        });
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
    showTopNotification.withAction(
      `You paid ${friend.name || "friend"} ${formatMoney(amount)}.`,
      "Open",
      () => go(`/dms?friend=${encodeURIComponent(friend.id)}`)
    );
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

async function initFriendProfile() {
  const params = getHashParams();
  const friendId = params.get("id") || "";
  const nameEl = document.querySelector("#friendProfileName");
  const handleEl = document.querySelector("#friendProfileHandle");
  const avatarEl = document.querySelector("#friendProfileAvatar");
  const accountNameEl = document.querySelector("#friendProfileAccountName");
  const sortCodeEl = document.querySelector("#friendProfileSortCode");
  const accountNoEl = document.querySelector("#friendProfileAccountNumber");
  const referenceEl = document.querySelector("#friendProfileReference");
  const sendBtn = document.querySelector("#friendProfileSendBtn");
  const msgBtn = document.querySelector("#friendProfileMessageBtn");

  const profile = await getProfile();
  const localFriends = Array.isArray(profile.friends) ? profile.friends : [];
  const local = localFriends.find((f) => String(f.id) === String(friendId));
  const remote = friendId ? await fetchUserById(friendId) : null;
  const displayName = local?.name || remote?.name || "Friend";
  const handle = `@${String(displayName || "").toLowerCase().replace(/[^a-z0-9]+/g, "") || "friend"}`;
  const initial = String(displayName || "?").trim().charAt(0).toUpperCase() || "?";

  const seed = [...String(friendId || displayName)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const sortA = String((seed % 70) + 10).padStart(2, "0");
  const sortB = String((Math.floor(seed / 7) % 70) + 10).padStart(2, "0");
  const sortC = String((Math.floor(seed / 13) % 70) + 10).padStart(2, "0");
  const accountLast = String(seed % 10000).padStart(4, "0");

  if (nameEl) nameEl.textContent = displayName;
  if (handleEl) handleEl.textContent = handle;
  if (avatarEl) avatarEl.textContent = initial;
  if (accountNameEl) accountNameEl.textContent = displayName;
  if (sortCodeEl) sortCodeEl.textContent = `${sortA}-${sortB}-${sortC}`;
  if (accountNoEl) accountNoEl.textContent = `•••• ${accountLast}`;
  if (referenceEl) referenceEl.textContent = `Pay ${displayName.split(" ")[0] || "friend"}`;

  if (sendBtn) sendBtn.onclick = () => go(`/payments?to=${encodeURIComponent(friendId)}`);
  if (msgBtn) msgBtn.onclick = () => go(`/dms?friend=${encodeURIComponent(friendId)}`);
}

function initMoneyMinutes() {
  const quizBtn = document.querySelector("#moneyMinutesQuizBtn");
  const reels = document.querySelectorAll(".reel-card");
  if (quizBtn) quizBtn.onclick = () => go("/quiz-questions?mode=all&module=all");
  reels.forEach((reel) => {
    const video = reel.querySelector("video");
    const btn = reel.querySelector(".reel-sound");
    if (!video || !btn) return;

    const updateIcon = () => {
      const icon = btn.querySelector(".reel-action-icon");
      if (icon) {
        icon.textContent = video.muted ? "🔇" : "🔊";
        return;
      }
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

const QUIZ_VIDEO_PLACEHOLDER = "./Video-17.mp4";

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

function buildAllQuizQuestions() {
  return Object.entries(QUIZ_BANK).flatMap(([quizId, quiz]) =>
    (quiz.questions || []).map((question, questionIndex) => ({
      ...question,
      quizId,
      quizTitle: quiz.title,
      questionIndex
    }))
  );
}

function buildMoneyMinutesExplainPayload(lesson) {
  const title = lesson?.title || "This Money Minutes reel";
  const bullets = [
    lesson?.desc || "This reel highlights a practical money habit you can use straight away.",
    lesson?.sub || "The goal is to make one concept clearer, not overload the user.",
    "Apply one small change after watching so the lesson turns into action."
  ].filter(Boolean);
  return {
    title: `${title} explained`,
    body: "Here is the concise version of the key idea behind this reel.",
    bullets,
    actions: [
      { label: "Watch Money Minutes", route: "/learn" },
      { label: "Open practice investing", route: "/practice-investing" }
    ]
  };
}

function initLearn() {
  const feed = document.querySelector("#learnReelsFeed");
  if (!feed) return;
  const quizBtn = document.querySelector("#moneyMinutesQuizBtn");
  if (quizBtn) quizBtn.onclick = () => go("/quiz-questions?mode=all&module=all");

  getProfile().then((profile) => {
    const moduleSet = modulesForCompetency(profile.financeCompetency);
    const completed = Array.isArray(profile.quizCompleted) ? profile.quizCompleted : [];
    const pct = moduleSet.length
      ? Math.round((completed.filter((id) => moduleSet.some((mod) => mod.quizzes.includes(id))).length / moduleSet.reduce((sum, mod) => sum + mod.quizzes.length, 0)) * 100) || 0
      : 0;
    const userName = profile.displayName || profile.fullName || profile.name || "You";
    const confidenceLabelMap = {
      beginner: "Beginner track",
      comfortable: "Comfortable track",
      confident: "Confident track",
      expert: "Expert track"
    };
    const videoSources = [
      { src: "./Video-17.mp4", type: "video/mp4" },
      { src: "./Video-494 (1).mp4", type: "video/mp4" },
      { src: "./Video-737.mp4", type: "video/mp4" }
    ];
    const lessonPrompts = [
      "Break your main balance into clear buckets before the week starts.",
      "Use recent transactions to spot the spending pattern to fix first.",
      "Keep a cash buffer so routine bills do not break the plan.",
      "Move goal money early so your current balance stays honest.",
      "Review subscriptions and recurring spends before adding new goals.",
      "Use confidence-based modules to level up one step at a time."
    ];
    const placeholderThemes = [
      "Budget reset",
      "Savings habit",
      "Spending review",
      "Pot strategy",
      "Confidence boost",
      "Credit check"
    ];
    const quizQueue = moduleSet
      .flatMap((mod) => mod.quizzes.map((qid) => ({ module: mod, quizId: qid, quiz: QUIZ_BANK[qid] })))
      .filter((item) => item.quiz);
    const lessonReels = [];

    for (let i = 0; i < 12; i += 1) {
      const mod = moduleSet[i % Math.max(moduleSet.length, 1)] || LEARN_MODULES[0];
      const useVideo = i < 3;
      const video = videoSources[i % videoSources.length];
      const theme = placeholderThemes[i % placeholderThemes.length];
      lessonReels.push({
        id: `learn-${mod.id}-${i}`,
        brand: i < 3
          ? `${confidenceLabelMap[profile.financeCompetency] || "Learning track"}`
          : `${mod.difficulty} module`,
        title: i < 3
          ? mod.title
          : `${mod.title}: ${theme}`,
        desc: mod.desc || lessonPrompts[i % lessonPrompts.length],
        sub: i === 0
          ? `${userName}'s recommended starting point`
          : i === 1
            ? `${pct}% complete across your track`
            : i === 2
              ? `Streak: ${profile.learningStreak || 0} days`
              : lessonPrompts[i % lessonPrompts.length],
        explainPayload: buildMoneyMinutesExplainPayload({
          title: i < 3 ? mod.title : `${mod.title}: ${theme}`,
          desc: mod.desc || lessonPrompts[i % lessonPrompts.length],
          sub: i === 0
            ? `${userName}'s recommended starting point`
            : i === 1
              ? `${pct}% complete across your track`
              : i === 2
                ? `Streak: ${profile.learningStreak || 0} days`
                : lessonPrompts[i % lessonPrompts.length]
        }),
        hasVideo: useVideo,
        media: useVideo
          ? `
            <video class="reel-video" muted loop playsinline autoplay preload="metadata" poster="./one-logo.png">
              <source src="${video.src}" type="${video.type}" />
            </video>
          `
          : `
            <div class="reel-placeholder learn-placeholder-panel">
              <div class="learn-placeholder-badge">${mod.difficulty}</div>
              <div class="learn-placeholder-title">${theme}</div>
              <div class="learn-placeholder-copy">${lessonPrompts[i % lessonPrompts.length]}</div>
            </div>
          `
      });
    }

    const reels = [];
    lessonReels.forEach((lesson, index) => {
      reels.push({ type: "lesson", ...lesson });
      if ((index + 1) % 3 === 0 && quizQueue.length) {
        const quizItem = quizQueue[Math.floor(index / 3) % quizQueue.length];
        if (!quizItem?.quiz?.questions?.length) return;
        const questionIndex = index % Math.max(quizItem.quiz.questions.length, 1);
        reels.push({
          type: "quiz",
          module: quizItem.module,
          quizId: quizItem.quizId,
          quiz: quizItem.quiz,
          questionIndex
        });
      }
    });

    feed.innerHTML = reels.map((item, index) => {
      if (item.type === "quiz") {
        const question = item.quiz.questions[item.questionIndex] || item.quiz.questions[0];
        return `
          <section class="reel-card learn-reel-card quiz-reel-card" data-quiz-id="${item.quizId}" data-question-index="${item.questionIndex}">
            <div class="reel-media quiz-reel-media">
              <div class="quiz-reel-shell">
                <div class="reel-brand">${item.module.difficulty} quiz</div>
                <div class="quiz-reel-title">${item.quiz.title}</div>
                <div class="quiz-reel-question">${question.q}</div>
                <div class="quiz-reel-choices">
                  ${question.choices.map((choice, choiceIndex) => `
                    <button class="learn-quiz-choice" data-choice="${choiceIndex}" type="button">${choice}</button>
                  `).join("")}
                </div>
                <div class="quiz-reel-actions">
                  <button class="action-btn learn-quiz-submit" type="button">Submit answer</button>
                  <div class="quiz-reel-feedback" aria-live="polite"></div>
                </div>
                <div class="quiz-reel-caption">Quiz reel ${Math.floor(index / 4) + 1}. Submit for instant feedback or scroll to continue.</div>
              </div>
            </div>
          </section>
        `;
      }

      return `
        <section class="reel-card learn-reel-card" data-learn-card="${item.id}">
          <div class="reel-media">
            ${item.media}
            <div class="reel-overlay">
              <div class="reel-meta">
                <div class="reel-brand">${item.brand}</div>
                <div class="reel-title">${item.title}</div>
                <div class="reel-sub">${item.desc}</div>
                <div class="reel-sub">${item.sub}</div>
              </div>
              ${item.hasVideo ? `
                <div class="reel-actions">
                  <button class="reel-action reel-explain" type="button" aria-label="Explain this reel" data-explain-title="${escapeAssistantHtml(item.explainPayload.title)}" data-explain-body="${escapeAssistantHtml(item.explainPayload.body)}" data-explain-bullets="${escapeAssistantHtml(JSON.stringify(item.explainPayload.bullets || []))}"><img src="${getAssistantTriggerImageSrc()}" alt="" /><span>Explain</span></button>
                  <button class="reel-action reel-sound" type="button" aria-label="Toggle sound"><span class="reel-action-icon">🔇</span><span class="reel-action-text">Sound</span></button>
                </div>
              ` : ""}
            </div>
          </div>
        </section>
      `;
    }).join("");

    initMoneyMinutes();

    feed.querySelectorAll(".reel-explain").forEach((btn) => {
      btn.onclick = () => {
        const bullets = JSON.parse(btn.dataset.explainBullets || "[]");
        openAssistantWithPreset(
          `Explain this reel: ${btn.dataset.explainTitle?.replace(/ explained$/, "") || "Money Minutes"}`,
          {
            title: btn.dataset.explainTitle || "Money Minutes explained",
            body: btn.dataset.explainBody || "Here is the key idea behind this reel.",
            bullets,
            actions: [
              { label: "Stay on Money Minutes", route: "/learn" },
              { label: "Open practice investing", route: "/practice-investing" }
            ]
          }
        );
      };
    });

    feed.querySelectorAll(".learn-quiz-choice").forEach((btn) => {
      btn.onclick = () => {
        const reel = btn.closest(".quiz-reel-card");
        if (!reel) return;
        reel.querySelectorAll(".learn-quiz-choice").forEach((choiceBtn) => {
          choiceBtn.classList.toggle("selected", choiceBtn === btn);
        });
        const feedback = reel.querySelector(".quiz-reel-feedback");
        if (feedback) {
          feedback.textContent = "";
          feedback.className = "quiz-reel-feedback";
        }
      };
    });

    feed.querySelectorAll(".learn-quiz-submit").forEach((btn) => {
      btn.onclick = async () => {
        const reel = btn.closest(".quiz-reel-card");
        if (!reel) return;
        const quizId = reel.dataset.quizId;
        const questionIndex = Number(reel.dataset.questionIndex || 0);
        const quiz = QUIZ_BANK[quizId];
        const question = quiz?.questions?.[questionIndex] || quiz?.questions?.[0];
        const selectedBtn = reel.querySelector(".learn-quiz-choice.selected");
        const feedback = reel.querySelector(".quiz-reel-feedback");
        if (!question || !feedback) return;

        if (!selectedBtn) {
          feedback.textContent = "Select an answer first.";
          feedback.className = "quiz-reel-feedback incorrect";
          return;
        }

        const selectedChoice = Number(selectedBtn.dataset.choice);
        const isCorrect = selectedChoice === question.correct;
        feedback.textContent = isCorrect
          ? "Correct. This quiz has been counted in your progress."
          : `Not quite. The right answer is "${question.choices[question.correct]}".`;
        feedback.className = `quiz-reel-feedback ${isCorrect ? "correct" : "incorrect"}`;

        if (!isCorrect || completed.includes(quizId)) return;
        completed.push(quizId);
        const nextProfile = {
          ...profile,
          quizCompleted: [...completed],
          learningXP: Number(profile.learningXP || 0) + 15,
          learningStreak: Number(profile.learningStreak || 0) + 1
        };
        profile.learningXP = nextProfile.learningXP;
        profile.learningStreak = nextProfile.learningStreak;
        setProfile(nextProfile);
        await saveProfileRemote(nextProfile);
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
  const qMetaEl = document.querySelector("#quizQuestionMeta");
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
  const mode = params.get("mode") || "";
  const isAllMode = mode === "all";
  const quiz = QUIZ_BANK[id];
  const allQuestions = buildAllQuizQuestions();
  if (!isAllMode && !quiz) return;

  let index = 0;
  let correct = 0;
  let selected = null;
  const questionSet = isAllMode ? allQuestions : quiz.questions;

  const render = () => {
    if (errEl) errEl.textContent = "";
    const total = questionSet.length;
    if (progressEl) progressEl.textContent = isAllMode ? `Money Minutes challenge • Question ${index + 1} of ${total}` : `Question ${index + 1} of ${total}`;
    if (scoreEl) scoreEl.textContent = `${correct} correct`;
    const activeQuestion = questionSet[index];
    if (qMetaEl) qMetaEl.textContent = isAllMode ? activeQuestion?.quizTitle || "Money Minutes" : quiz.title;
    if (qEl) qEl.textContent = activeQuestion.q;

    if (choicesEl) {
      choicesEl.innerHTML = "";
      activeQuestion.choices.forEach((c, i) => {
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

  if (backBtn) backBtn.onclick = () => go(isAllMode ? "/learn" : `/quizzes?module=${encodeURIComponent(mod)}`);

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (selected === null) {
        if (errEl) errEl.textContent = "Select an answer to continue.";
        return;
      }
      if (selected === questionSet[index].correct) correct += 1;
      selected = null;
      index += 1;
      if (index < questionSet.length) {
        render();
        return;
      }
      sessionStorage.setItem("quizResult", JSON.stringify({ id: isAllMode ? "all" : id, mod: isAllMode ? "all" : mod, correct, total: questionSet.length, mode }));
      go(`/quiz-summary?id=${encodeURIComponent(isAllMode ? "all" : id)}&module=${encodeURIComponent(isAllMode ? "all" : mod)}${isAllMode ? "&mode=all" : ""}`);
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
  const isAllMode = data.mode === "all" || data.id === "all";

  if (title) title.textContent = pct === 100 ? "Perfect score!" : isAllMode ? "Challenge complete" : "Quiz complete";
  if (text) text.textContent = isAllMode ? `You got ${correct} of ${total} correct across the full Money Minutes challenge.` : `You got ${correct} of ${total} correct.`;
  if (bar) bar.style.width = `${pct}%`;

  if (badge) {
    badge.textContent = `${pct}%`;
    badge.classList.toggle("full", pct === 100);
  }

  getProfile().then(async (profile) => {
    if (isAllMode) return;
    const completed = Array.isArray(profile.quizCompleted) ? profile.quizCompleted : [];
    const already = data.id && completed.includes(data.id);
    if (data.id && !already) completed.push(data.id);
    const xp = already ? (profile.learningXP || 0) : (profile.learningXP || 0) + (pct === 100 ? 40 : 20);
    const streak = already ? (profile.learningStreak || 0) : (profile.learningStreak || 0) + 1;
    await updateProfile({ quizCompleted: completed, learningXP: xp, learningStreak: streak });
  });

  if (doneBtn) {
    doneBtn.onclick = () => go(isAllMode ? "/learn" : `/quizzes?module=${encodeURIComponent(data.mod || LEARN_MODULES[0].id)}`);
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
  const adminConsoleBtn = document.querySelector("#adminConsoleBtn");

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
      localStorage.removeItem(STORAGE_KEYS.dmThreads);
      localStorage.removeItem(STORAGE_KEYS.dmUnread);
      localStorage.removeItem(STORAGE_KEYS.incomingSeenAt);
      localStorage.removeItem(STORAGE_KEYS.tutorialWalkthroughStep);
      go("/splash");
    };
  }

  if (adminConsoleBtn) {
    adminConsoleBtn.onclick = () => go("/admin-console");
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

function initAdminConsole() {
  const balanceEl = document.querySelector("#adminBalanceValue");
  const txCountEl = document.querySelector("#adminTransactionCount");
  const latestRefEl = document.querySelector("#adminLatestRef");
  const balanceInput = document.querySelector("#adminBalanceInput");
  const setBalanceBtn = document.querySelector("#adminSetBalanceBtn");
  const directionEl = document.querySelector("#adminTxDirection");
  const amountEl = document.querySelector("#adminTxAmount");
  const counterpartyEl = document.querySelector("#adminTxCounterparty");
  const referenceEl = document.querySelector("#adminTxReference");
  const createTxBtn = document.querySelector("#adminCreateTxBtn");
  const quickBtns = document.querySelectorAll(".admin-quick-btn");
  const recentList = document.querySelector("#adminRecentList");
  const refreshBtn = document.querySelector("#adminRefreshBtn");

  const parseMoney = (value) => Number(String(value || "").replace(/[^0-9.-]/g, "")) || 0;
  const renderSnapshot = async () => {
    const snapshot = await fetchDemoAdminSnapshot();
    if (balanceEl) balanceEl.textContent = formatMoney(snapshot.balance);
    if (txCountEl) txCountEl.textContent = String(snapshot.transactionCount || 0);
    if (latestRefEl) latestRefEl.textContent = snapshot.recentTransactions?.[0]?.reference || "No recent transactions";
    if (recentList) {
      recentList.innerHTML = "";
      (snapshot.recentTransactions || []).forEach((tx) => {
        const incoming = tx.to_user === "demo_user_1";
        const row = document.createElement("div");
        row.className = "admin-recent-row";
        row.innerHTML = `
          <div>
            <strong>${incoming ? "From" : "To"} ${tx.counterpartyName || tx.reference || "Manual entry"}</strong>
            <div class="muted">${tx.reference || "Manual adjustment"}</div>
          </div>
          <span class="${incoming ? "positive" : "negative"}">${incoming ? "+" : "-"}${formatMoney(tx.amount)}</span>
        `;
        recentList.appendChild(row);
      });
      if (!snapshot.recentTransactions?.length) {
        recentList.innerHTML = `<div class="muted">No transactions yet.</div>`;
      }
    }
  };

  const clearCaches = () => {
    localStorage.removeItem(STORAGE_KEYS.insightsHomeCache);
    localStorage.removeItem(STORAGE_KEYS.insightsActivePeriod);
  };

  if (setBalanceBtn) {
    setBalanceBtn.onclick = async () => {
      const value = parseMoney(balanceInput?.value);
      await adminSetDemoBalance(value);
      clearCaches();
      showTopNotification(`Demo balance set to ${formatMoney(value)}`);
      renderSnapshot();
    };
  }

  if (createTxBtn) {
    createTxBtn.onclick = async () => {
      const amount = parseMoney(amountEl?.value);
      if (!amount) {
        showTopNotification("Enter an amount first.");
        return;
      }
      await adminCreateDemoTransaction({
        direction: directionEl?.value || "incoming",
        amount,
        counterparty: counterpartyEl?.value || (directionEl?.value === "outgoing" ? "Manual merchant" : "Manual source"),
        reference: referenceEl?.value || (directionEl?.value === "outgoing" ? "Manual spend" : "Manual credit")
      });
      clearCaches();
      if (amountEl) amountEl.value = "";
      if (counterpartyEl) counterpartyEl.value = "";
      if (referenceEl) referenceEl.value = "";
      showTopNotification("Demo transaction added.");
      renderSnapshot();
    };
  }

  quickBtns.forEach((btn) => {
    btn.onclick = async () => {
      const key = btn.dataset.adminQuick;
      if (key === "wages") {
        await adminCreateDemoTransaction({ direction: "incoming", amount: 325, counterparty: "Campus employer", reference: "Weekly wages" });
      } else if (key === "groceries") {
        await adminCreateDemoTransaction({ direction: "outgoing", amount: 38.4, counterparty: "Tesco", reference: "Top-up groceries" });
      } else if (key === "friend") {
        await adminCreateDemoTransaction({ direction: "outgoing", amount: 18, counterparty: "Taylor Brooks", reference: "Dinner split" });
      } else if (key === "reset") {
        await callAccountAdmin("reset");
      }
      clearCaches();
      showTopNotification(key === "reset" ? "Demo data reset." : "Quick action applied.");
      renderSnapshot();
    };
  });

  if (refreshBtn) refreshBtn.onclick = renderSnapshot;

  renderSnapshot();
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
  const locationBtn = document.querySelector("#onboardLocationBtn");
  const locationStatus = document.querySelector("#onboardLocationStatus");
  const termsAccepted = document.querySelector("#onboardTermsAccepted");
  const infoLinks = document.querySelectorAll("[data-onboard-info]");

  let currentStep = 1;
  let chosenHelper = localStorage.getItem(STORAGE_KEYS.helper) || "";
  let chosenInterests = new Set(
    (localStorage.getItem(STORAGE_KEYS.interests) || "").split(",").filter(Boolean)
  );
  let chosenCoords = null;
  const onboardingInfo = {
    competency: {
      title: "Confidence-based personalisation",
      subtitle: "Your finance confidence shapes how the app explains things.",
      sections: [
        { title: "Money Minutes", copy: "Beginner profiles see simpler reels first, while more advanced profiles see deeper topics sooner." },
        { title: "AI Insights", copy: "Insight wording adapts so advice feels clearer and less overwhelming." },
        { title: "Practice Investing", copy: "Educational prompts stay in demo mode and adjust how much jargon is shown." }
      ]
    },
    interests: {
      title: "Interest-based recommendations",
      subtitle: "Your chosen interests personalise the discovery screens.",
      sections: [
        { title: "Deal Nest", copy: "Student discounts are prioritised around the categories you choose here, like food, travel, tech, or concerts." },
        { title: "Shopping List", copy: "Nearby grocery and everyday spend ideas are easier to surface when the app knows your likely patterns." },
        { title: "AI Chatbot", copy: "The assistant uses your interests to suggest the most relevant next screen or savings action." }
      ]
    },
    location: {
      title: "Location usage",
      subtitle: "Location is optional and only used for local discovery in this demo.",
      sections: [
        { title: "Deal Nest", copy: "Nearby stores and student offers can be prioritised when location is available." },
        { title: "Shopping & errands", copy: "Local grocery suggestions can be framed around stores that are closer to you." },
        { title: "Control", copy: "You can leave location off and still use the app. It is only there to make recommendations feel more relevant." }
      ]
    },
    terms: {
      title: "Feature terms and app usage",
      subtitle: "General terms for the demo features inside this app.",
      sections: [
        { title: "Payments and budgeting", copy: "You should only send money you intend to move. Budgeting Pots, Payments, and Bill Splitting are planning tools and do not replace checking details yourself." },
        { title: "Money Minutes, AI Insights, and AI Chatbot", copy: "Educational content and AI-generated suggestions are designed to guide learning and exploration. They are not regulated financial advice." },
        { title: "Practice Investing", copy: "Practice Investing is demo-only. No real trades, assets, or returns are created inside this mode." },
        { title: "Deal Nest and Shopping", copy: "Deals, codes, and local offers are illustrative demo content. Availability, pricing, and retailer terms can change outside the app." }
      ]
    }
  };

  const openOnboardingInfo = (key) => {
    const config = onboardingInfo[key];
    if (!config) return;
    showContentModal({
      kicker: "Onboarding Terms",
      title: config.title,
      subtitle: config.subtitle,
      bodyHtml: config.sections.map((section) => `
        <div class="content-modal-section">
          <div class="content-modal-section-title">${escapeAssistantHtml(section.title)}</div>
          <div class="content-modal-section-copy">${escapeAssistantHtml(section.copy)}</div>
        </div>
      `).join("")
    });
  };

  const sanitizeOnboardingName = (value = "") => String(value).replace(/[0-9]/g, "");

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

  infoLinks.forEach((link) => {
    link.onclick = () => openOnboardingInfo(link.dataset.onboardInfo || "");
  });

  if (nameInput) {
    nameInput.addEventListener("beforeinput", (event) => {
      if (!event.data) return;
      if (/[0-9]/.test(event.data)) event.preventDefault();
    });
    nameInput.addEventListener("input", () => {
      const cleaned = sanitizeOnboardingName(nameInput.value);
      if (nameInput.value !== cleaned) nameInput.value = cleaned;
    });
    nameInput.addEventListener("paste", (event) => {
      const pasted = event.clipboardData?.getData("text") || "";
      if (!/[0-9]/.test(pasted)) return;
      event.preventDefault();
      const cleaned = sanitizeOnboardingName(pasted);
      const start = nameInput.selectionStart ?? nameInput.value.length;
      const end = nameInput.selectionEnd ?? start;
      const nextValue = `${nameInput.value.slice(0, start)}${cleaned}${nameInput.value.slice(end)}`;
      nameInput.value = nextValue;
      const caret = start + cleaned.length;
      nameInput.setSelectionRange(caret, caret);
    });
  }

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
          if (locationStatus) locationStatus.textContent = "Location access granted ✓";
        },
        () => {
          if (locationStatus) locationStatus.textContent = "Location not granted yet.";
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    };
  }

  if (skipBtn) {
    skipBtn.onclick = () => {
      updateProfile({ onboardingDone: true }).then((profile) => { setDemoSessionUnlocked(true); go(nextRouteAfterUnlock(profile)); });
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
        locationCoords: chosenCoords,
        termsAccepted: !!termsAccepted?.checked
      }).then(async (profile) => {
        await updateRemoteName(profile.name);
        const nextSettings = {
          ...SETTINGS_DEFAULTS,
          ...(profile.settings || {}),
          location: !!chosenCoords
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
        setDemoSessionUnlocked(true);
        go("/tutorial");
      });
    };
  }

  getProfile().then((profile) => {
    if (nameInput) nameInput.value = profile?.name || "";
    if (competencySelect) competencySelect.value = profile?.financeCompetency || "";
    if (termsAccepted) termsAccepted.checked = !!profile?.termsAccepted;
    if (profile?.locationCoords) {
      chosenCoords = profile.locationCoords;
      if (locationStatus) locationStatus.textContent = "Location access granted ✓";
    }
  });

  renderStep();
}

function initUnlock() {
  const dots = Array.from(document.querySelectorAll(".unlock-dot"));
  const keypad = document.querySelector("#unlockKeypad");
  const err = document.querySelector("#unlockErr");
  const submit = document.querySelector("#unlockSubmit");
  const faceBtn = document.querySelector("#unlockFaceBtn");
  const backspace = document.querySelector("#unlockBackspace");
  const overlay = document.querySelector("#faceIdOverlay");
  const nameEl = document.querySelector("#unlockName");
  let code = "";

  getProfile().then((profile) => {
    if (nameEl) nameEl.textContent = profile?.name?.split(" ")[0] || "there";
  });

  const syncDots = () => {
    dots.forEach((dot, index) => dot.classList.toggle("filled", index < code.length));
    if (err) err.textContent = "";
  };

  const completeUnlock = async () => {
    const profile = await getProfile();
    setDemoSessionUnlocked(true);
    go(nextRouteAfterUnlock(profile));
  };

  const trySubmit = async () => {
    if (code === "1234") {
      await completeUnlock();
      return;
    }
    if (err) err.textContent = "Passcode incorrect. Try 1234.";
    code = "";
    syncDots();
  };

  keypad?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-digit]");
    if (!btn) return;
    if (code.length >= 4) return;
    code += btn.getAttribute("data-digit") || "";
    syncDots();
  });

  backspace?.addEventListener("click", () => {
    code = code.slice(0, -1);
    syncDots();
  });

  submit?.addEventListener("click", trySubmit);

  faceBtn?.addEventListener("click", async () => {
    if (overlay) {
      overlay.classList.add("show");
      setTimeout(() => overlay.classList.add("success"), 900);
      setTimeout(async () => {
        overlay.classList.remove("show", "success");
        await completeUnlock();
      }, 1700);
    } else {
      await completeUnlock();
    }
  });

  syncDots();
}

function initTutorial() {
  const progressEl = document.querySelector("#tutorialProgress");
  const titleEl = document.querySelector("#tutorialTitle");
  const bodyEl = document.querySelector("#tutorialBody");
  const nextBtn = document.querySelector("#tutorialNext");
  const skipBtn = document.querySelector("#tutorialSkip");

  const render = () => {
    if (progressEl) progressEl.textContent = "Live app walkthrough";
    if (titleEl) titleEl.textContent = "See the current One features";
    if (bodyEl) bodyEl.textContent = "We will walk through the live app screens and show the current features: Payments, Budgeting Pots, DMs, Shopping List, Deal Nest, Practice Investing, Money Minutes, AI Insights, Friends, AI Chatbot, and Settings.";
    if (nextBtn) nextBtn.textContent = "Start";
  };

  const finish = async () => {
    const profile = await updateProfile({ tutorialDone: true });
    setDemoSessionUnlocked(true);
    go(nextRouteAfterUnlock(profile));
  };

  if (nextBtn) {
    nextBtn.onclick = () => {
      localStorage.setItem(STORAGE_KEYS.tutorialWalkthroughStep, "0");
      const first = GUIDED_TUTORIAL_STEPS[0];
      go(`${first.path}?tutorial=1&step=0`);
    };
  }

  if (skipBtn) {
    skipBtn.onclick = finish;
  }

  render();
}
