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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-white">Bitácora (admin)</h1>
        <Link to="/dashboard" className="text-sm text-sky-400 hover:underline">
          Panel
        </Link>
      </div>
      <p className="text-slate-400 text-sm">Consulta actividad de acceso de un usuario específico.</p>
      <form onSubmit={onSearch} className="flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-[240px] space-y-1 block">
          <span className="text-xs text-slate-500">ID o username</span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono text-sm"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="UUID o username (ej. stickvalv6)"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
        >
          {loading ? "…" : "Consultar"}
        </button>
      </form>
      {err ? <p className="text-red-400 text-sm">{err}</p> : null}
      {events && events.length === 0 ? <p className="text-slate-500 text-sm">Sin eventos para ese usuario.</p> : null}
      {events && events.length > 0 ? (
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-slate-500">
              <tr>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">User-Agent</th>
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
