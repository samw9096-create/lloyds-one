// assets/views.js
import { go } from "./router.js";

const STORAGE_KEYS = {
  onboardingDone: "onboardingDone",
  helper: "chosenHelper",
  interests: "chosenInterests",
  mode: "appMode",
  theme: "appTheme"
};

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

export async function initView(path) {
  hydrateTheme();
  const brand = document.querySelector(".brand");
  const avatar = document.querySelector(".avatar-btn");
  if (brand) brand.onclick = () => go("/home");
  if (avatar) avatar.onclick = () => go("/settings");

  if (path === "/onboarding") return initOnboarding();
  if (path === "/home") return initHome();
  if (path === "/payments") return initPayments();
  if (path === "/bill-splitting") return initBillSplitting();
  if (path === "/insights") return initInsights();
  if (path === "/budget-pots") return initBudgetPots();
  if (path === "/deal-dash") return initDealDash();
  if (path === "/money-minutes") return initMoneyMinutes();
  if (path === "/settings") return initSettings();
}

function initHome() {
  const filterBtns = document.querySelectorAll("[data-filter]");
  const items = document.querySelectorAll("[data-transaction]");
  const sendBtn = document.querySelector("#homeSendMoney");
  const potsBtn = document.querySelector("#homeBudgetPots");

  if (sendBtn) sendBtn.onclick = () => go("/payments");
  if (potsBtn) potsBtn.onclick = () => go("/budget-pots");

  filterBtns.forEach((btn) => {
    btn.onclick = () => {
      const filter = btn.dataset.filter;
      filterBtns.forEach((b) => b.classList.toggle("active", b === btn));
      items.forEach((item) => {
        if (filter === "all") {
          item.classList.remove("hidden");
          return;
        }
        item.classList.toggle("hidden", item.dataset.transaction !== filter);
      });
    };
  });
}

function initPayments() {
  const splitLink = document.querySelector("#goSplitBill");
  const insightsLink = document.querySelector("#goInsights");
  const sendBtn = document.querySelector("#sendMoneyBtn");
  if (splitLink) splitLink.onclick = () => go("/bill-splitting");
  if (insightsLink) insightsLink.onclick = () => go("/insights");
  if (sendBtn) sendBtn.onclick = () => showConfirmation("Money sent");
}

function initBillSplitting() {
  const sendLink = document.querySelector("#goSendMoney");
  const insightsLink = document.querySelector("#goInsights");
  const splitBtn = document.querySelector("#splitBillBtn");
  if (sendLink) sendLink.onclick = () => go("/payments");
  if (insightsLink) insightsLink.onclick = () => go("/insights");
  if (splitBtn) splitBtn.onclick = () => showConfirmation("Bill split");
}

function initInsights() {
  const sendLink = document.querySelector("#goSendMoney");
  const splitLink = document.querySelector("#goSplitBill");
  if (sendLink) sendLink.onclick = () => go("/payments");
  if (splitLink) splitLink.onclick = () => go("/bill-splitting");
}

function initBudgetPots() {
  const moveBtn = document.querySelector("#moveMoneyBtn");
  if (moveBtn) moveBtn.onclick = () => go("/payments");
}

function initDealDash() {
  const search = document.querySelector("#dealSearch");
  const chips = document.querySelectorAll("[data-sort]");
  const label = document.querySelector("#dealSortLabel");

  if (!chips.length) return;
  chips.forEach((chip) => {
    chip.onclick = () => {
      chips.forEach((c) => c.classList.toggle("active", c === chip));
      if (label) label.textContent = chip.dataset.sort;
    };
  });

  if (search) {
    search.oninput = () => {
      const val = search.value.trim();
      search.dataset.hasValue = val ? "true" : "false";
    };
  }
}

function initMoneyMinutes() {
  // Static page for now
}

function initSettings() {
  const lightBtn = document.querySelector("#modeLight");
  const darkBtn = document.querySelector("#modeDark");
  const themeCards = document.querySelectorAll("[data-theme-card]");
  const faceToggle = document.querySelector("#faceToggle");
  const simulateBtn = document.querySelector("#simulateOnboardingBtn");

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

  themeCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.themeCard === currentTheme);
    card.onclick = () => {
      themeCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      setTheme(card.dataset.themeCard);
    };
  });

  if (faceToggle) {
    const saved = localStorage.getItem("faceIdEnabled") === "true";
    faceToggle.checked = saved;
    faceToggle.onchange = () => localStorage.setItem("faceIdEnabled", String(faceToggle.checked));
  }

  if (simulateBtn) {
    simulateBtn.onclick = () => {
      localStorage.setItem(STORAGE_KEYS.onboardingDone, "false");
      go("/onboarding");
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

  let currentStep = 1;
  let chosenHelper = localStorage.getItem(STORAGE_KEYS.helper) || "";
  let chosenInterests = new Set(
    (localStorage.getItem(STORAGE_KEYS.interests) || "").split(",").filter(Boolean)
  );

  const renderStep = () => {
    if (step1) step1.classList.toggle("hidden", currentStep !== 1);
    if (step2) step2.classList.toggle("hidden", currentStep !== 2);
    if (nextBtn) nextBtn.textContent = currentStep === 1 ? "Next" : "Next";
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

  if (skipBtn) {
    skipBtn.onclick = () => {
      localStorage.setItem(STORAGE_KEYS.onboardingDone, "true");
      go("/home");
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

      if (interestErr) interestErr.textContent = "";
      if (chosenInterests.size < 2 || chosenInterests.size > 3) {
        if (interestErr) interestErr.textContent = "Pick 2 or 3 interests to continue.";
        return;
      }

      localStorage.setItem(STORAGE_KEYS.interests, [...chosenInterests].join(","));
      localStorage.setItem(STORAGE_KEYS.onboardingDone, "true");
      go("/home");
    };
  }

  renderStep();
}
