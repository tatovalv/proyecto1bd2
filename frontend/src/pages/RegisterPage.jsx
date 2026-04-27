import { useState } from "react";
import { apiUrl } from "../api/client.js";

const inputClass =
  "w-full rounded-md border border-slate-500 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900";

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
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success);
  const fieldDescribedBy = ["register-help", hasError ? "register-error" : null, hasSuccess ? "register-success" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="max-w-lg">
      <section
        className="rounded-xl border border-slate-600 bg-slate-900 p-6 shadow-lg"
        aria-labelledby="register-heading"
      >
        <h1 id="register-heading" className="text-2xl font-bold text-white mb-2">
          Registro
        </h1>
        <p id="register-help" className="text-slate-200 text-sm mb-6">
          Completa tus datos para crear tu cuenta en la plataforma.
        </p>
        <form
          onSubmit={onSubmit}
          className="space-y-4"
          aria-labelledby="register-heading"
          aria-describedby="register-help"
        >
          <div>
            <label htmlFor="register-username" className="block text-sm font-medium text-slate-100 mb-1">
              Usuario
            </label>
            <input
              id="register-username"
              name="username"
              required
              minLength={3}
              autoComplete="username"
              spellCheck={false}
              className={inputClass}
              aria-required="true"
              aria-invalid={hasError}
              aria-describedby={fieldDescribedBy}
            />
          </div>
          <div>
            <label htmlFor="register-fullname" className="block text-sm font-medium text-slate-100 mb-1">
              Nombre completo
            </label>
            <input
              id="register-fullname"
              name="fullName"
              required
              autoComplete="name"
              className={inputClass}
              aria-required="true"
              aria-invalid={hasError}
              aria-describedby={fieldDescribedBy}
            />
          </div>
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-slate-100 mb-1">
              Correo (opcional, para avisos)
            </label>
            <input
              id="register-email"
              type="email"
              name="email"
              autoComplete="email"
              className={inputClass}
              aria-invalid={hasError}
              aria-describedby={`register-email-hint ${fieldDescribedBy}`}
            />
            <p id="register-email-hint" className="mt-1 text-xs text-slate-300">
              Opcional; útil para recuperación de contraseña y notificaciones.
            </p>
          </div>
          <div>
            <label htmlFor="register-role" className="block text-sm font-medium text-slate-100 mb-1">
              Rol de cuenta
            </label>
            <select
              id="register-role"
              name="role"
              defaultValue="student"
              className={inputClass}
              aria-required="true"
              aria-describedby={`register-role-help ${fieldDescribedBy}`}
            >
              <option value="student">Estudiante</option>
              <option value="teacher">Profesor</option>
            </select>
            <p id="register-role-help" className="mt-1 text-xs text-slate-300">
              La cuenta administrador solo puede asignarse por un administrador.
            </p>
          </div>
          <div>
            <label htmlFor="register-dob" className="block text-sm font-medium text-slate-100 mb-1">
              Fecha de nacimiento
            </label>
            <input
              id="register-dob"
              type="date"
              name="dateOfBirth"
              required
              max={today}
              className={inputClass}
              aria-required="true"
              aria-invalid={hasError}
              aria-describedby={fieldDescribedBy}
            />
          </div>
          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-slate-100 mb-1">
              Contraseña
            </label>
            <input
              id="register-password"
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              aria-required="true"
              aria-invalid={hasError}
              aria-describedby={`register-password-hint ${fieldDescribedBy}`}
            />
            <p id="register-password-hint" className="mt-1 text-xs text-slate-300">
              Mínimo 8 caracteres.
            </p>
          </div>
          <div>
            <label htmlFor="register-password2" className="block text-sm font-medium text-slate-100 mb-1">
              Confirmar contraseña
            </label>
            <input
              id="register-password2"
              type="password"
              name="password2"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              aria-required="true"
              aria-invalid={hasError}
              aria-describedby={fieldDescribedBy}
            />
          </div>
          <div>
            <label htmlFor="register-avatar" className="block text-sm font-medium text-slate-100 mb-1">
              Avatar (opcional)
            </label>
            <input
              id="register-avatar"
              type="file"
              name="avatar"
              accept="image/*"
              className="block w-full text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-100 file:focus-within:ring-2 file:focus-within:ring-sky-400"
              aria-describedby={`register-avatar-hint ${fieldDescribedBy}`}
            />
            <p id="register-avatar-hint" className="mt-1 text-xs text-slate-300">
              Imagen de perfil; formato imagen.
            </p>
          </div>
          {error ? (
            <p id="register-error" className="text-sm text-red-300" role="alert" aria-live="assertive">
              {error}
            </p>
          ) : null}
          {success ? (
            <p id="register-success" className="text-sm text-emerald-300" role="status" aria-live="polite">
              {success}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            aria-label={loading ? "Registrando cuenta, espere" : "Registrarme"}
            aria-describedby={hasError ? "register-error" : hasSuccess ? "register-success" : "register-help"}
            className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {loading ? "Registrando…" : "Registrarme"}
          </button>
        </form>
      </section>
    </div>
  );
}
