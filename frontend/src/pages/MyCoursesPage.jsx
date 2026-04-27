import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

function getCourseLifecycle(course) {
  const now = Date.now();
  const start = course.startDate ? new Date(course.startDate).getTime() : Number.NaN;
  const end = course.endDate ? new Date(course.endDate).getTime() : Number.NaN;
  if (!Number.isNaN(end) && now > end) return { label: "Terminado", tone: "text-slate-400" };
  if (!Number.isNaN(start) && now < start) return { label: "Por iniciar", tone: "text-cyan-400" };
  return { label: "Activo", tone: "text-emerald-400" };
}

export default function MyCoursesPage() {
  const [teaching, setTeaching] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tRes, eRes] = await Promise.all([
          fetch(apiUrl("/api/courses"), { headers: { ...authHeaders() }, credentials: "include" }),
          fetch(apiUrl("/api/courses/enrolled"), { headers: { ...authHeaders() }, credentials: "include" }),
        ]);
        const tData = await tRes.json().catch(() => ({}));
        const eData = await eRes.json().catch(() => ({}));
        if (!tRes.ok || !eRes.ok) {
          if (!cancelled) setErr(tData.error || eData.error || "No autorizado.");
          return;
        }
        if (!cancelled) {
          setTeaching(tData.courses || []);
          setEnrolled(eData.courses || []);
        }
      } catch {
        if (!cancelled) setErr("Error de red.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div className="space-y-3">
        <p className="text-red-300" role="alert">
          {err}
        </p>
        <Link
          to="/login"
          className="text-sky-300 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Mis cursos</h1>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Acciones de cursos">
          <Link
            to="/courses/new"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Nuevo curso
          </Link>
          <Link
            to="/courses/published"
            className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Catálogo publicado
          </Link>
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="my-courses-teaching-heading">
        <h2 id="my-courses-teaching-heading" className="text-lg font-semibold text-slate-200">
          Como docente
        </h2>
        {teaching.length === 0 ? (
          <p className="text-slate-500 text-sm">Aún no creas cursos. Usa «Nuevo curso».</p>
        ) : (
          <ul
            className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden"
            aria-labelledby="my-courses-teaching-heading"
          >
            {teaching.map((c) => (
              <li key={c.id} className="px-4 py-3 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link
                    to={`/courses/${c.id}`}
                    className="text-white font-medium hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
                  >
                    {c.name}
                  </Link>
                  <p className="text-slate-500 text-sm">
                    {c.code}
                    {c.published ? (
                      <span className="ml-2 text-emerald-500">· Publicado</span>
                    ) : (
                      <span className="ml-2 text-amber-500">· Borrador</span>
                    )}
                    {c.published ? (
                      <span className={`ml-2 ${getCourseLifecycle(c).tone}`}>· {getCourseLifecycle(c).label}</span>
                    ) : null}
                  </p>
                </div>
                <Link
                  to={`/courses/${c.id}`}
                  className="text-sm text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
                  aria-label={`Gestionar curso ${c.name}`}
                >
                  Gestionar →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="my-courses-enrolled-heading">
        <h2 id="my-courses-enrolled-heading" className="text-lg font-semibold text-slate-200">
          Matriculado
        </h2>
        {enrolled.length === 0 ? (
          <p className="text-slate-500 text-sm">No estás matriculado en ningún curso.</p>
        ) : (
          <ul
            className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden"
            aria-labelledby="my-courses-enrolled-heading"
          >
            {enrolled.map((c) => (
              <li key={c.id} className="px-4 py-3 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link
                    to={`/courses/${c.id}`}
                    className="text-white font-medium hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
                  >
                    {c.name}
                  </Link>
                  <p className="text-slate-500 text-sm">{c.code}</p>
                </div>
                <Link
                  to={`/courses/${c.id}`}
                  className="text-sm text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
                  aria-label={`Abrir curso ${c.name}`}
                >
                  Abrir →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
