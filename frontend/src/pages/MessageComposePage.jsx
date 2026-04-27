import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

const fieldClass =
  "w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900";

export default function MessageComposePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [toUserId, setToUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const hasErr = Boolean(err);

  const toParam = (params.get("to") || "").trim();
  useEffect(() => {
    if (toParam) setToUserId(toParam);
  }, [toParam]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    const to = toUserId.trim();
    if (!to || !body.trim()) {
      setErr("Destinatario y mensaje son obligatorios.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          type: "direct",
          toUserId: to,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "No se pudo enviar.");
        return;
      }
      navigate("/messages?tab=sent");
    } catch {
      setErr("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  const formDescribedBy = ["compose-help", hasErr ? "compose-error" : null].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 id="compose-heading" className="text-2xl font-bold text-white">
          Nuevo mensaje
        </h1>
        <Link
          to="/messages"
          className="text-sm text-sky-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
          aria-label="Volver a la bandeja de mensajes"
        >
          Bandeja
        </Link>
      </div>
      <p id="compose-help" className="text-slate-300 text-sm">
        El identificador del destinatario es un UUID; puedes copiarlo desde su perfil público.
      </p>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6"
        aria-labelledby="compose-heading"
        aria-describedby="compose-help"
      >
        {err ? (
          <p id="compose-error" className="text-sm text-red-300" role="alert" aria-live="assertive">
            {err}
          </p>
        ) : null}
        <div>
          <label htmlFor="compose-to" className="block text-sm font-medium text-slate-200 mb-1">
            ID del destinatario
          </label>
          <input
            id="compose-to"
            className={`${fieldClass} font-mono text-sm`}
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            required
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            aria-required="true"
            aria-invalid={hasErr}
            aria-describedby={`compose-to-hint ${formDescribedBy}`}
          />
          <p id="compose-to-hint" className="mt-1 text-xs text-slate-400">
            Puedes copiarlo desde el perfil público de la persona.
          </p>
        </div>
        <div>
          <label htmlFor="compose-subject" className="block text-sm font-medium text-slate-200 mb-1">
            Asunto (opcional)
          </label>
          <input
            id="compose-subject"
            className={fieldClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-describedby={formDescribedBy}
          />
        </div>
        <div>
          <label htmlFor="compose-body" className="block text-sm font-medium text-slate-200 mb-1">
            Mensaje
          </label>
          <textarea
            id="compose-body"
            className={`${fieldClass} min-h-[120px]`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            aria-required="true"
            aria-invalid={hasErr}
            aria-describedby={formDescribedBy}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          aria-label={loading ? "Enviando mensaje, espere" : "Enviar mensaje"}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          {loading ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
