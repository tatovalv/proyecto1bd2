import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl, authHeaders, refreshAccessToken } from "../api/client.js";

async function fetchMe() {
  return fetch(apiUrl("/api/auth/me"), { headers: { ...authHeaders() }, credentials: "include" });
}

export default function DashboardPage() {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");
  const [refreshMsg, setRefreshMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let res = await fetchMe();
        let data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          const r2 = await refreshAccessToken();
          if (r2.ok) {
            res = await fetchMe();
            data = await res.json().catch(() => ({}));
          }
        }
        if (!res.ok) {
          if (!cancelled) setErr(data.error || "Inicia sesión primero.");
          return;
        }
        if (!cancelled) setMe(data.user);
      } catch {
        if (!cancelled) setErr("Error de red.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div className="space-y-4">
        <p className="text-red-300" role="alert">
          {err}
        </p>
        <Link
          to="/login"
          className="text-sky-300 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
        >
          Ir a login
        </Link>
      </div>
    );
  }

  if (!me) return <p className="text-slate-400">Cargando…</p>;

  async function onRefreshSession() {
    setRefreshMsg("");
    setRefreshing(true);
    try {
      const r = await refreshAccessToken();
      if (!r.ok) {
        setRefreshMsg(r.error || "No se pudo renovar.");
        return;
      }
      const res = await fetchMe();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefreshMsg(data.error || "Sesión inválida tras renovar.");
        return;
      }
      setMe(data.user);
      setRefreshMsg("Sesión renovada correctamente.");
    } catch {
      setRefreshMsg("Error de red.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Panel</h1>
      <p className="text-slate-300">
        Hola, <span className="text-white font-medium">{me.fullName}</span> ({me.username})
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onRefreshSession}
          disabled={refreshing}
          aria-busy={refreshing}
          aria-label={refreshing ? "Renovando token de sesión" : "Renovar sesión (token de acceso)"}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-slate-100 hover:bg-slate-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {refreshing ? "Renovando…" : "Renovar sesión"}
        </button>
        {refreshMsg ? (
          <span
            role="status"
            aria-live="polite"
            className={refreshMsg.includes("correctamente") ? "text-emerald-300" : "text-amber-300"}
          >
            {refreshMsg}
          </span>
        ) : null}
      </div>
      <ul className="list-disc list-inside text-slate-300 text-sm space-y-2 pl-1" aria-label="Accesos rápidos del panel">
        <li>
          <Link
            className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
            to="/courses/mine"
          >
            Mis cursos (docente / matriculados)
          </Link>
        </li>
        <li>
          <Link
            className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
            to="/courses/published"
          >
            Catálogo de cursos publicados
          </Link>
        </li>
        <li>
          <Link
            className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
            to="/people"
          >
            Buscar personas y amigos
          </Link>
        </li>
        <li>
          <Link
            className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
            to={`/users/${me.id}`}
          >
            Mi perfil público
          </Link>
        </li>
        <li>
          <Link
            className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
            to="/messages"
          >
            Mensajes (bandeja)
          </Link>
        </li>
        <li>
          <Link
            className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
            to="/messages/compose"
          >
            Redactar mensaje directo
          </Link>
        </li>
        <li>
          <Link
            className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded"
            to="/admin/activity"
          >
            Bitácora (solo admin)
          </Link>
        </li>
      </ul>
    </div>
  );
}
