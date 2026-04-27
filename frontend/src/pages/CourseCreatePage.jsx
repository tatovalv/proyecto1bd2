import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

const fieldClass =
  "w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900";

export default function CourseCreatePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const hasErr = Boolean(err);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/courses"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          description: description.trim(),
          startDate,
          endDate: endDate || undefined,
          photoUrl: photoUrl.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "No se pudo crear el curso.");
        return;
      }
      if (data.course?.id) navigate(`/courses/${data.course.id}`);
      else setErr("Respuesta inesperada del servidor.");
    } catch {
      setErr("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  const formDescribedBy = ["course-create-help", hasErr ? "course-create-error" : null].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 id="course-create-heading" className="text-2xl font-bold text-white">
          Nuevo curso
        </h1>
        <Link
          to="/courses/mine"
          className="text-sm text-sky-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
          aria-label="Volver a mis cursos"
        >
          Volver
        </Link>
      </div>
      <p id="course-create-help" className="text-slate-300 text-sm">
        Define código, nombre y fechas; la descripción y la imagen son opcionales.
      </p>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6"
        aria-labelledby="course-create-heading"
        aria-describedby="course-create-help"
      >
        {err ? (
          <p id="course-create-error" className="text-sm text-red-300" role="alert" aria-live="assertive">
            {err}
          </p>
        ) : null}
        <div>
          <label htmlFor="course-create-code" className="block text-sm font-medium text-slate-200 mb-1">
            Código
          </label>
          <input
            id="course-create-code"
            className={fieldClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="BD2-2026-01"
            aria-required="true"
            aria-invalid={hasErr}
            aria-describedby={formDescribedBy}
          />
        </div>
        <div>
          <label htmlFor="course-create-name" className="block text-sm font-medium text-slate-200 mb-1">
            Nombre
          </label>
          <input
            id="course-create-name"
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-required="true"
            aria-invalid={hasErr}
            aria-describedby={formDescribedBy}
          />
        </div>
        <div>
          <label htmlFor="course-create-desc" className="block text-sm font-medium text-slate-200 mb-1">
            Descripción
          </label>
          <textarea
            id="course-create-desc"
            className={`${fieldClass} min-h-[88px]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-describedby={formDescribedBy}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="course-create-start" className="block text-sm font-medium text-slate-200 mb-1">
              Inicio
            </label>
            <input
              id="course-create-start"
              type="date"
              className={fieldClass}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              aria-required="true"
              aria-describedby={formDescribedBy}
            />
          </div>
          <div>
            <label htmlFor="course-create-end" className="block text-sm font-medium text-slate-200 mb-1">
              Fin (opcional)
            </label>
            <input
              id="course-create-end"
              type="date"
              className={fieldClass}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-describedby={formDescribedBy}
            />
          </div>
        </div>
        <div>
          <label htmlFor="course-create-photo" className="block text-sm font-medium text-slate-200 mb-1">
            URL de imagen (opcional)
          </label>
          <input
            id="course-create-photo"
            className={fieldClass}
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            inputMode="url"
            autoComplete="url"
            aria-describedby={formDescribedBy}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          aria-label={loading ? "Creando curso, espere" : "Crear curso"}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {loading ? "Creando…" : "Crear curso"}
        </button>
      </form>
    </div>
  );
}
