import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../api/client.js";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>
        <p className="text-slate-400 text-sm">Indica tu nombre de usuario para enviarte un enlace de recuperación.</p>
        <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        {msg ? <p className="text-sm text-emerald-400">{msg}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Enviando…" : "Enviar enlace"}
        </button>
        </form>
      </div>
      <Link to="/login" className="text-sky-600 text-sm hover:underline">
        Volver al inicio de sesión
      </Link>
    </div>
  );
}
