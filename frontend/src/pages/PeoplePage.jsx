import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

function UserRow({ u }) {
  const name = u.fullName || u.username;
  return (
    <li className="px-4 py-3 bg-slate-900/50 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 last:border-0">
      <div>
        <Link
          to={`/users/${u.id}`}
          className="text-white font-medium hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
        >
          {name}
        </Link>
        <p className="text-slate-400 text-sm">@{u.username}</p>
      </div>
      <Link
        to={`/users/${u.id}`}
        className="text-sm text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
        aria-label={`Ver perfil de ${name}`}
      >
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
      <div
        role="tablist"
        aria-label="Secciones de personas"
        className="flex gap-2 border-b border-slate-800 pb-2"
      >
        <button
          type="button"
          role="tab"
          id="people-tab-search"
          aria-selected={tab === "search"}
          aria-controls="people-panel-search"
          tabIndex={tab === "search" ? 0 : -1}
          onClick={() => setTab("search")}
          className={`px-3 py-1.5 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            tab === "search" ? "bg-sky-600 text-white" : "text-slate-300 hover:text-white"
          }`}
        >
          Buscar
        </button>
        <button
          type="button"
          role="tab"
          id="people-tab-social"
          aria-selected={tab === "social"}
          aria-controls="people-panel-social"
          tabIndex={tab === "social" ? 0 : -1}
          onClick={() => setTab("social")}
          className={`px-3 py-1.5 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            tab === "social" ? "bg-sky-600 text-white" : "text-slate-300 hover:text-white"
          }`}
        >
          Amigos y solicitudes
        </button>
      </div>

      {err ? (
        <p className="text-red-300 text-sm" role="alert" aria-live="assertive">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="text-emerald-300 text-sm" role="status" aria-live="polite">
          {msg}
        </p>
      ) : null}

      {tab === "search" ? (
        <div id="people-panel-search" role="tabpanel" aria-labelledby="people-tab-search" className="space-y-4">
          <p id="people-search-help" className="text-slate-300 text-sm">
            Escribe al menos dos caracteres de usuario o nombre.
          </p>
          <form
            onSubmit={runSearch}
            className="flex flex-wrap gap-2 items-end"
            aria-describedby="people-search-help"
          >
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="people-search-q" className="sr-only">
                Buscar por usuario o nombre
              </label>
              <input
                id="people-search-q"
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Usuario o nombre…"
                autoComplete="off"
                aria-describedby="people-search-help"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? "Buscando personas" : "Buscar personas"}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {loading ? "Buscando…" : "Buscar"}
            </button>
          </form>
          {results.length === 0 ? (
            <p className="text-slate-500 text-sm">Sin resultados. Prueba con otro término.</p>
          ) : (
            <ul className="rounded-lg border border-slate-800 overflow-hidden divide-y divide-slate-800" aria-label="Resultados de búsqueda de personas">
              {results.map((u) => (
                <UserRow key={u.id} u={u} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div id="people-panel-social" role="tabpanel" aria-labelledby="people-tab-social" className="space-y-8">
          <section className="space-y-2" aria-labelledby="people-incoming-heading">
            <h2 id="people-incoming-heading" className="text-lg font-semibold text-slate-200">
              Solicitudes recibidas
            </h2>
            {incoming.length === 0 ? (
              <p className="text-slate-500 text-sm">No tienes solicitudes pendientes.</p>
            ) : (
              <ul className="space-y-2" aria-labelledby="people-incoming-heading">
                {incoming.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <Link
                        to={`/users/${u.id}`}
                        className="text-white font-medium hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
                      >
                        {u.fullName || u.username}
                      </Link>
                      <p className="text-slate-400 text-sm">@{u.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => respond(u.id, "accept")}
                        aria-label={`Aceptar solicitud de ${u.fullName || u.username}`}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => respond(u.id, "reject")}
                        aria-label={`Rechazar solicitud de ${u.fullName || u.username}`}
                        className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      >
                        Rechazar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2" aria-labelledby="people-outgoing-heading">
            <h2 id="people-outgoing-heading" className="text-lg font-semibold text-slate-200">
              Enviadas (pendientes)
            </h2>
            {outgoing.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay solicitudes enviadas pendientes.</p>
            ) : (
              <ul
                className="rounded-lg border border-slate-800 overflow-hidden divide-y divide-slate-800"
                aria-labelledby="people-outgoing-heading"
              >
                {outgoing.map((u) => (
                  <UserRow key={u.id} u={u} />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2" aria-labelledby="people-friends-heading">
            <h2 id="people-friends-heading" className="text-lg font-semibold text-slate-200">
              Amigos
            </h2>
            {friends.length === 0 ? (
              <p className="text-slate-500 text-sm">Aún no tienes amigos en la red.</p>
            ) : (
              <ul
                className="rounded-lg border border-slate-800 overflow-hidden divide-y divide-slate-800"
                aria-labelledby="people-friends-heading"
              >
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
