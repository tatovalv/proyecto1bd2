import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

export default function CourseConsultationsPage() {
  const { courseId } = useParams();
  const [courseName, setCourseName] = useState("");
  const [messages, setMessages] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const [cRes, mRes] = await Promise.all([
          fetch(apiUrl(`/api/courses/${courseId}`), { headers: { ...authHeaders() }, credentials: "include" }),
          fetch(apiUrl(`/api/messages/course/${courseId}`), {
            headers: { ...authHeaders() },
            credentials: "include",
          }),
        ]);
        const cData = await cRes.json().catch(() => ({}));
        const mData = await mRes.json().catch(() => ({}));
        if (!cancelled) {
          if (cRes.ok) setCourseName(cData.course?.name || "");
          if (!mRes.ok) {
            setErr(mData.error || "No autorizado (solo docente del curso).");
            setMessages([]);
            return;
          }
          setErr("");
          setMessages(mData.messages || []);
        }
      } catch {
        if (!cancelled) setErr("Error de red.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) return <p className="text-slate-400">Cargando…</p>;

  if (err && messages.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-red-400">{err}</p>
        <Link to={`/courses/${courseId}`} className="text-sky-400 underline">
          Volver al curso
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        <Link to="/courses/mine" className="text-sky-400 hover:underline">
          Mis cursos
        </Link>
        <span className="mx-2">/</span>
        <Link to={`/courses/${courseId}`} className="text-sky-400 hover:underline">
          {courseName || "Curso"}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">Consultas</span>
      </p>
      <h1 className="text-2xl font-bold text-white">Consultas del curso</h1>
      <p className="text-slate-500 text-sm">
        Mensajes tipo <code className="text-slate-400">course_query</code> enviados por estudiantes matriculados.
      </p>
      {messages.length === 0 ? (
        <p className="text-slate-400">No hay consultas aún.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={String(m._id)} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                <span>{new Date(m.createdAt).toLocaleString()}</span>
                <span className="font-mono">de {m.fromUserId}</span>
              </div>
              <p className="text-white font-medium">{m.subject || "(sin asunto)"}</p>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{m.body}</p>
              <Link
                to="/messages"
                className="inline-block text-sm text-sky-400 hover:underline"
              >
                Responder desde bandeja →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
