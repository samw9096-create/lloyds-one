// bottom nav bar created once and used across whole app

import { go } from "./router.js";

let mounted = false;
let activePath = "/home";
let indicator = null;
let navWrap = null;

function navButtons() {
  if (!navWrap) return [];
  return Array.from(navWrap.querySelectorAll(".nav-btn"));
}

function nearestButton(clientX) {
  const buttons = navButtons();
  if (!buttons.length) return null;
  let best = buttons[0];
  let bestDist = Number.POSITIVE_INFINITY;
  buttons.forEach((btn) => {
    const rect = btn.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const dist = Math.abs(clientX - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = btn;
    }
  });
  return best;
}

function moveIndicatorTo(path, animate = true) {
  if (!indicator || !navWrap) return;
  const btn = navWrap.querySelector(`.nav-btn[data-to="${path}"]`);
  if (!btn) return;
  const wrapRect = navWrap.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  const x = btnRect.left - wrapRect.left + (btnRect.width - indicator.offsetWidth) / 2;
  indicator.style.transition = animate ? "transform 220ms cubic-bezier(.2,.85,.25,1)" : "none";
  indicator.style.transform = `translateX(${Math.max(8, x)}px)`;
}

export function mountBottomNav() {
  if (mounted) return;
  mounted = true;

  const nav = document.createElement("div");
  nav.className = "bottom-nav";
  nav.id = "globalBottomNav";

  nav.innerHTML = `
    <div class="bottom-nav-wrap">
      <div class="nav-active-indicator" aria-hidden="true"></div>
      <button class="nav-btn" data-to="/home" aria-label="Home">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.75 10.75 12 4.75l7.25 6v8a.75.75 0 0 1-.75.75h-4.25v-5.5h-4.5v5.5H5.5a.75.75 0 0 1-.75-.75z"/>
          </svg>
        </span>
        <span class="nav-label">Home</span>
      </button>
      <button class="nav-btn" data-to="/payments" aria-label="Payments">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.5 6.25h15a1.75 1.75 0 0 1 1.75 1.75v8A1.75 1.75 0 0 1 19.5 17.75h-15A1.75 1.75 0 0 1 2.75 16V8A1.75 1.75 0 0 1 4.5 6.25Zm-.25 3.5h16M14.25 14h4"/>
          </svg>
        </span>
        <span class="nav-label">Payments</span>
      </button>
      <button class="nav-btn" data-to="/learn" aria-label="Money Minutes">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.75 4.75h10.5A1.75 1.75 0 0 1 19 6.5v11a1.75 1.75 0 0 1-1.75 1.75H6.75A1.75 1.75 0 0 1 5 17.5v-11A1.75 1.75 0 0 1 6.75 4.75Zm2.25 3.5h6m-6 3h6m-6 3h4.5"/>
          </svg>
        </span>
        <span class="nav-label">Money Minutes</span>
      </button>
      <button class="nav-btn" data-to="/deal-dash" aria-label="Deal Nest">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.5 5.25h11A1.25 1.25 0 0 1 18.75 6.5v11a1.25 1.25 0 0 1-1.25 1.25h-11A1.25 1.25 0 0 1 5.25 17.5v-11A1.25 1.25 0 0 1 6.5 5.25Zm0 0 3-2.5m6 2.5-3-2.5m-3.75 8h7.5m-6 3h4.5"/>
          </svg>
        </span>
        <span class="nav-label">Deal Nest</span>
      </button>
      <button class="nav-btn" data-to="/dms" aria-label="DMs">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.75 5.25h10.5A1.75 1.75 0 0 1 19 7v7.5a1.75 1.75 0 0 1-1.75 1.75h-6.5l-4.5 3v-3H6.75A1.75 1.75 0 0 1 5 14.5V7a1.75 1.75 0 0 1 1.75-1.75Zm2.25 5h.01m2.99 0H12m2.99 0H15"/>
          </svg>
        </span>
        <span class="nav-label">DMs</span>
      </button>
    </div>
  `;

  document.body.appendChild(nav);
  navWrap = nav.querySelector(".bottom-nav-wrap");
  indicator = nav.querySelector(".nav-active-indicator");

  nav.querySelectorAll(".nav-btn").forEach((b) => {
    b.addEventListener("click", () => go(b.dataset.to));
  });

  if (indicator && navWrap) {
    let dragging = false;
    let activePointerId = null;

    const stopDrag = (clientX) => {
      if (!dragging) return;
      dragging = false;
      indicator.classList.remove("dragging");
      const targetBtn = nearestButton(clientX);
      if (targetBtn) {
        const to = targetBtn.dataset.to;
        activePath = to;
        moveIndicatorTo(to);
        go(to);
      } else {
        moveIndicatorTo(activePath);
      }
      activePointerId = null;
    };

    indicator.addEventListener("pointerdown", (e) => {
      dragging = true;
      activePointerId = e.pointerId;
      indicator.classList.add("dragging");
      indicator.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    indicator.addEventListener("pointermove", (e) => {
      if (!dragging || e.pointerId !== activePointerId || !navWrap) return;
      const wrapRect = navWrap.getBoundingClientRect();
      const half = indicator.offsetWidth / 2;
      const x = Math.min(Math.max(e.clientX - wrapRect.left - half, 8), wrapRect.width - indicator.offsetWidth - 8);
      indicator.style.transition = "none";
      indicator.style.transform = `translateX(${x}px)`;
    });

    indicator.addEventListener("pointerup", (e) => {
      if (e.pointerId !== activePointerId) return;
      stopDrag(e.clientX);
    });

    indicator.addEventListener("pointercancel", () => {
      stopDrag(0);
    });
  }

  requestAnimationFrame(() => moveIndicatorTo(activePath, false));
}

export function setBottomNavVisible(visible) {
  const nav = document.querySelector("#globalBottomNav");
  if (!nav) return;
  nav.style.display = visible ? "block" : "none";
}

export function setBottomNavActive(path) {
  const nav = document.querySelector("#globalBottomNav");
  if (!nav) return;
  activePath = path;

  nav.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.to === path);
  });

  moveIndicatorTo(path);
}
