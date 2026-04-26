import { useCallback, useEffect, useRef, useState } from "react";
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

export default function CourseEvaluationDetailPage() {
  const { courseId, evalId } = useParams();
  const loadKeyRef = useRef(`${courseId}:${evalId}`);
  loadKeyRef.current = `${courseId}:${evalId}`;

  const [courseName, setCourseName] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [teacherResults, setTeacherResults] = useState(null);
  const [myResult, setMyResult] = useState(undefined);
  const [answers, setAnswers] = useState({});
  const [submitMsg, setSubmitMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const key = `${courseId}:${evalId}`;
    setErr("");
    setSubmitMsg("");
    setLoading(true);
    setEvaluation(null);
    setTeacherResults(null);
    setMyResult(undefined);
    setAnswers({});
    try {
      const [cRes, tRes, evRes] = await Promise.all([
        fetch(apiUrl(`/api/courses/${courseId}`), { headers: { ...authHeaders() }, credentials: "include" }),
        fetch(apiUrl("/api/courses"), { headers: { ...authHeaders() }, credentials: "include" }),
        fetch(apiUrl(`/api/courses/${courseId}/evaluations/${evalId}`), {
          headers: { ...authHeaders() },
          credentials: "include",
        }),
      ]);
      if (loadKeyRef.current !== key) return;

      const cData = await cRes.json().catch(() => ({}));
      const tData = await tRes.json().catch(() => ({}));
      const evData = await evRes.json().catch(() => ({}));

      if (!cRes.ok) {
        setErr(cData.error || "Curso no disponible.");
        return;
      }
      setCourseName(cData.course?.name || "");
      const teaching = (tData.courses || []).some((c) => c.id === courseId);
      setIsTeacher(teaching);

      if (!evRes.ok) {
        setErr(evData.error || "No se pudo cargar la evaluación.");
        return;
      }
      setEvaluation(evData.evaluation);

      if (loadKeyRef.current !== key) return;

      if (teaching) {
        const rRes = await fetch(apiUrl(`/api/courses/${courseId}/evaluations/${evalId}/results`), {
          headers: { ...authHeaders() },
          credentials: "include",
        });
        const rData = await rRes.json().catch(() => ({}));
        if (loadKeyRef.current !== key) return;
        if (rRes.ok) setTeacherResults(rData.results || []);
        else setTeacherResults([]);
      } else {
        const mrRes = await fetch(apiUrl(`/api/courses/${courseId}/evaluations/${evalId}/results`), {
          headers: { ...authHeaders() },
          credentials: "include",
        });
        const mrData = await mrRes.json().catch(() => ({}));
        if (loadKeyRef.current !== key) return;
        if (mrRes.ok) setMyResult(mrData.result);
        else if (mrRes.status === 404) setMyResult(null);
        else setMyResult(null);
      }
    } catch {
      if (loadKeyRef.current === key) setErr("Error de red.");
    } finally {
      if (loadKeyRef.current === key) setLoading(false);
    }
  }, [courseId, evalId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!evaluation) return;
    setSubmitMsg("");
    const qs = evaluation.questions || [];
    const missing = qs.some((q) => !answers[q.id]);
    if (missing) {
      setSubmitMsg("Responde todas las preguntas.");
      return;
    }
    const body = {
      answers: qs.map((q) => ({ questionId: q.id, selectedOptionId: answers[q.id] })),
    };
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/api/courses/${courseId}/evaluations/${evalId}/submit`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setSubmitMsg(data.error || "Ya enviaste esta evaluación.");
        await load();
        return;
      }
      if (!res.ok) {
        setSubmitMsg(data.error || "No se pudo enviar.");
        return;
      }
      setSubmitMsg(`Enviado. Calificación: ${typeof data.score === "number" ? data.score.toFixed(1) : data.score}%`);
      await load();
    } catch {
      setSubmitMsg("Error de red.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-slate-400">Cargando…</p>;

  if (err || !evaluation) {
    return (
      <div className="space-y-3">
        <p className="text-red-400">{err || "Evaluación no encontrada."}</p>
        <Link to={`/courses/${courseId}/evaluations`} className="text-sky-400 underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const now = new Date();
  const start = new Date(evaluation.startDate);
  const end = new Date(evaluation.endDate);
  const inWindow = now >= start && now <= end;
  const questions = evaluation.questions || [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">
          <Link to="/courses/mine" className="text-sky-400 hover:underline">
            Mis cursos
          </Link>
          <span className="mx-2">/</span>
          <Link to={`/courses/${courseId}`} className="text-sky-400 hover:underline">
            {courseName || "Curso"}
          </Link>
          <span className="mx-2">/</span>
          <Link to={`/courses/${courseId}/evaluations`} className="text-sky-400 hover:underline">
            Evaluaciones
          </Link>
        </p>
        <h1 className="text-2xl font-bold text-white mt-2">{evaluation.title}</h1>
        <p className="text-slate-500 text-sm mt-1">
          Ventana: {fmt(evaluation.startDate)} — {fmt(evaluation.endDate)}
        </p>
      </div>

      {isTeacher ? (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">Cuestionario (vista docente)</h2>
            <ol className="space-y-4 list-decimal list-inside marker:text-slate-500">
              {questions.map((q) => (
                <li key={q.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                  <p className="text-white font-medium">{q.text}</p>
                  <ul className="mt-2 space-y-1 pl-4 list-none">
                    {(q.options || []).map((o) => (
                      <li
                        key={o.id}
                        className={`text-sm rounded px-2 py-1 ${
                          o.isCorrect ? "bg-emerald-900/40 text-emerald-200" : "text-slate-400"
                        }`}
                      >
                        {o.text}
                        {o.isCorrect ? <span className="ml-2 text-xs text-emerald-400">(correcta)</span> : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">Entregas</h2>
            {!teacherResults || teacherResults.length === 0 ? (
              <p className="text-slate-500 text-sm">Aún no hay envíos.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Estudiante</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Enviado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {teacherResults.map((r) => (
                      <tr key={String(r._id)} className="bg-slate-950/40">
                        <td className="px-3 py-2 font-mono text-xs">{r.studentId}</td>
                        <td className="px-3 py-2">{typeof r.score === "number" ? `${r.score.toFixed(1)}%` : r.score}</td>
                        <td className="px-3 py-2">{fmt(r.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : myResult ? (
        <section className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-6 space-y-2">
          <h2 className="text-lg font-semibold text-emerald-200">Resultado</h2>
          <p className="text-2xl font-bold text-white">
            {typeof myResult.score === "number" ? `${myResult.score.toFixed(1)}%` : myResult.score}
          </p>
          <p className="text-slate-400 text-sm">Enviado: {fmt(myResult.submittedAt)}</p>
        </section>
      ) : !inWindow ? (
        <p className="text-slate-400">
          {now < start
            ? "Esta evaluación aún no está disponible."
            : "El periodo de esta evaluación ya cerró y no consta un envío tuyo."}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {submitMsg ? (
            <p className={submitMsg.startsWith("Enviado") ? "text-emerald-400" : "text-amber-400"}>{submitMsg}</p>
          ) : null}
          <ol className="space-y-6 list-decimal list-inside marker:text-slate-500">
            {questions.map((q) => (
              <li key={q.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <p className="text-white font-medium">{q.text}</p>
                <div className="space-y-2 pl-0 sm:pl-2">
                  {(q.options || []).map((o) => (
                    <label key={o.id} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === o.id}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                        className="accent-sky-500"
                      />
                      <span>{o.text}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <button
            type="submit"
            disabled={submitting || questions.length === 0}
            className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {submitting ? "Enviando…" : "Enviar respuestas"}
          </button>
        </form>
      )}
    </div>
  );
}
