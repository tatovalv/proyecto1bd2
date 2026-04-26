import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-white">Nuevo curso</h1>
        <Link to="/courses/mine" className="text-sm text-sky-400 hover:underline">
          Volver
        </Link>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Código</span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="BD2-2026-01"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Nombre</span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Descripción</span>
          <textarea
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white min-h-[88px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm text-slate-400">Inicio</span>
            <input
              type="date"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-slate-400">Fin (opcional)</span>
            <input
              type="date"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">URL de imagen (opcional)</span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? "Creando…" : "Crear curso"}
        </button>
      </form>
    </div>
  );
}
