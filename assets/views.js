// assets/views.js
import { go } from "./router.js";
import {
  passkeySignUp,
  passkeySignIn,
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

export async function initView(path) {
  hydrateTheme();
  const profile = await getProfile();
  applySettingsToDOM({ ...SETTINGS_DEFAULTS, ...(profile.settings || {}) });
  const brand = document.querySelector(".brand");
  const avatar = document.querySelector(".avatar-btn");
  if (brand) brand.onclick = () => go("/home");
  if (avatar) avatar.onclick = () => go("/account");

  if (path === "/login") return initLogin();
  if (path === "/splash") return initSplash();
  if (path === "/onboarding") return initOnboarding();
  if (path === "/home") return initHome();
  if (path === "/account") return initAccount();
  if (path === "/friends") return initFriends();
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
  if (path === "/scan-cheque") return initScanCheque();
  if (path === "/move-from-pot") return initMoveFromPot();
  if (path === "/payments") return initPayments();
  if (path === "/bill-splitting") return initBillSplitting();
  if (path === "/insights") return initInsights();
  if (path === "/budget-pots") return initBudgetPots();
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
    accountReset.onclick = () => {
      callAccountAdmin("reset")
        .then(() => resetLocalApp())
        .then(() => go("/splash"))
        .catch((e) => alert(e?.message || "Reset failed."));
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
  const btnUp = document.querySelector("#btnPasskeyUp");
  const btnIn = document.querySelector("#btnPasskeyIn");

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

  if (btnUp) {
    btnUp.onclick = async () => {
      setError("");
      try {
        await passkeySignUp();
        setError("Passkey added for this device.");
      } catch (e) {
        setError(e?.message || String(e));
      }
    };
  }

  if (btnIn) {
    btnIn.onclick = async () => {
      setError("");
      try {
        await passkeySignIn();
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
  const potLinks = document.querySelectorAll(".pot-link");
  const openShoppingList = document.querySelector("#openShoppingList");
  const openSmartMoney = document.querySelector("#openSmartMoney");
  const openLearn = document.querySelector("#openLearn");
  const openInsights = document.querySelector("#openInsights");
  const arrangeBtn = document.querySelector("#homeArrangeBtn");
  const arrangePanel = document.querySelector("#homeArrangePanel");
  const arrangeSave = document.querySelector("#arrangeSave");
  const arrangeCancel = document.querySelector("#arrangeCancel");
  const widgetsWrap = document.querySelector("#homeWidgets");
  const balanceEl = document.querySelector("#homeBalanceAmount");
  const balanceOverlayEl = document.querySelector("#homeBalanceOverlayAmount");
  const txList = document.querySelector("#homeTransactionList");
  const txEmpty = document.querySelector("#homeTransactionEmpty");
  const balanceExpand = document.querySelector("#balanceExpand");
  const cardOverlay = document.querySelector("#cardOverlay");
  const cardOverlayClose = document.querySelector("#cardOverlayClose");
  const cardOverlayHide = document.querySelector("#cardOverlayHide");
  const cardDetails = document.querySelector("#cardDetails");

  if (sendBtn) sendBtn.onclick = () => go("/payments");
  if (addBtn) addBtn.onclick = () => go("/add-money");
  if (potsBtn) potsBtn.onclick = () => go("/budget-pots");
  if (viewAllPots) viewAllPots.onclick = () => go("/budget-pots");
  potLinks.forEach((btn) => {
    btn.onclick = () => go(btn.dataset.to);
  });
  if (openShoppingList) openShoppingList.onclick = () => go("/shopping-list");
  if (openSmartMoney) openSmartMoney.onclick = () => go("/smart-money");
  if (openLearn) openLearn.onclick = () => go("/learn");
  if (openInsights) openInsights.onclick = () => go("/insights");

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

  let allTransactions = [];

  const formatMoney = (value) => `£${Number(value).toFixed(2)}`;
  const formatDate = (iso) => {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const renderTransactions = (filter = "all") => {
    if (!txList) return;
    txList.innerHTML = "";
    const current = filter === "all"
      ? allTransactions
      : allTransactions.filter((tx) => tx._direction === filter);

    if (!current.length) {
      if (txEmpty) txEmpty.style.display = "block";
      return;
    }
    if (txEmpty) txEmpty.style.display = "none";

    current.forEach((tx) => {
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
    const user = await ensureRemoteUserProfile(profile);
    if (!user) return;
    const remote = await fetchUserById(user.id);
    if (remote?.name && remote.name !== profile.name) {
      await updateProfile({ name: remote.name });
      const nameEl = document.querySelector("#homeName");
      if (nameEl) nameEl.textContent = remote.name;
    }

    const balance = await fetchBalance(user.id);
    if (balanceEl) balanceEl.textContent = formatMoney(balance);
    if (balanceOverlayEl) balanceOverlayEl.textContent = formatMoney(balance);

    const txs = await fetchTransactions(user.id, 10);
    allTransactions = txs.map((tx) => {
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
      filterBtns.forEach((b) => b.classList.toggle("active", b === btn));
      renderTransactions(filter);
    };
  });
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
  const newLimit = document.querySelector("#smtNewLimit");
  const incomeDelta = document.querySelector("#smtIncomeDelta");
  const rentDelta = document.querySelector("#smtRentDelta");
  const savingsDelta = document.querySelector("#smtSavingsDelta");
  const incomeDeltaVal = document.querySelector("#smtIncomeDeltaVal");
  const rentDeltaVal = document.querySelector("#smtRentDeltaVal");
  const savingsDeltaVal = document.querySelector("#smtSavingsDeltaVal");

  const state = {
    income: 2400,
    buckets: [
      { id: "rent", name: "Rent", rule: "fixed", value: 800, limit: "hard" },
      { id: "food", name: "Food", rule: "percent", value: 20, limit: "soft" },
      { id: "fun", name: "Fun", rule: "percent", value: 8, limit: "soft" },
      { id: "savings", name: "Savings", rule: "fixed", value: 300, limit: "hard" },
      { id: "leftover", name: "Leftover", rule: "leftover", value: 0, limit: "soft" }
    ],
    spent: {
      rent: 800,
      food: 260,
      fun: 120,
      savings: 200,
      leftover: 0
    },
    deltas: {
      income: 0,
      rent: 0,
      savings: 0
    }
  };

  const fmt = (n) => `£${Math.max(0, Math.round(n))}`;

  const calcPlanned = (income, bucket) => {
    if (bucket.rule === "fixed") return bucket.value;
    if (bucket.rule === "percent") return (income * bucket.value) / 100;
    return 0;
  };

  const recompute = () => {
    const effectiveIncome = state.income + state.deltas.income;
    const rentBucket = state.buckets.find((b) => b.id === "rent");
    const savingsBucket = state.buckets.find((b) => b.id === "savings");
    if (rentBucket) rentBucket.value = 800 + state.deltas.rent;
    if (savingsBucket) savingsBucket.value = 300 + state.deltas.savings;

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

  const statusFor = (planned, spent, limit) => {
    if (planned <= 0) return { status: "neutral", why: "No planned amount yet." };
    const ratio = spent / planned;
    if (spent > planned) {
      return { status: "red", why: limit === "hard" ? "Hard limit exceeded." : "Soft limit exceeded." };
    }
    if (ratio >= 0.85) return { status: "yellow", why: "Spending is close to the plan." };
    return { status: "green", why: "On track with the plan." };
  };

  const render = () => {
    if (incomeInput) incomeInput.value = String(state.income);
    if (incomeDelta && incomeDeltaVal) incomeDeltaVal.textContent = fmt(state.deltas.income);
    if (rentDelta && rentDeltaVal) rentDeltaVal.textContent = fmt(state.deltas.rent);
    if (savingsDelta && savingsDeltaVal) savingsDeltaVal.textContent = fmt(state.deltas.savings);

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
      const status = statusFor(plannedAmt, spent, b.limit);

      const row = document.createElement("div");
      row.className = "smt-row";
      row.innerHTML = `
        <div class=\"smt-cell\">\n          <input class=\"smt-name\" value=\"${b.name}\" />\n          <div class=\"muted\" style=\"font-size:11px;\">${b.limit === "hard" ? "Hard limit" : "Soft limit"}</div>\n        </div>\n        <div class=\"smt-cell\">\n          <select class=\"smt-rule\">\n            <option value=\"fixed\" ${b.rule === "fixed" ? "selected" : ""}>Fixed</option>\n            <option value=\"percent\" ${b.rule === "percent" ? "selected" : ""}>% of income</option>\n            <option value=\"leftover\" ${b.rule === "leftover" ? "selected" : ""}>Leftover</option>\n          </select>\n          <input class=\"smt-value\" type=\"number\" ${b.rule === "leftover" ? "disabled" : ""} value=\"${b.value}\" />\n        </div>\n        <div class=\"smt-cell\">${fmt(plannedAmt)}</div>\n        <div class=\"smt-cell\">\n          <div>${fmt(spent)}</div>\n          <div class=\"smt-bar\"><span style=\"width:${plannedAmt ? Math.min(100, (spent / plannedAmt) * 100) : 0}%;\"></span></div>\n        </div>\n        <div class=\"smt-cell\">${fmt(remaining)}</div>\n        <div class=\"smt-cell\">\n          <span class=\"smt-status ${status.status}\"></span>\n          <button class=\"smt-why\" type=\"button\">Why?</button>\n        </div>\n      `;

      const nameInput = row.querySelector(".smt-name");
      const ruleSelect = row.querySelector(".smt-rule");
      const valueInput = row.querySelector(".smt-value");
      const whyBtn = row.querySelector(".smt-why");

      if (nameInput) nameInput.onchange = () => { b.name = nameInput.value.trim() || b.name; };
      if (ruleSelect) ruleSelect.onchange = () => { b.rule = ruleSelect.value; render(); };
      if (valueInput) valueInput.onchange = () => { b.value = Number(valueInput.value || 0); render(); };
      if (whyBtn) whyBtn.onclick = () => alert(`${b.name}: ${status.why}`);

      rowsWrap.appendChild(row);
    });
  };

  if (incomeInput) {
    incomeInput.oninput = () => {
      state.income = Number(incomeInput.value || 0);
      render();
    };
  }

  if (incomeDelta) incomeDelta.oninput = () => { state.deltas.income = Number(incomeDelta.value || 0); render(); };
  if (rentDelta) rentDelta.oninput = () => { state.deltas.rent = Number(rentDelta.value || 0); render(); };
  if (savingsDelta) savingsDelta.oninput = () => { state.deltas.savings = Number(savingsDelta.value || 0); render(); };

  if (addBtn) {
    addBtn.onclick = () => {
      const name = newName?.value?.trim();
      if (!name) return;
      const rule = newRule?.value || "fixed";
      const value = Number(newValue?.value || 0);
      const limit = newLimit?.value || "soft";
      state.buckets.push({ id: `b_${Date.now()}`, name, rule, value, limit });
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
    const user = await getSupabaseUser();
    try {
      const users = await fetchUsers();
      sendToSelect.innerHTML = '<option value="">Select recipient</option>';
      const list = users.filter((u) => u.id !== user?.id);
      if (!list.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No other users found";
        sendToSelect.appendChild(opt);
        return;
      }
      list.forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.name || u.id.slice(0, 6);
        sendToSelect.appendChild(opt);
      });
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

      if (!receiverId) {
        alert("Select a recipient.");
        return;
      }
      if (!amount || Number.isNaN(amount) || amount <= 0) {
        alert("Enter a valid amount.");
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
  if (openCheque) openCheque.onclick = () => go("/scan-cheque");
  if (openMove) openMove.onclick = () => go("/move-from-pot");
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
  if (confirm) confirm.onclick = () => showConfirmation("Money added");
}

function initInsights() {
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

  const data = {
    week: {
      total: 210,
      safeToSpend: 145,
      trend: [32, 18, 22, 40, 28, 55, 15],
      categories: [
        { name: "Groceries", amount: 78, color: "#0aa85d" },
        { name: "Subscriptions", amount: 24, color: "#8dd9b3" },
        { name: "Entertainment", amount: 32, color: "#4cbe86" },
        { name: "Bills", amount: 46, color: "#2c8f63" },
        { name: "Other", amount: 30, color: "#b5e5cf" }
      ]
    },
    month: {
      total: 890,
      safeToSpend: 410,
      trend: [120, 90, 140, 110, 180, 150, 100, 120, 130, 160, 140, 110],
      categories: [
        { name: "Groceries", amount: 290, color: "#0aa85d" },
        { name: "Subscriptions", amount: 80, color: "#8dd9b3" },
        { name: "Entertainment", amount: 140, color: "#4cbe86" },
        { name: "Bills", amount: 210, color: "#2c8f63" },
        { name: "Other", amount: 170, color: "#b5e5cf" }
      ]
    },
    year: {
      total: 10240,
      safeToSpend: 2100,
      trend: [800, 760, 920, 840, 980, 1020, 880, 900, 940, 860, 970, 920],
      categories: [
        { name: "Groceries", amount: 3200, color: "#0aa85d" },
        { name: "Subscriptions", amount: 900, color: "#8dd9b3" },
        { name: "Entertainment", amount: 1800, color: "#4cbe86" },
        { name: "Bills", amount: 2600, color: "#2c8f63" },
        { name: "Other", amount: 1740, color: "#b5e5cf" }
      ]
    }
  };

  const fmt = (n) => `£${Math.round(n).toLocaleString()}`;

  const render = (period) => {
    const d = data[period];
    if (!d) return;
    if (totalEl) totalEl.textContent = fmt(d.total);
    if (safeEl) safeEl.textContent = fmt(d.safeToSpend);
    if (trendLabel) trendLabel.textContent = period === "week" ? "Last 7 days" : period === "month" ? "Last 30 days" : "Last 12 months";

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
      const grocery = d.categories[0]?.amount || 0;
      const pct = d.total ? Math.round((grocery / d.total) * 100) : 0;
      donutEl.setAttribute("stroke-dasharray", `${pct * 2.76} 276`);
      donutLabel.textContent = `${pct}%`;
    }

    if (sparkEl) {
      sparkEl.innerHTML = "";
      d.trend.slice(-7).forEach((v) => {
        const bar = document.createElement("div");
        bar.style.height = `${Math.max(20, (v / Math.max(...d.trend)) * 60)}px`;
        sparkEl.appendChild(bar);
      });
    }

    if (barsEl) {
      barsEl.innerHTML = "";
      const max = Math.max(...d.trend);
      d.trend.forEach((v) => {
        const bar = document.createElement("div");
        bar.className = "insights-bar";
        bar.innerHTML = `<span style="height:${(v / max) * 100}%"></span>`;
        barsEl.appendChild(bar);
      });
    }

    if (categoriesEl) {
      categoriesEl.innerHTML = "";
      d.categories.forEach((c) => {
        const tile = document.createElement("div");
        tile.className = "insights-category";
        tile.innerHTML = `<div class="insights-category-top"><span>${c.name}</span><span>${fmt(c.amount)}</span></div><div class="insights-bar-mini"><span style="width:${(c.amount / d.total) * 100}%;background:${c.color}"></span></div>`;
        categoriesEl.appendChild(tile);
      });
    }
  };

  periodBtns.forEach((btn) => {
    btn.onclick = () => {
      periodBtns.forEach((b) => b.classList.toggle("active", b === btn));
      render(btn.dataset.period);
    };
  });

  render("week");
}

function initHomeInsightsCard() {
  const donutEl = document.querySelector("#homeInsightsDonut");
  const label = document.querySelector("#homeInsightsLabel");
  const totalEl = document.querySelector("#homeInsightsTotal");
  const legendEl = document.querySelector("#homeInsightsLegend");
  const periodBtns = document.querySelectorAll(".insights-mini-tabs .insights-chip");
  if (!donutEl || !label) return;

  const data = {
    week: {
      total: 210,
      focusIndex: 0,
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
      focusIndex: 3,
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
      focusIndex: 1,
      categories: [
        { name: "Groceries", amount: 2900, color: "#0aa85d" },
        { name: "Subscriptions", amount: 1200, color: "#8dd9b3" },
        { name: "Entertainment", amount: 1600, color: "#4cbe86" },
        { name: "Bills", amount: 2500, color: "#2c8f63" },
        { name: "Other", amount: 1700, color: "#b5e5cf" }
      ]
    }
  };

  const fmt = (value) => `£${Math.round(value).toLocaleString()}`;

  const render = (period) => {
    const d = data[period] || data.week;
    const focus = d.categories[d.focusIndex] || d.categories[0];
    const pct = d.total ? Math.round((focus.amount / d.total) * 100) : 0;
    donutEl.setAttribute("stroke-dasharray", `${pct * 2.76} 276`);
    label.textContent = `${pct}%`;
    if (totalEl) totalEl.textContent = fmt(d.total);

    if (legendEl) {
      legendEl.innerHTML = "";
      d.categories.forEach((c) => {
        const row = document.createElement("div");
        row.innerHTML = `<span class="insights-dot" style="background:${c.color};"></span>${c.name} <strong>${fmt(c.amount)}</strong>`;
        legendEl.appendChild(row);
      });
    }
  };

  periodBtns.forEach((btn) => {
    btn.onclick = () => {
      periodBtns.forEach((b) => b.classList.toggle("active", b === btn));
      render(btn.dataset.period || "week");
    };
  });

  const active = document.querySelector(".insights-mini-tabs .insights-chip.active");
  render(active?.dataset.period || "week");
}

function initBudgetPots() {
  const moveBtn = document.querySelector("#moveMoneyBtn");
  const potLinks = document.querySelectorAll(".pot-link");
  if (moveBtn) moveBtn.onclick = () => go("/payments");
  potLinks.forEach((btn) => {
    btn.onclick = () => go(btn.dataset.to);
  });
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

  if (!chips.length) return;

  const fmt = (value) => `£${Number(value).toFixed(2)}`;

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
          <span>${Number(item.distanceMiles || 0).toFixed(1)} mi</span>
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
      filtered = filtered.sort((a, b) => (a.distanceMiles || 0) - (b.distanceMiles || 0));
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
    .then((data) => {
      allItems = Array.isArray(data) ? data : [];
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
          row.className = "settings-item";
          row.innerHTML = `<span>${f.name}</span><span class=\"muted\">${f.handle || ""}</span>`;
          listWrap.appendChild(row);
        });
      }
    }
  };

  const search = async (query) => {
    const profile = await getProfile();
    const directory = Array.isArray(profile.friendDirectory) ? profile.friendDirectory : [];
    const friends = Array.isArray(profile.friends) ? profile.friends : [];
    const requests = Array.isArray(profile.friendRequests) ? profile.friendRequests : [];
    const q = query.trim().toLowerCase();
    if (!results) return;
    results.innerHTML = "";
    if (!q) return;

    const matches = directory.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.handle || "").toLowerCase().includes(q)
    );

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
      name.innerHTML = `<strong>${person.name}</strong> <span class=\"muted\">${person.handle || ""}</span>`;
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
    quizzes: ["q1", "q2"]
  },
  {
    id: "mod-safety",
    title: "Safe Spending",
    desc: "Avoiding overspend and building buffers.",
    quizzes: ["q3"]
  },
  {
    id: "mod-growth",
    title: "Growing Savings",
    desc: "Pots, interest, and long-term wins.",
    quizzes: ["q4", "q5"]
  }
];

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
  }
};

function initLearn() {
  const grid = document.querySelector("#moduleGrid");
  const overallPct = document.querySelector("#learnOverallPct");
  const overallBar = document.querySelector("#learnOverallBar");
  const streakEl = document.querySelector("#learnStreak");

  getProfile().then((profile) => {
    const completed = Array.isArray(profile.quizCompleted) ? profile.quizCompleted : [];
    const totalQuizzes = Object.keys(QUIZ_BANK).length;
    const pct = totalQuizzes ? Math.round((completed.length / totalQuizzes) * 100) : 0;

    if (overallPct) overallPct.textContent = `${pct}%`;
    if (overallBar) overallBar.style.width = `${pct}%`;
    if (streakEl) streakEl.textContent = `${profile.learningStreak || 0} days`;

    if (!grid) return;
    grid.innerHTML = "";
    LEARN_MODULES.forEach((mod) => {
      const doneCount = mod.quizzes.filter((q) => completed.includes(q)).length;
      const modPct = mod.quizzes.length ? Math.round((doneCount / mod.quizzes.length) * 100) : 0;
      const card = document.createElement("div");
      card.className = "module-card";
      card.innerHTML = `
        <div class="module-top">
          <div>
            <div class="module-title">${mod.title}</div>
            <div class="muted">${mod.desc}</div>
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
  const modId = params.get("module") || LEARN_MODULES[0].id;
  const mod = LEARN_MODULES.find((m) => m.id === modId) || LEARN_MODULES[0];

  if (moduleTitle) moduleTitle.textContent = mod.title;
  if (moduleDesc) moduleDesc.textContent = mod.desc;

  getProfile().then((profile) => {
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
    resetAccountBtn.onclick = () => {
      resetLocalApp().then(() => go("/splash"));
    };
  }

  if (deleteAccountBtn) {
    deleteAccountBtn.onclick = () => {
      const ok = window.confirm("Delete this account and all local data? This cannot be undone.");
      if (!ok) return;
      resetLocalApp().then(() => go("/splash"));
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

  let currentStep = 1;
  let chosenHelper = localStorage.getItem(STORAGE_KEYS.helper) || "";
  let chosenInterests = new Set(
    (localStorage.getItem(STORAGE_KEYS.interests) || "").split(",").filter(Boolean)
  );

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
      if (chosenInterests.size < 2 || chosenInterests.size > 3) {
        if (interestErr) interestErr.textContent = "Pick 2 or 3 interests to continue.";
        return;
      }

      localStorage.setItem(STORAGE_KEYS.interests, [...chosenInterests].join(","));
      updateProfile({
        onboardingDone: true,
        name: nameInput.value.trim(),
        financeCompetency: competencySelect.value
      }).then(async (profile) => {
        await updateRemoteName(profile.name);
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
