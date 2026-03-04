// assets/router.js
// Hash router: URLs look like /#/home or /#/payments
// This avoids 404s on normal refresh on GitHub Pages/static hosts.

export function normalizePath(path) {
  if (!path.startsWith("/")) path = "/" + path;
  return path.split("?")[0];
}

export function currentPath() {
  // default to splash if no hash
  const hash = window.location.hash || "#/splash";
  const pathWithQuery = hash.startsWith("#") ? hash.slice(1) : hash; // "/home" or "/insights?..."
  return normalizePath(pathWithQuery);
}

export function go(path) {
  const target = path.startsWith("/") ? path : "/" + path;
  const nextHash = "#" + target;
  // keep querystring if provided in target
  if (window.location.hash === nextHash) {
    // allow explicit same-route refreshes without duplicating normal hash navigation
    window.dispatchEvent(new Event("routechange"));
    return;
  }
  window.location.hash = nextHash;
}
