import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

export default function UserProfilePage() {
  const { userId } = useParams();
  const [me, setMe] = useState(null);
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friendCourses, setFriendCourses] = useState(null);
  const [err, setErr] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const isSelf = useMemo(() => me && user && me.id === user.id, [me, user]);
  const isFriend = useMemo(() => friends.some((f) => f.id === userId), [friends, userId]);
  const hasIncomingFromThem = useMemo(() => incoming.some((u) => u.id === userId), [incoming, userId]);
  const hasOutgoingToThem = useMemo(() => outgoing.some((u) => u.id === userId), [outgoing, userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr("");
      setLoading(true);
      setFriendCourses(null);
      try {
        const [meRes, profRes, frRes, reqRes] = await Promise.all([
          fetch(apiUrl("/api/auth/me"), { headers: { ...authHeaders() }, credentials: "include" }),
          fetch(apiUrl(`/api/users/${userId}`), { headers: { ...authHeaders() }, credentials: "include" }),
          fetch(apiUrl("/api/users/friends"), { headers: { ...authHeaders() }, credentials: "include" }),
          fetch(apiUrl("/api/users/friend-requests"), { headers: { ...authHeaders() }, credentials: "include" }),
        ]);
        const meData = await meRes.json().catch(() => ({}));
        const pData = await profRes.json().catch(() => ({}));
        const frData = await frRes.json().catch(() => ({}));
        const rqData = await reqRes.json().catch(() => ({}));
        if (!cancelled) {
          if (!meRes.ok) {
            setErr(meData.error || "Inicia sesión.");
            setLoading(false);
            return;
          }
          setMe(meData.user);
          if (!profRes.ok) {
            setErr(pData.error || "Usuario no encontrado.");
            setUser(null);
            setLoading(false);
            return;
          }
          setUser(pData.user);
          setFriends(frData.friends || []);
          setIncoming(rqData.incoming || []);
          setOutgoing(rqData.outgoing || []);
        }

        if (!profRes.ok || cancelled) {
          setLoading(false);
          return;
        }

        const friendIds = new Set((frData.friends || []).map((f) => f.id));
        if (friendIds.has(userId)) {
          const coursesRes = await fetch(apiUrl(`/api/users/${userId}/courses`), {
            headers: { ...authHeaders() },
            credentials: "include",
          });
          const cData = await coursesRes.json().catch(() => ({}));
          if (!cancelled) {
            if (coursesRes.ok) setFriendCourses(cData.courses || []);
            else setFriendCourses([]);
          }
        } else if (!cancelled) {
          setFriendCourses(null);
        }
      } catch {
        if (!cancelled) setErr("Error de red.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function sendFriendRequest() {
    setActionMsg("");
    try {
      const res = await fetch(apiUrl(`/api/users/${userId}/friend`), {
        method: "POST",
        headers: { ...authHeaders() },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg(data.error || "No se pudo enviar.");
        return;
      }
      setActionMsg("Solicitud enviada.");
      const rq = await fetch(apiUrl("/api/users/friend-requests"), {
        headers: { ...authHeaders() },
        credentials: "include",
      }).then((r) => r.json());
      setOutgoing(rq.outgoing || []);
    } catch {
      setActionMsg("Error de red.");
    }
  }

  async function respond(status) {
    setActionMsg("");
    try {
      const res = await fetch(apiUrl(`/api/users/${userId}/friend`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg(data.error || "No se pudo actualizar.");
        return;
      }
      setActionMsg(status === "accept" ? "Ahora son amigos." : "Solicitud rechazada.");
      const [fr, rq] = await Promise.all([
        fetch(apiUrl("/api/users/friends"), { headers: { ...authHeaders() }, credentials: "include" }).then((r) =>
          r.json()
        ),
        fetch(apiUrl("/api/users/friend-requests"), { headers: { ...authHeaders() }, credentials: "include" }).then(
          (r) => r.json()
        ),
      ]);
      setFriends(fr.friends || []);
      setIncoming(rq.incoming || []);
      setOutgoing(rq.outgoing || []);
      if (status === "accept") {
        const cr = await fetch(apiUrl(`/api/users/${userId}/courses`), {
          headers: { ...authHeaders() },
          credentials: "include",
        }).then((r) => r.json());
        setFriendCourses(cr.courses || []);
      }
    } catch {
      setActionMsg("Error de red.");
    }
  }

  if (loading) return <p className="text-slate-400">Cargando…</p>;

  if (err && !user) {
    return (
      <div className="space-y-3">
        <p className="text-red-300" role="alert">
          {err}
        </p>
        <Link
          to="/people"
          className="text-sky-300 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
        >
          Volver a personas
        </Link>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        <Link
          to="/people"
          className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
        >
          Personas
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">@{user.username}</span>
      </p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{user.fullName || user.username}</h1>
          <p className="text-slate-400">@{user.username}</p>
          {user.birthDate != null && user.birthDate !== "" ? (
            <p className="text-slate-500 text-sm mt-2">Nacimiento: {String(user.birthDate)}</p>
          ) : null}
        </div>
        {!isSelf ? (
          <div className="flex flex-col items-end gap-2">
            {actionMsg ? (
              <p className="text-sm text-emerald-300" role="status" aria-live="polite">
                {actionMsg}
              </p>
            ) : null}
            {isFriend ? (
              <Link
                to={`/messages/compose?to=${encodeURIComponent(user.id)}`}
                className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Enviar mensaje
              </Link>
            ) : null}
            {hasIncomingFromThem ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => respond("accept")}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Aceptar amistad
                </button>
                <button
                  type="button"
                  onClick={() => respond("reject")}
                  className="rounded-md border border-slate-500 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Rechazar
                </button>
              </div>
            ) : null}
            {!isFriend && !hasIncomingFromThem && !hasOutgoingToThem ? (
              <button
                type="button"
                onClick={sendFriendRequest}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Solicitar amistad
              </button>
            ) : null}
            {hasOutgoingToThem && !isFriend ? (
              <p className="text-slate-500 text-sm">Solicitud enviada (pendiente).</p>
            ) : null}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Este es tu perfil público.</p>
        )}
      </div>

      {isFriend && Array.isArray(friendCourses) ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2" aria-labelledby="profile-friend-courses-heading">
          <h2 id="profile-friend-courses-heading" className="text-lg font-semibold text-slate-200">
            Cursos de tu amigo
          </h2>
          {friendCourses.length === 0 ? (
            <p className="text-slate-500 text-sm">No tiene cursos visibles.</p>
          ) : (
            <ul
              className="divide-y divide-slate-800 border border-slate-800 rounded-md overflow-hidden"
              aria-labelledby="profile-friend-courses-heading"
            >
              {friendCourses.map((c) => (
                <li key={c.id} className="px-3 py-2 bg-slate-950/40 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-white font-medium">{c.name}</span>
                  <span className="text-slate-400 text-sm">{c.code}</span>
                  {c.published ? (
                    <Link
                      to={`/courses/${c.id}`}
                      className="text-sky-300 text-sm hover:underline underline-offset-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded"
                      aria-label={`Ver curso ${c.name}`}
                    >
                      Ver
                    </Link>
                  ) : (
                    <span className="text-amber-400 text-xs shrink-0">Borrador</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!isFriend && friendCourses === null && !hasIncomingFromThem ? (
        <p className="text-slate-500 text-sm">Los cursos de este usuario solo son visibles si son tu amigo.</p>
      ) : null}
    </div>
  );
}
