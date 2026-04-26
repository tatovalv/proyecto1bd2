import { useState } from "react";
import { apiUrl } from "../api/client.js";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const p1 = String(fd.get("password") ?? "");
    const p2 = String(fd.get("password2") ?? "");
    if (p1 !== p2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    fd.delete("password2");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo completar el registro.");
        return;
      }
      const u = data.user;
      const extra = u.avatarUrl ? ` Avatar: ${u.avatarUrl}` : "";
      setSuccess(
        `¡Listo, ${u.fullName}! Tu usuario es «${u.username}».${extra} Los datos sensibles quedaron en el servidor (hash + sal).`
      );
      form.reset();
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-lg">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-bold text-white mb-2">Registro</h1>
      <p className="text-slate-400 text-sm mb-6">
        Completa tus datos para crear tu cuenta en la plataforma.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Usuario</label>
          <input
            name="username"
            required
            minLength={3}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Nombre completo</label>
          <input
            name="fullName"
            required
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Correo (opcional, para avisos)</label>
          <input
            type="email"
            name="email"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Rol de cuenta</label>
          <select
            name="role"
            defaultValue="student"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="student">Estudiante</option>
            <option value="teacher">Profesor</option>
          </select>
          <p className="mt-1 text-xs text-slate-400">
            La cuenta administrador solo puede asignarse por un administrador.
          </p>
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Fecha de nacimiento</label>
          <input
            type="date"
            name="dateOfBirth"
            required
            max={today}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Contraseña</label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Confirmar contraseña</label>
          <input
            type="password"
            name="password2"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Avatar (opcional)</label>
          <input
            type="file"
            name="avatar"
            accept="image/*"
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-100"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-emerald-400" role="status">
            {success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? "Registrando…" : "Registrarme"}
        </button>
      </form>
      </div>
    </div>
  );
}
