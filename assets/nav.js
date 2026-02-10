// assets/nav.js
import { go } from "./router.js";

let mounted = false;

export function mountBottomNav() {
  if (mounted) return;
  mounted = true;

  const nav = document.createElement("div");
  nav.className = "bottom-nav";
  nav.id = "globalBottomNav";

  nav.innerHTML = `
    <div class="bottom-nav-wrap">
      <button class="nav-btn" data-to="/home" aria-label="Home">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-4v6H5.5A1.5 1.5 0 0 1 4 18.5z"/></svg>
        </span>
        <span class="nav-label">Home</span>
      </button>
      <button class="nav-btn" data-to="/payments" aria-label="Payments">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h10.5l-3.5-3.5 1.4-1.4L18.8 12l-6.4 6.9-1.4-1.4L14.5 13H4z"/></svg>
        </span>
        <span class="nav-label">Payments</span>
      </button>
      <button class="nav-btn" data-to="/learn" aria-label="Learn">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5 12 3l9 3.5-9 3.5-9-3.5Zm2 6.2v4.3l7 3 7-3v-4.3l-7 2.7-7-2.7Zm7-2.9 9-3.5 1 2.4-10 4.1-10-4.1 1-2.4 9 3.5Z"/></svg>
        </span>
        <span class="nav-label">Learn</span>
      </button>
      <button class="nav-btn" data-to="/deal-dash" aria-label="Deal Dash">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.2 4h7.3l2.5 4-5.2 9H7.5L4 9.5 10.2 4Zm.7 2.1L7.3 9.2l2.1 3.7h3.8l2.5-5.1-2.8-1.7H10.9Zm-1.9 11.3h4.5l1.8-3.6h-7l.7 1.3Z"/></svg>
        </span>
        <span class="nav-label">Deal Dash</span>
      </button>
      <button class="nav-btn" data-to="/settings" aria-label="Settings">
        <span class="nav-ico">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 3.8 3.8A3.8 3.8 0 0 0 12 8.2Zm9 3.8a7.6 7.6 0 0 0-.1-1.2l-2.1-.3-.6-1.4 1.3-1.7a9 9 0 0 0-1.7-1.7l-1.7 1.3-1.4-.6-.3-2.1A7.6 7.6 0 0 0 12 3a7.6 7.6 0 0 0-1.2.1l-.3 2.1-1.4.6-1.7-1.3a9 9 0 0 0-1.7 1.7l1.3 1.7-.6 1.4-2.1.3A7.6 7.6 0 0 0 3 12a7.6 7.6 0 0 0 .1 1.2l2.1.3.6 1.4-1.3 1.7a9 9 0 0 0 1.7 1.7l1.7-1.3 1.4.6.3 2.1a7.6 7.6 0 0 0 2.4 0l.3-2.1 1.4-.6 1.7 1.3a9 9 0 0 0 1.7-1.7l-1.3-1.7.6-1.4 2.1-.3A7.6 7.6 0 0 0 21 12Z"/></svg>
        </span>
        <span class="nav-label">Settings</span>
      </button>
    </div>
  `;

  document.body.appendChild(nav);

  nav.querySelectorAll(".nav-btn").forEach((b) => {
    b.addEventListener("click", () => go(b.dataset.to));
  });
}

export function setBottomNavVisible(visible) {
  const nav = document.querySelector("#globalBottomNav");
  if (!nav) return;
  nav.style.display = visible ? "block" : "none";
}

export function setBottomNavActive(path) {
  const nav = document.querySelector("#globalBottomNav");
  if (!nav) return;

  nav.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.to === path);
  });
}
