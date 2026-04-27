import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl, setAccessToken } from "../api/client.js";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, rememberMe }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 423 && data.lockedUntil) {
          setError(
            `${data.error || "Cuenta bloqueada."} Podrás intentar de nuevo después del ${new Date(
              data.lockedUntil
            ).toLocaleString()}.`
          );
          return;
        }
        setError(data.error || "Credenciales inválidas");
        return;
      }

      if (data.accessToken) setAccessToken(data.accessToken);

      const at = data.loggedInAt || "";
      const u = data.user;
      const sus = data.suspicious
        ? " Se detectó una actividad inusual; revisa tu correo."
        : "";
      setSuccess(
        `Bienvenida/o, ${u.fullName}. ${at ? `Último ingreso: ${at}.` : ""}${sus}`
      );
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const fieldDescribedBy = [
    "login-help",
    hasError ? "login-error" : null,
    hasSuccess ? "login-success" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="max-w-md">
      <section
        className="rounded-xl border border-slate-600 bg-slate-900 p-6 shadow-lg"
        aria-labelledby="login-heading"
      >
        <h1 id="login-heading" className="text-2xl font-bold text-white mb-2">
          Iniciar sesión
        </h1>
        <p id="login-help" className="text-slate-200 text-sm mb-6">
          Ingresa con tu usuario y contraseña para acceder a tu panel.
        </p>
        <form
          onSubmit={onSubmit}
          className="space-y-4"
          aria-labelledby="login-heading"
          aria-describedby="login-help"
        >
          <div>
            <label htmlFor="login-username" className="block text-sm font-medium text-slate-100 mb-1">
              Usuario
            </label>
            <input
              id="login-username"
              className="w-full rounded-md border border-slate-500 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-required="true"
              aria-invalid={hasError}
              aria-describedby={fieldDescribedBy}
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-100 mb-1">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              className="w-full rounded-md border border-slate-500 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-required="true"
              aria-invalid={hasError}
              aria-describedby={fieldDescribedBy}
              required
            />
          </div>
          <div className="flex items-start gap-2">
            <input
              id="login-remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mt-1 rounded border-slate-500 text-sky-600 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-describedby="remember-help"
            />
            <label htmlFor="login-remember" className="text-sm text-slate-200 cursor-pointer leading-snug">
              Recordarme en este equipo
            </label>
          </div>
          <p id="remember-help" className="text-xs text-slate-300 -mt-2">
            Solo actívalo en un dispositivo de confianza.
          </p>
          {error ? (
            <p id="login-error" className="text-sm text-red-300" role="alert" aria-live="assertive">
              {error}
            </p>
          ) : null}
          {success ? (
            <p id="login-success" className="text-sm text-emerald-300" role="status" aria-live="polite">
              {success}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? "Iniciando sesión, espere" : "Iniciar sesión"}
            aria-describedby={hasError ? "login-error" : hasSuccess ? "login-success" : "login-help"}
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {loading ? "Enviando…" : "Entrar"}
          </button>
          <div className="pt-1 text-sm">
            <Link
              to="/forgot-password"
              className="text-sky-300 underline underline-offset-2 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
              aria-label="Ir a recuperación de contraseña"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
