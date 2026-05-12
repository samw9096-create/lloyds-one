// hash routing is used, so URLs look like /#/home or /#/payments to avoid 404s

export function normalizePath(path) {
  if (!path.startsWith("/")) path = "/" + path;
  return path.split("?")[0];
}

export function currentPath() {
  // default to splash on the web, but home when opening directly from the file system
  const hash = window.location.hash || (window.location.protocol === "file:" ? "#/home" : "#/splash");
  const pathWithQuery = hash.startsWith("#") ? hash.slice(1) : hash; // "/home" or "/insights?..."
  return normalizePath(pathWithQuery);
}

export function go(path) {
  const target = path.startsWith("/") ? path : "/" + path;
  const nextHash = "#" + target;
  if (window.location.hash === nextHash) {
    window.dispatchEvent(new Event("routechange"));
    return;
  }
  window.location.hash = nextHash;
}
