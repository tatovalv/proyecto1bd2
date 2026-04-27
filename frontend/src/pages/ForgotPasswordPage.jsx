import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../api/client.js";

const inputClass =
  "w-full rounded-md border border-slate-500 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const hasErr = Boolean(err);
  const hasMsg = Boolean(msg);
  const fieldDescribedBy = ["forgot-help", hasErr ? "forgot-error" : null, hasMsg ? "forgot-success" : null]
    .filter(Boolean)
    .join(" ");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "No se pudo procesar.");
        return;
      }
      setMsg(data.message || "Si el usuario existe y tiene correo, recibirás un enlace.");
    } catch {
      setErr("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <section
        className="rounded-xl border border-slate-600 bg-slate-900 p-6 space-y-4 shadow-lg"
        aria-labelledby="forgot-heading"
      >
        <h1 id="forgot-heading" className="text-2xl font-bold text-white">
          Recuperar contraseña
        </h1>
        <p id="forgot-help" className="text-slate-200 text-sm">
          Indica tu nombre de usuario para enviarte un enlace de recuperación.
        </p>
        <form
          onSubmit={onSubmit}
          className="space-y-3"
          aria-labelledby="forgot-heading"
          aria-describedby="forgot-help"
        >
          <div>
            <label htmlFor="forgot-username" className="block text-sm font-medium text-slate-100 mb-1">
              Usuario
            </label>
            <input
              id="forgot-username"
              className={inputClass}
              autoComplete="username"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-required="true"
              aria-invalid={hasErr}
              aria-describedby={fieldDescribedBy}
              required
            />
          </div>
          {err ? (
            <p id="forgot-error" className="text-sm text-red-300" role="alert" aria-live="assertive">
              {err}
            </p>
          ) : null}
          {msg ? (
            <p id="forgot-success" className="text-sm text-emerald-300" role="status" aria-live="polite">
              {msg}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? "Enviando enlace, espere" : "Enviar enlace de recuperación"}
            aria-describedby={hasErr ? "forgot-error" : hasMsg ? "forgot-success" : "forgot-help"}
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {loading ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      </section>
      <Link
        to="/login"
        className="inline-block text-sky-300 text-sm underline underline-offset-2 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
        aria-label="Volver al inicio de sesión"
      >
        Volver al inicio de sesión
      </Link>
    </div>
  );
}
