import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiUrl } from "../api/client.js";

const inputClass =
  "w-full rounded-md border border-slate-500 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const hasErr = Boolean(err);
  const hasMsg = Boolean(msg);
  const tokenMissing = !token;
  const fieldDescribedBy = [
    "reset-help",
    tokenMissing ? "reset-token-missing" : null,
    hasErr ? "reset-error" : null,
    hasMsg ? "reset-success" : null,
  ]
    .filter(Boolean)
    .join(" ");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (password !== password2) {
      setErr("Las contraseñas no coinciden.");
      return;
    }
    if (!token) {
      setErr("Falta el token en la URL.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "No se pudo restablecer.");
        return;
      }
      setMsg("Listo. Ya puedes iniciar sesión con la nueva contraseña.");
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
        aria-labelledby="reset-heading"
      >
        <h1 id="reset-heading" className="text-2xl font-bold text-white">
          Nueva contraseña
        </h1>
        <p id="reset-help" className="text-slate-200 text-sm">
          Elige una contraseña nueva (mínimo 8 caracteres) y confírmala.
        </p>
        {tokenMissing ? (
          <p id="reset-token-missing" className="text-sm text-amber-300" role="status" aria-live="polite">
            Abre el enlace que recibiste por correo; la dirección debe incluir el parámetro del token.
          </p>
        ) : null}
        <form
          onSubmit={onSubmit}
          className="space-y-3"
          aria-labelledby="reset-heading"
          aria-describedby="reset-help"
        >
          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-slate-100 mb-1">
              Nueva contraseña
            </label>
            <input
              id="reset-password"
              type="password"
              className={inputClass}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              aria-required="true"
              aria-invalid={hasErr}
              aria-describedby={fieldDescribedBy}
            />
          </div>
          <div>
            <label htmlFor="reset-password2" className="block text-sm font-medium text-slate-100 mb-1">
              Confirmar contraseña
            </label>
            <input
              id="reset-password2"
              type="password"
              className={inputClass}
              placeholder="Repite la contraseña"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              aria-required="true"
              aria-invalid={hasErr}
              aria-describedby={fieldDescribedBy}
            />
          </div>
          {err ? (
            <p id="reset-error" className="text-sm text-red-300" role="alert" aria-live="assertive">
              {err}
            </p>
          ) : null}
          {msg ? (
            <p id="reset-success" className="text-sm text-emerald-300" role="status" aria-live="polite">
              {msg}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading || tokenMissing}
            aria-busy={loading}
            aria-label={loading ? "Guardando contraseña, espere" : "Guardar nueva contraseña"}
            aria-describedby={hasErr ? "reset-error" : hasMsg ? "reset-success" : "reset-help"}
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {loading ? "Guardando…" : "Guardar"}
          </button>
        </form>
      </section>
      <Link
        to="/login"
        className="inline-block text-sky-300 text-sm underline underline-offset-2 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
        aria-label="Ir al inicio de sesión"
      >
        Ir al inicio de sesión
      </Link>
    </div>
  );
}
