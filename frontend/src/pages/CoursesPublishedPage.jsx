import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

export default function CoursesPublishedPage() {
  const [courses, setCourses] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/courses/published"), {
          headers: { ...authHeaders() },
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setErr(data.error || "No se pudo cargar la lista de cursos.");
          return;
        }
        if (!cancelled) setCourses(data.courses || []);
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
        <p className="text-red-400">{err}</p>
        <Link to="/login" className="text-sky-400 underline">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Cursos publicados</h1>
      {courses.length === 0 ? (
        <p className="text-slate-400">No hay cursos publicados aún.</p>
      ) : (
        <ul className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
          {courses.map((c) => (
            <li key={c.id} className="px-4 py-3 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link to={`/courses/${c.id}`} className="text-white font-medium hover:text-sky-400">
                  {c.name}
                </Link>
                <p className="text-slate-500 text-sm">{c.code}</p>
              </div>
              <Link to={`/courses/${c.id}`} className="text-sm text-sky-400 hover:underline">
                Ver curso →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
