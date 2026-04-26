import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiUrl } from "../api/client.js";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white">Nueva contraseña</h1>
        <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="password"
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          placeholder="Nueva contraseña (mín. 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <input
          type="password"
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          placeholder="Confirmar"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          minLength={8}
          required
        />
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        {msg ? <p className="text-sm text-emerald-400">{msg}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Guardando…" : "Guardar"}
        </button>
        </form>
      </div>
      <Link to="/login" className="text-sky-600 text-sm hover:underline">
        Ir al inicio de sesión
      </Link>
    </div>
  );
}
