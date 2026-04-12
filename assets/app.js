// assets/app.js

import { go, currentPath } from "./router.js";
import { initView } from "./views.js";
import { getAuthState, getProfile } from "./auth.js";
import { mountBottomNav, setBottomNavActive, setBottomNavVisible } from "./nav.js";

const app = document.querySelector("#app");

function renderFatalState(message = "The app hit a loading issue.") {
  if (!app) return;
  app.innerHTML = `
    <div class="container" style="padding-top:40px;">
      <div class="card" style="padding:18px;display:grid;gap:12px;">
        <div style="font-weight:800;font-size:20px;">Loading problem</div>
        <div class="muted">${message}</div>
        <div style="display:flex;gap:10px;">
          <button id="fatalReloadBtn" class="primary-btn" type="button">Reload</button>
          <button id="fatalHomeBtn" class="action-btn" type="button">Go home</button>
        </div>
      </div>
    </div>
  `;
  app.querySelector("#fatalReloadBtn")?.addEventListener("click", () => window.location.reload());
  app.querySelector("#fatalHomeBtn")?.addEventListener("click", () => go("/home"));
}

export const routes = {
  "/splash": "./views/splash.html",
  "/login": "./views/login.html",
  "/onboarding": "./views/onboarding.html",
  "/unlock": "./views/unlock.html",
  "/home": "./views/home.html",
  "/account": "./views/account.html",
  "/admin-console": "./views/admin-console.html",
  "/lloyds-data": "./views/lloyds-data.html",
  "/practice-investing": "./views/practice-investing.html",
  "/friends": "./views/friends.html",
  "/friend-profile": "./views/friend-profile.html",
  "/dms": "./views/dms.html",
  "/shopping-list": "./views/shopping-list.html",
  "/tutorial": "./views/tutorial.html",
  "/learn": "./views/learn.html",
  "/quizzes": "./views/quizzes.html",
  "/quiz-video": "./views/quiz-video.html",
  "/quiz-questions": "./views/quiz-questions.html",
  "/quiz-summary": "./views/quiz-summary.html",
  "/transaction": "./views/transaction.html",
  "/add-money": "./views/add-money.html",
  "/add-to-pot": "./views/add-to-pot.html",
  "/scan-cheque": "./views/scan-cheque.html",
  "/move-from-pot": "./views/move-from-pot.html",
  "/payments": "./views/payments.html",
  "/bill-splitting": "./views/bill-splitting.html",
  "/insights": "./views/insights.html",
  "/spending-wrapped": "./views/spending-wrapped.html",
  "/budget-pots": "./views/budget-pots.html",
  "/pot-create": "./views/pot-create.html",
  "/pot-detail": "./views/pot-detail.html",
  "/pot-house": "./views/pot-house.html",
  "/pot-car": "./views/pot-car.html",
  "/pot-savings": "./views/pot-savings.html",
  "/deal-dash": "./views/deal-dash.html",
  "/settings": "./views/settings.html"
};

async function loadView(path) {
  try {
    const htmlPath = routes[path];

    if (!htmlPath) {
      console.warn("Unknown route:", path, "redirecting to /home");
      go("/home");
      return;
    }

    const viewUrl = `${htmlPath}?v=20260207`;
    const res = await fetch(viewUrl, { cache: "no-store" });
    if (!res.ok) {
      console.error("Failed to fetch view:", htmlPath, res.status);
      go("/home");
      return;
    }

    const html = await res.text();
    app.innerHTML = html;

    app.classList.remove("view-enter");
    void app.offsetWidth;
    app.classList.add("view-enter");

    await initView(path);
  } catch (error) {
    console.error("loadView failed:", path, error);
    if (path !== "/home") {
      go("/home");
      return;
    }
    renderFatalState("The page could not be initialised after refresh.");
  }
}

function isDemoSessionUnlocked() {
  return sessionStorage.getItem("demo_app_unlocked") === "1";
}

function mapNavPath(path) {
  if (path === "/budget-pots") return "/home";
  if (path === "/pot-house" || path === "/pot-car" || path === "/pot-savings") return "/home";
  if (path === "/practice-investing") return "/home";
  if (path === "/bill-splitting" || path === "/insights") return "/payments";
  if (path === "/deal-dash") return "/deal-dash";
  if (path === "/quizzes" || path === "/quiz-video" || path === "/quiz-questions" || path === "/quiz-summary") return "/learn";
  return path;
}

async function render() {
  try {
    const path = currentPath();
    const inGuidedTutorial = (window.location.hash || "").includes("tutorial=1");

    mountBottomNav();

    const navRoutes = new Set([
      "/home",
      "/account",
      "/admin-console",
      "/lloyds-data",
      "/practice-investing",
      "/friends",
      "/dms",
      "/shopping-list",
      "/tutorial",
      "/learn",
      "/quizzes",
      "/quiz-video",
      "/quiz-questions",
      "/quiz-summary",
      "/payments",
      "/bill-splitting",
      "/insights",
      "/budget-pots",
      "/pot-house",
      "/pot-car",
      "/pot-savings",
      "/deal-dash",
      "/settings"
    ]);
    setBottomNavVisible(navRoutes.has(path));
    setBottomNavActive(mapNavPath(path));

    const publicRoutes = new Set(["/login", "/splash"]);
    const auth = await getAuthState();
    if (!auth?.signedIn && !publicRoutes.has(path)) {
      go("/login");
      return;
    }

    if (auth?.signedIn && path !== "/login") {
      const profile = await getProfile();
      if (!profile?.onboardingDone && path !== "/onboarding") {
        go("/onboarding");
        return;
      }
      if (profile?.onboardingDone && path !== "/unlock" && !isDemoSessionUnlocked()) {
        go("/unlock");
        return;
      }
      if (profile?.onboardingDone && !profile?.tutorialDone && path !== "/tutorial" && path !== "/unlock" && !inGuidedTutorial) {
        go("/tutorial");
        return;
      }
    }

    await loadView(path);
  } catch (error) {
    console.error("render failed:", error);
    renderFatalState("The app could not finish booting after refresh.");
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("routechange", render);

mountBottomNav();
render();
