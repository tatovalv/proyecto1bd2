import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

function newId() {
  return crypto.randomUUID();
}

function emptyQuestion() {
  return {
    id: newId(),
    text: "",
    options: [
      { id: newId(), text: "", isCorrect: true },
      { id: newId(), text: "", isCorrect: false },
    ],
  };
}

function defaultEnd() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toLocal(d);
}

function toLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CourseEvaluationNewPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(toLocal(new Date()));
  const [endDate, setEndDate] = useState(defaultEnd());
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const hasErr = Boolean(err);
  const formDescribedBy = ["eval-new-help", hasErr ? "eval-new-error" : null].filter(Boolean).join(" ");

  function setQuestionText(i, text) {
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, text } : q)));
  }

  function setOptionText(qi, oi, text) {
    setQuestions((qs) =>
      qs.map((q, j) => {
        if (j !== qi) return q;
        const options = q.options.map((o, k) => (k === oi ? { ...o, text } : o));
        return { ...q, options };
      })
    );
  }

  function setCorrect(qi, oi) {
    setQuestions((qs) =>
      qs.map((q, j) => {
        if (j !== qi) return q;
        const options = q.options.map((o, k) => ({ ...o, isCorrect: k === oi }));
        return { ...q, options };
      })
    );
  }

  function addOption(qi) {
    setQuestions((qs) =>
      qs.map((q, j) =>
        j === qi ? { ...q, options: [...q.options, { id: newId(), text: "", isCorrect: false }] } : q
      )
    );
  }

  function removeOption(qi, oi) {
    setQuestions((qs) =>
      qs.map((q, j) => {
        if (j !== qi) return q;
        if (q.options.length <= 2) return q;
        const options = q.options.filter((_, k) => k !== oi);
        if (!options.some((o) => o.isCorrect)) options[0] = { ...options[0], isCorrect: true };
        return { ...q, options };
      })
    );
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  function removeQuestion(i) {
    setQuestions((qs) => (qs.length <= 1 ? qs : qs.filter((_, j) => j !== i)));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    for (const q of questions) {
      if (!q.text.trim()) {
        setErr("Cada pregunta necesita enunciado.");
        return;
      }
      const opts = q.options.filter((o) => o.text.trim());
      if (opts.length < 2) {
        setErr("Cada pregunta necesita al menos dos opciones con texto.");
        return;
      }
      if (!opts.some((o) => o.isCorrect)) {
        setErr("Marca la respuesta correcta en cada pregunta.");
        return;
      }
    }
    const cleanQuestions = questions.map((q) => ({
      id: q.id,
      text: q.text.trim(),
      options: q.options
        .filter((o) => o.text.trim())
        .map((o) => ({ id: o.id, text: o.text.trim(), isCorrect: Boolean(o.isCorrect) })),
    }));
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/courses/${courseId}/evaluations`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          startDate,
          endDate,
          questions: cleanQuestions,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "No se pudo crear.");
        return;
      }
      const id = data.evaluation?._id;
      if (id) navigate(`/courses/${courseId}/evaluations/${id}`);
      else navigate(`/courses/${courseId}/evaluations`);
    } catch {
      setErr("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <h1 id="eval-new-heading" className="text-2xl font-bold text-white">
          Nueva evaluación
        </h1>
        <Link
          to={`/courses/${courseId}/evaluations`}
          className="text-sm text-sky-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
          aria-label="Volver al listado de evaluaciones del curso"
        >
          Volver al listado
        </Link>
      </div>
      <p id="eval-new-help" className="text-slate-300 text-sm max-w-3xl">
        Define título, ventana de disponibilidad y al menos una pregunta con dos opciones y una respuesta correcta.
      </p>

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-lg border border-slate-800 bg-slate-900/40 p-6"
        aria-labelledby="eval-new-heading"
        aria-describedby="eval-new-help"
      >
        {err ? (
          <p id="eval-new-error" className="text-sm text-red-300" role="alert" aria-live="assertive">
            {err}
          </p>
        ) : null}
        <div>
          <label htmlFor="eval-new-title" className="block text-sm font-medium text-slate-200 mb-1">
            Título
          </label>
          <input
            id="eval-new-title"
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Parcial 1"
            aria-required="true"
            aria-invalid={hasErr}
            aria-describedby={formDescribedBy}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="eval-new-start" className="block text-sm font-medium text-slate-200 mb-1">
              Disponible desde
            </label>
            <input
              id="eval-new-start"
              type="datetime-local"
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              aria-required="true"
              aria-describedby={formDescribedBy}
            />
          </div>
          <div>
            <label htmlFor="eval-new-end" className="block text-sm font-medium text-slate-200 mb-1">
              Disponible hasta
            </label>
            <input
              id="eval-new-end"
              type="datetime-local"
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              aria-required="true"
              aria-describedby={formDescribedBy}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">Preguntas ({questions.length})</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="text-sm text-sky-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
              aria-label="Añadir otra pregunta al cuestionario"
            >
              + Pregunta
            </button>
          </div>

          {questions.map((q, qi) => (
            <div
              key={q.id}
              className="rounded-lg border border-slate-800 p-4 space-y-3 bg-slate-950/40"
              role="group"
              aria-labelledby={`eval-q-label-${q.id}`}
            >
              <div className="flex justify-between gap-2">
                <span id={`eval-q-label-${q.id}`} className="text-xs font-medium text-slate-300">
                  Pregunta {qi + 1}
                </span>
                {questions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qi)}
                    className="text-xs text-red-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
                    aria-label={`Quitar pregunta ${qi + 1}`}
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
              <textarea
                id={`eval-q-text-${q.id}`}
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-2 text-white text-sm min-h-[72px] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                value={q.text}
                onChange={(e) => setQuestionText(qi, e.target.value)}
                placeholder="Enunciado"
                aria-label={`Enunciado de la pregunta ${qi + 1}`}
                aria-describedby={formDescribedBy}
              />
              <div className="space-y-2">
                <p id={`eval-q-options-hint-${q.id}`} className="text-xs text-slate-400">
                  Opciones (marca la correcta)
                </p>
                {q.options.map((o, oi) => (
                  <div key={o.id} className="flex flex-wrap items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={o.isCorrect}
                      onChange={() => setCorrect(qi, oi)}
                      className="accent-sky-500 h-4 w-4 focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                      aria-label={`Marcar opción ${oi + 1} de la pregunta ${qi + 1} como correcta`}
                      aria-describedby={`eval-q-options-hint-${q.id}`}
                    />
                    <input
                      id={`eval-opt-${o.id}`}
                      className="flex-1 min-w-[160px] rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                      value={o.text}
                      onChange={(e) => setOptionText(qi, oi, e.target.value)}
                      placeholder={`Opción ${oi + 1}`}
                      aria-label={`Texto de la opción ${oi + 1} de la pregunta ${qi + 1}`}
                    />
                    {q.options.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => removeOption(qi, oi)}
                        className="text-xs text-slate-400 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded px-1"
                        aria-label={`Eliminar opción ${oi + 1} de la pregunta ${qi + 1}`}
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(qi)}
                  className="text-xs text-sky-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
                  aria-label={`Añadir otra opción a la pregunta ${qi + 1}`}
                >
                  + Opción
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          aria-label={loading ? "Guardando evaluación, espere" : "Crear evaluación"}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {loading ? "Guardando…" : "Crear evaluación"}
        </button>
      </form>
    </div>
  );
}
