import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

export default function MessageComposePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [toUserId, setToUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-white">Nuevo mensaje</h1>
        <Link to="/messages" className="text-sm text-sky-400 hover:underline">
          Bandeja
        </Link>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">ID del destinatario</span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono text-sm"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            required
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          <span className="text-xs text-slate-600">Puedes copiarlo desde el perfil público de la persona.</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Asunto (opcional)</span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Mensaje</span>
          <textarea
            className="w-full min-h-[120px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
