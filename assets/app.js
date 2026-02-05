// assets/app.js

import { go, currentPath } from "./router.js";
import { initView } from "./views.js";
import { mountBottomNav, setBottomNavActive, setBottomNavVisible } from "./nav.js";

const app = document.querySelector("#app");

export const routes = {
  "/onboarding": "./views/onboarding.html",
  "/home": "./views/home.html",
  "/payments": "./views/payments.html",
  "/bill-splitting": "./views/bill-splitting.html",
  "/insights": "./views/insights.html",
  "/budget-pots": "./views/budget-pots.html",
  "/deal-dash": "./views/deal-dash.html",
  "/money-minutes": "./views/money-minutes.html",
  "/settings": "./views/settings.html"
};

async function loadView(path) {
  const htmlPath = routes[path];

  if (!htmlPath) {
    console.warn("Unknown route:", path, "redirecting to /home");
    go("/home");
    return;
  }

  const res = await fetch(htmlPath);
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
}

function mapNavPath(path) {
  if (path === "/budget-pots") return "/home";
  if (path === "/bill-splitting" || path === "/insights") return "/payments";
  if (path === "/deal-dash") return "/deal-dash";
  return path;
}

async function render() {
  const path = currentPath();

  mountBottomNav();

  const navRoutes = new Set([
    "/home",
    "/payments",
    "/bill-splitting",
    "/insights",
    "/budget-pots",
    "/deal-dash",
    "/money-minutes",
    "/settings"
  ]);
  setBottomNavVisible(navRoutes.has(path));
  setBottomNavActive(mapNavPath(path));

  const onboardingDone = localStorage.getItem("onboardingDone") === "true";
  if (!onboardingDone && path !== "/onboarding") {
    go("/onboarding");
    return;
  }

  await loadView(path);
}

window.addEventListener("popstate", render);
window.addEventListener("hashchange", render);
window.addEventListener("routechange", render);

mountBottomNav();
render();
