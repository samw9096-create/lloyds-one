// assets/nav.js
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
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-4v6H5.5A1.5 1.5 0 0 1 4 18.5z"/></svg>
        </span>
        <span class="nav-label">Home</span>
      </button>
      <button class="nav-btn" data-to="/payments" aria-label="Payments">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Zm2.5-.5a.5.5 0 0 0-.5.5V9h16V7.5a.5.5 0 0 0-.5-.5h-16Zm-.5 4v5.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V11h-14Zm8 3h6v2h-6v-2Z"/></svg>
        </span>
        <span class="nav-label">Payments</span>
      </button>
      <button class="nav-btn" data-to="/learn" aria-label="Money Minutes">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5 12 3l9 3.5-9 3.5-9-3.5Zm2 6.2v4.3l7 3 7-3v-4.3l-7 2.7-7-2.7Zm7-2.9 9-3.5 1 2.4-10 4.1-10-4.1 1-2.4 9 3.5Z"/></svg>
        </span>
        <span class="nav-label">Money Minutes</span>
      </button>
      <button class="nav-btn" data-to="/deal-dash" aria-label="Deal Nest">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h6A2.5 2.5 0 0 1 15 5.5V8h2.5A2.5 2.5 0 0 1 20 10.5v8A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13Zm2.5-.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5H13V5.5a.5.5 0 0 0-.5-.5h-6ZM10 12h4v2h-4v-2Zm-2 4h8v2H8v-2Z"/></svg>
        </span>
        <span class="nav-label">Deal Nest</span>
      </button>
      <button class="nav-btn" data-to="/dms" aria-label="DMs">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-5 5v-5.5A2.5 2.5 0 0 1 1.5 13V5.5A2.5 2.5 0 0 1 4 3.5h.5Zm2.5 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm5 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm5 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/></svg>
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
