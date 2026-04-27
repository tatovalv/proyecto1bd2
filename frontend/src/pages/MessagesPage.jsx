import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

export default function MessagesPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "sent" ? "sent" : "inbox";
  const [messages, setMessages] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyMsg, setReplyMsg] = useState("");

  const endpoint = useMemo(
    () => (tab === "sent" ? "/api/messages/sent" : "/api/messages/inbox"),
    [tab]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(apiUrl(endpoint), {
          headers: { ...authHeaders() },
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setErr(data.error || "No autorizado.");
          return;
        }
        if (!cancelled) setMessages(data.messages || []);
      } catch {
        if (!cancelled) setErr("Error de red.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  function setTab(next) {
    setParams(next === "sent" ? { tab: "sent" } : {});
    setOpenId(null);
    setReplyBody("");
    setReplyMsg("");
  }

  async function sendReply(parentId) {
    setReplyMsg("");
    const body = replyBody.trim();
    if (!body) {
      setReplyMsg("Escribe una respuesta.");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/messages/${parentId}/reply`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReplyMsg(data.error || "No se pudo enviar.");
        return;
      }
      setReplyBody("");
      setOpenId(null);
      setReplyMsg("Respuesta enviada.");
      const r = await fetch(apiUrl(endpoint), {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setMessages(d.messages || []);
    } catch {
      setReplyMsg("Error de red.");
    }
  }

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Mensajes</h1>
        <Link
          to="/messages/compose"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Redactar
        </Link>
      </div>
      <div role="tablist" aria-label="Bandeja de mensajes" className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          role="tab"
          id="messages-tab-inbox"
          aria-selected={tab === "inbox"}
          aria-controls="messages-panel"
          tabIndex={tab === "inbox" ? 0 : -1}
          onClick={() => setTab("inbox")}
          className={`px-3 py-1.5 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            tab === "inbox" ? "bg-sky-600 text-white" : "text-slate-300 hover:text-white"
          }`}
        >
          Recibidos
        </button>
        <button
          type="button"
          role="tab"
          id="messages-tab-sent"
          aria-selected={tab === "sent"}
          aria-controls="messages-panel"
          tabIndex={tab === "sent" ? 0 : -1}
          onClick={() => setTab("sent")}
          className={`px-3 py-1.5 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            tab === "sent" ? "bg-sky-600 text-white" : "text-slate-300 hover:text-white"
          }`}
        >
          Enviados
        </button>
      </div>
      {replyMsg ? (
        <p className="text-sm text-emerald-300" role="status" aria-live="polite">
          {replyMsg}
        </p>
      ) : null}
      {loading ? <p className="text-slate-400">Cargando…</p> : null}
      {!loading && messages.length === 0 ? (
        <p className="text-slate-400">No hay mensajes.</p>
      ) : null}
      {!loading && messages.length > 0 ? (
        <ul id="messages-panel" role="tabpanel" aria-labelledby={tab === "sent" ? "messages-tab-sent" : "messages-tab-inbox"} className="space-y-2" aria-label={tab === "sent" ? "Mensajes enviados" : "Mensajes recibidos"}>
          {messages.map((m) => (
            <li key={String(m._id)} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
              <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                <span>{new Date(m.createdAt).toLocaleString()}</span>
                <span className="font-mono">
                  {tab === "inbox" ? `de ${m.fromUserId}` : `para ${m.toUserId}`}
                </span>
              </div>
              <p className="text-slate-400 text-xs">Tipo: {m.type}</p>
              <p className="text-white font-medium">{m.subject || "(sin asunto)"}</p>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{m.body}</p>
              {tab === "inbox" ? (
                <div className="pt-2 border-t border-slate-800">
                  {openId === String(m._id) ? (
                    <div className="space-y-2">
                      <label htmlFor={`reply-${m._id}`} className="sr-only">
                        Texto de respuesta al mensaje
                      </label>
                      <textarea
                        id={`reply-${m._id}`}
                        className="w-full min-h-[72px] rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Tu respuesta…"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => sendReply(String(m._id))}
                          className="rounded bg-sky-600 px-3 py-1 text-sm text-white hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                          aria-label="Enviar respuesta"
                        >
                          Enviar respuesta
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenId(null);
                            setReplyBody("");
                          }}
                          className="text-sm text-slate-300 border border-slate-600 rounded-md px-3 py-1 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenId(String(m._id));
                        setReplyBody("");
                      }}
                      className="text-sm text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
                      aria-label="Responder a este mensaje"
                    >
                      Responder
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
