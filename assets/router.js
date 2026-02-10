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
  // keep querystring if provided in target
  window.location.hash = "#" + target;
  // Some code listens to popstate; hashchange is the actual event here.
  window.dispatchEvent(new Event("routechange"));
}
