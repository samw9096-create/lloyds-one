// controls local storage of the app

const PREFIX = "lloyds_one_";

export async function get(key) {
  const value = localStorage.getItem(PREFIX + key);
  return value ? JSON.parse(value) : null;
}

export async function set(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  return true;
}

export async function del(key) {
  localStorage.removeItem(PREFIX + key);
  return true;
}
