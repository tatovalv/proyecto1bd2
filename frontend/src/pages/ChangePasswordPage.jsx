import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

const inputClass =
  "w-full rounded-md border border-slate-500 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const hasErr = Boolean(err);
  const hasMsg = Boolean(msg);
  const fieldDescribedBy = ["change-help", hasErr ? "change-error" : null, hasMsg ? "change-success" : null]
    .filter(Boolean)
    .join(" ");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (newPassword !== newPassword2) {
      setErr("Las nuevas contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/change-password"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "No se pudo cambiar.");
        return;
      }
      setMsg("Contraseña actualizada correctamente. Vuelve a iniciar sesión.");
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
        aria-labelledby="change-heading"
      >
        <h1 id="change-heading" className="text-2xl font-bold text-white">
          Cambiar contraseña
        </h1>
        <p id="change-help" className="text-slate-200 text-sm">
          Introduce tu contraseña actual y la nueva (mínimo 8 caracteres).
        </p>
        <form
          onSubmit={onSubmit}
          className="space-y-3"
          aria-labelledby="change-heading"
          aria-describedby="change-help"
        >
          <div>
            <label htmlFor="change-current" className="block text-sm font-medium text-slate-100 mb-1">
              Contraseña actual
            </label>
            <input
              id="change-current"
              type="password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              aria-required="true"
              aria-invalid={hasErr}
              aria-describedby={fieldDescribedBy}
            />
          </div>
          <div>
            <label htmlFor="change-new" className="block text-sm font-medium text-slate-100 mb-1">
              Nueva contraseña
            </label>
            <input
              id="change-new"
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              aria-required="true"
              aria-invalid={hasErr}
              aria-describedby={`change-new-hint ${fieldDescribedBy}`}
            />
            <p id="change-new-hint" className="mt-1 text-xs text-slate-300">
              Mínimo 8 caracteres.
            </p>
          </div>
          <div>
            <label htmlFor="change-new2" className="block text-sm font-medium text-slate-100 mb-1">
              Confirmar nueva contraseña
            </label>
            <input
              id="change-new2"
              type="password"
              className={inputClass}
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              aria-required="true"
              aria-invalid={hasErr}
              aria-describedby={fieldDescribedBy}
            />
          </div>
          {err ? (
            <p id="change-error" className="text-sm text-red-300" role="alert" aria-live="assertive">
              {err}
            </p>
          ) : null}
          {msg ? (
            <p id="change-success" className="text-sm text-emerald-300" role="status" aria-live="polite">
              {msg}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? "Actualizando contraseña, espere" : "Actualizar contraseña"}
            aria-describedby={hasErr ? "change-error" : hasMsg ? "change-success" : "change-help"}
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {loading ? "Guardando…" : "Actualizar"}
          </button>
        </form>
      </section>
      <Link
        to="/dashboard"
        className="inline-block text-sky-300 text-sm underline underline-offset-2 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
        aria-label="Volver al panel principal"
      >
        Volver al panel
      </Link>
    </div>
  );
}
