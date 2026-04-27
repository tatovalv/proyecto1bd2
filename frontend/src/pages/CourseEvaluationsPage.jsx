import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

function fmt(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

export default function CourseEvaluationsPage() {
  const { courseId } = useParams();
  const [list, setList] = useState([]);
  const [courseName, setCourseName] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, tRes, eRes] = await Promise.all([
          fetch(apiUrl(`/api/courses/${courseId}`), { headers: { ...authHeaders() }, credentials: "include" }),
          fetch(apiUrl("/api/courses"), { headers: { ...authHeaders() }, credentials: "include" }),
          fetch(apiUrl(`/api/courses/${courseId}/evaluations`), { headers: { ...authHeaders() }, credentials: "include" }),
        ]);
        const cData = await cRes.json().catch(() => ({}));
        const tData = await tRes.json().catch(() => ({}));
        const eData = await eRes.json().catch(() => ({}));
        if (!cancelled) {
          if (!cRes.ok) {
            setErr(cData.error || "No se pudo cargar el curso.");
            return;
          }
          setCourseName(cData.course?.name || "");
          const teaching = (tData.courses || []).some((c) => c.id === courseId);
          setIsTeacher(teaching);
          if (!eRes.ok) {
            setErr(eData.error || "No se pudo listar evaluaciones.");
            setList([]);
            return;
          }
          setList(eData.evaluations || []);
        }
      } catch {
        if (!cancelled) setErr("Error de red.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const sorted = useMemo(
    () => [...list].sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0)),
    [list]
  );

  if (err) {
    return (
      <div className="space-y-3">
        <p className="text-red-300" role="alert">
          {err}
        </p>
        <Link
          to={`/courses/${courseId}`}
          className="text-sky-300 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
        >
          Volver al curso
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            <Link
              to="/courses/mine"
              className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
            >
              Mis cursos
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <Link
              to={`/courses/${courseId}`}
              className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
            >
              {courseName || "Curso"}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-400">Evaluaciones</span>
          </p>
          <h1 className="text-2xl font-bold text-white mt-1">Evaluaciones</h1>
        </div>
        {isTeacher ? (
          <Link
            to={`/courses/${courseId}/evaluations/new`}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Nueva evaluación
          </Link>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="text-slate-500">No hay evaluaciones en este curso.</p>
      ) : (
        <ul
          className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden"
          aria-label={`Evaluaciones del curso ${courseName || ""}`}
        >
          {sorted.map((ev) => (
            <li key={ev._id} className="px-4 py-3 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link
                  to={`/courses/${courseId}/evaluations/${ev._id}`}
                  className="text-white font-medium hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
                >
                  {ev.title}
                </Link>
                <p className="text-slate-500 text-sm">
                  {fmt(ev.startDate)} — {fmt(ev.endDate)}
                  {isTeacher && Array.isArray(ev.questions) ? (
                    <span className="ml-2 text-slate-600">· {ev.questions.length} preguntas</span>
                  ) : null}
                </p>
              </div>
              <Link
                to={`/courses/${courseId}/evaluations/${ev._id}`}
                className="text-sm text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
                aria-label={`Abrir evaluación ${ev.title}`}
              >
                Abrir →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
