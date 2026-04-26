/**
 * En desarrollo, Vite proxy envía /api al backend.
 * En producción (Docker), el navegador usa VITE_API_URL absoluto.
 */
const base = import.meta.env.VITE_API_URL?.trim() || "";

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base.replace(/\/$/, "")}${p}`;
}

const TOKEN_KEY = "tec_access_token";
const TOKEN_EVENT = "tec-auth-token-changed";

function notifyTokenChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

export function setAccessToken(token) {
  if (typeof sessionStorage === "undefined") return;
  if (!token) sessionStorage.removeItem(TOKEN_KEY);
  else sessionStorage.setItem(TOKEN_KEY, token);
  notifyTokenChange();
}

/**
 * Modo distributed: usa la cookie `remember_token` (credentials: include).
 * En modo json el backend responde 501; el caller puede ignorar el error.
 */
export async function refreshAccessToken() {
  const res = await fetch(apiUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || "No se pudo renovar la sesión." };
  }
  if (data.accessToken) setAccessToken(data.accessToken);
  return { ok: true, expiresIn: data.expiresIn };
}

export function authHeaders() {
  const t = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function hasAccessToken() {
  if (typeof sessionStorage === "undefined") return false;
  return Boolean(sessionStorage.getItem(TOKEN_KEY));
}

export function onAccessTokenChange(cb) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(TOKEN_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(TOKEN_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
