import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

function UserRow({ u }) {
  return (
    <li className="px-4 py-3 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 last:border-0">
      <div>
        <Link to={`/users/${u.id}`} className="text-white font-medium hover:text-sky-400">
          {u.fullName || u.username}
        </Link>
        <p className="text-slate-500 text-sm">@{u.username}</p>
      </div>
      <Link to={`/users/${u.id}`} className="text-sm text-sky-400 hover:underline">
        Perfil →
      </Link>
    </li>
  );
}

export default function PeoplePage() {
  const [tab, setTab] = useState("search");
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function runSearch(e) {
    e.preventDefault();
    setErr("");
    setResults([]);
    const term = q.trim();
    if (term.length < 2) {
      setErr("Escribe al menos 2 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/users/search?q=${encodeURIComponent(term)}`), {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "No se pudo buscar.");
        return;
      }
      setResults(data.users || []);
    } catch {
      setErr("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  const loadSocial = useCallback(async () => {
    setErr("");
    try {
      const [fRes, rRes] = await Promise.all([
        fetch(apiUrl("/api/users/friends"), { headers: { ...authHeaders() }, credentials: "include" }),
        fetch(apiUrl("/api/users/friend-requests"), { headers: { ...authHeaders() }, credentials: "include" }),
      ]);
      const fData = await fRes.json().catch(() => ({}));
      const rData = await rRes.json().catch(() => ({}));
      if (!fRes.ok || !rRes.ok) {
        setErr(fData.error || rData.error || "No se pudo cargar.");
        return;
      }
      setFriends(fData.friends || []);
      setIncoming(rData.incoming || []);
      setOutgoing(rData.outgoing || []);
    } catch {
      setErr("Error de red.");
    }
  }, []);

  useEffect(() => {
    if (tab === "social") void loadSocial();
  }, [tab, loadSocial]);

  async function respond(fromId, status) {
    setMsg("");
    try {
      const res = await fetch(apiUrl(`/api/users/${fromId}/friend`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "No se pudo actualizar.");
        return;
      }
      setMsg(status === "accept" ? "Solicitud aceptada." : "Solicitud rechazada.");
      await loadSocial();
    } catch {
      setMsg("Error de red.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Personas</h1>
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setTab("search")}
          className={`px-3 py-1.5 rounded-md text-sm ${tab === "search" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"}`}
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={() => setTab("social")}
          className={`px-3 py-1.5 rounded-md text-sm ${tab === "social" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"}`}
        >
          Amigos y solicitudes
        </button>
      </div>

      {err ? <p className="text-red-400 text-sm">{err}</p> : null}
      {msg ? <p className="text-emerald-400 text-sm">{msg}</p> : null}

      {tab === "search" ? (
        <div className="space-y-4">
          <form onSubmit={runSearch} className="flex flex-wrap gap-2">
            <input
              className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Usuario o nombre…"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {loading ? "Buscando…" : "Buscar"}
            </button>
          </form>
          {results.length === 0 ? (
            <p className="text-slate-500 text-sm">Sin resultados. Prueba con otro término.</p>
          ) : (
            <ul className="rounded-lg border border-slate-800 overflow-hidden divide-y divide-slate-800">
              {results.map((u) => (
                <UserRow key={u.id} u={u} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-200">Solicitudes recibidas</h2>
            {incoming.length === 0 ? (
              <p className="text-slate-500 text-sm">No tienes solicitudes pendientes.</p>
            ) : (
              <ul className="space-y-2">
                {incoming.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <Link to={`/users/${u.id}`} className="text-white font-medium hover:text-sky-400">
                        {u.fullName || u.username}
                      </Link>
                      <p className="text-slate-500 text-sm">@{u.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => respond(u.id, "accept")}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => respond(u.id, "reject")}
                        className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                      >
                        Rechazar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-200">Enviadas (pendientes)</h2>
            {outgoing.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay solicitudes enviadas pendientes.</p>
            ) : (
              <ul className="rounded-lg border border-slate-800 overflow-hidden">
                {outgoing.map((u) => (
                  <UserRow key={u.id} u={u} />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-200">Amigos</h2>
            {friends.length === 0 ? (
              <p className="text-slate-500 text-sm">Aún no tienes amigos en la red.</p>
            ) : (
              <ul className="rounded-lg border border-slate-800 overflow-hidden divide-y divide-slate-800">
                {friends.map((u) => (
                  <UserRow key={u.id} u={u} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
