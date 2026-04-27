import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

function fmtTime(v) {
  if (v == null) return "—";
  try {
    if (typeof v === "string") return new Date(v).toLocaleString();
    if (v.toString) return v.toString();
    return String(v);
  } catch {
    return "—";
  }
}

export default function AdminActivityPage() {
  const [userId, setUserId] = useState("");
  const [events, setEvents] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSearch(e) {
    e.preventDefault();
    setErr("");
    setEvents(null);
    const id = userId.trim();
    if (!id) {
      setErr("Indica el ID o username del usuario.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/activity-log?userId=${encodeURIComponent(id)}`), {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "No se pudo leer la bitácora.");
        return;
      }
      setEvents(data.events || []);
    } catch {
      setErr("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  const hasErr = Boolean(err);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 id="admin-activity-heading" className="text-2xl font-bold text-white">
          Bitácora (admin)
        </h1>
        <Link
          to="/dashboard"
          className="text-sm text-sky-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
          aria-label="Ir al panel principal"
        >
          Panel
        </Link>
      </div>
      <p id="admin-activity-help" className="text-slate-300 text-sm">
        Consulta actividad de acceso de un usuario específico.
      </p>
      <form
        onSubmit={onSearch}
        className="flex flex-wrap gap-2 items-end"
        aria-labelledby="admin-activity-heading"
        aria-describedby="admin-activity-help"
      >
        <div className="flex-1 min-w-[240px] space-y-1">
          <label htmlFor="admin-activity-user" className="block text-xs font-medium text-slate-300">
            ID o username
          </label>
          <input
            id="admin-activity-user"
            className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="UUID o username (ej. stickvalv6)"
            autoComplete="username"
            aria-required="true"
            aria-invalid={hasErr}
            aria-describedby={hasErr ? "admin-activity-error admin-activity-help" : "admin-activity-help"}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          aria-label={loading ? "Consultando bitácora" : "Consultar bitácora de usuario"}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {loading ? "…" : "Consultar"}
        </button>
      </form>
      {err ? (
        <p id="admin-activity-error" className="text-red-300 text-sm" role="alert" aria-live="assertive">
          {err}
        </p>
      ) : null}
      {events && events.length === 0 ? <p className="text-slate-500 text-sm">Sin eventos para ese usuario.</p> : null}
      {events && events.length > 0 ? (
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-sm text-slate-300" aria-label="Eventos de actividad del usuario">
            <thead className="bg-slate-900/90 text-slate-400">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Hora
                </th>
                <th scope="col" className="px-3 py-2">
                  Tipo
                </th>
                <th scope="col" className="px-3 py-2">
                  IP
                </th>
                <th scope="col" className="px-3 py-2">
                  User-Agent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {events.map((ev, i) => (
                <tr key={i} className="bg-slate-950/40">
                  <td className="px-3 py-2 whitespace-nowrap">{fmtTime(ev.event_time)}</td>
                  <td className="px-3 py-2">{ev.event_type}</td>
                  <td className="px-3 py-2 font-mono text-xs">{ev.ip_address || "—"}</td>
                  <td className="px-3 py-2 text-xs max-w-xs truncate" title={ev.user_agent || ""}>
                    {ev.user_agent || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
