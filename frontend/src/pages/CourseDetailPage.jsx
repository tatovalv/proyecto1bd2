import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiUrl, authHeaders } from "../api/client.js";

/** Árbol de secciones por `parentId` (hijos anidados en UI). */
function buildSectionTree(flat) {
  const list = flat || [];
  const byId = new Map();
  for (const s of list) {
    byId.set(s.id, { ...s, children: [] });
  }
  const roots = [];
  for (const s of list) {
    const node = byId.get(s.id);
    const pid = s.parentId;
    if (pid && byId.has(pid)) {
      byId.get(pid).children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sortCh(node) {
    node.children.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title));
    for (const ch of node.children) sortCh(ch);
  }
  roots.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title));
  for (const r of roots) sortCh(r);
  return roots;
}

function ContentBlock({ item }) {
  const t = item.type;
  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
      <span className="text-xs uppercase tracking-wide text-slate-500">{t}</span>
      {t === "text" && item.data ? <p className="mt-2 whitespace-pre-wrap text-slate-200">{item.data}</p> : null}
      {(t === "video" || t === "image" || t === "document") && item.url ? (
        <p className="mt-2">
          {t === "video" ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
            >
              {item.title || "Abrir enlace"}
            </a>
          ) : t === "image" ? (
            <span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
              >
                {item.title || "Imagen"}
              </a>
              {item.caption ? <span className="block text-slate-500 mt-1">{item.caption}</span> : null}
            </span>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
            >
              {item.filename || item.title || "Documento"}
            </a>
          )}
        </p>
      ) : null}
    </div>
  );
}

function SectionBranch({ node, isTeacher, busy, onDelete, onAddContent }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-white font-medium">{node.title}</h3>
        {isTeacher ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(node.id)}
            aria-label={`Eliminar sección ${node.title}`}
            className="text-xs text-red-300 hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded px-1"
          >
            Eliminar sección
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {(node.content || []).map((item, idx) => (
          <ContentBlock key={idx} item={item} />
        ))}
      </div>
      {isTeacher ? <AddContentForm disabled={busy} onAdd={(p) => onAddContent(node.id, p)} /> : null}
      {node.children?.length ? (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 border-l-2 border-slate-700 pl-3">
          {node.children.map((ch) => (
            <SectionBranch
              key={ch.id}
              node={ch}
              isTeacher={isTeacher}
              busy={busy}
              onDelete={onDelete}
              onAddContent={onAddContent}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [teachingIds, setTeachingIds] = useState(() => new Set());
  const [enrolledIds, setEnrolledIds] = useState(() => new Set());
  const [sections, setSections] = useState(null);
  const [sectionsMsg, setSectionsMsg] = useState("");
  const [students, setStudents] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editPhoto, setEditPhoto] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newParent, setNewParent] = useState("");
  const [newOrder, setNewOrder] = useState("");
  const [inquirySubject, setInquirySubject] = useState("");
  const [inquiryBody, setInquiryBody] = useState("");
  const [inquiryMsg, setInquiryMsg] = useState("");

  const activeCourseIdRef = useRef(courseId);
  activeCourseIdRef.current = courseId;

  const loadAll = useCallback(async () => {
    const loadFor = courseId;
    setErr("");
    setSectionsMsg("");
    try {
      const [tRes, eRes, cRes] = await Promise.all([
        fetch(apiUrl("/api/courses"), { headers: { ...authHeaders() }, credentials: "include" }),
        fetch(apiUrl("/api/courses/enrolled"), { headers: { ...authHeaders() }, credentials: "include" }),
        fetch(apiUrl(`/api/courses/${courseId}`), { headers: { ...authHeaders() }, credentials: "include" }),
      ]);
      const tData = await tRes.json().catch(() => ({}));
      const eData = await eRes.json().catch(() => ({}));
      const cData = await cRes.json().catch(() => ({}));
      if (activeCourseIdRef.current !== loadFor) return;
      if (!cRes.ok) {
        setErr(cData.error || "No se pudo cargar el curso.");
        setCourse(null);
        return;
      }
      setTeachingIds(new Set((tData.courses || []).map((c) => c.id)));
      setEnrolledIds(new Set((eData.courses || []).map((c) => c.id)));
      const c = cData.course;
      setCourse(c);
      setEditCode(c.code || "");
      setEditName(c.name || "");
      setEditDesc(c.description || "");
      setEditStart((c.startDate || "").toString().slice(0, 10));
      setEditEnd((c.endDate || "").toString().slice(0, 10));
      setEditPhoto(c.photoUrl || "");

      const secRes = await fetch(apiUrl(`/api/courses/${courseId}/sections`), {
        headers: { ...authHeaders() },
        credentials: "include",
      });
      const secData = await secRes.json().catch(() => ({}));
      if (activeCourseIdRef.current !== loadFor) return;
      if (secRes.ok) {
        setSections(secData.sections || []);
        setSectionsMsg("");
      } else if (secRes.status === 403) {
        setSections(null);
        setSectionsMsg(secData.error || "Matricúlate para ver el contenido de este curso.");
      } else if (secRes.status === 404) {
        setSections([]);
        setSectionsMsg("");
      } else {
        setSections([]);
        setSectionsMsg(secData.error || "No se pudo cargar el contenido.");
      }

      const isTeacher = (tData.courses || []).some((x) => x.id === courseId);
      const isEnrolled = (eData.courses || []).some((x) => x.id === courseId);
      if ((isTeacher || isEnrolled) && (tRes.ok || eRes.ok)) {
        const stRes = await fetch(apiUrl(`/api/courses/${courseId}/students`), {
          headers: { ...authHeaders() },
          credentials: "include",
        });
        const stData = await stRes.json().catch(() => ({}));
        if (activeCourseIdRef.current !== loadFor) return;
        if (stRes.ok) setStudents(stData.students || []);
        else setStudents([]);
      } else {
        setStudents([]);
      }
    } catch {
      if (activeCourseIdRef.current === loadFor) setErr("Error de red.");
    }
  }, [courseId]);

  useEffect(() => {
    setCourse(null);
    setSections(null);
    setErr("");
    setFormMsg("");
  }, [courseId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const isTeacher = teachingIds.has(courseId);
  const isEnrolled = enrolledIds.has(courseId);
  const canSeeSections = isTeacher || (course?.published && isEnrolled);
  const sectionRoots = useMemo(() => buildSectionTree(sections || []), [sections]);

  async function saveCourse(e) {
    e.preventDefault();
    setFormMsg("");
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/courses/${courseId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          code: editCode.trim(),
          name: editName.trim(),
          description: editDesc.trim(),
          startDate: editStart,
          endDate: editEnd || null,
          photoUrl: editPhoto.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormMsg(data.error || "No se pudo guardar.");
        return;
      }
      setCourse(data.course);
      setFormMsg("Cambios guardados.");
    } catch {
      setFormMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setFormMsg("");
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/courses/${courseId}/publish`), {
        method: "POST",
        headers: { ...authHeaders() },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormMsg(data.error || "No se pudo publicar.");
        return;
      }
      setCourse(data.course);
      setFormMsg("Curso publicado.");
      await loadAll();
    } catch {
      setFormMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function enroll() {
    setFormMsg("");
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/courses/${courseId}/enroll`), {
        method: "POST",
        headers: { ...authHeaders() },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormMsg(data.error || "No se pudo matricular.");
        return;
      }
      setFormMsg("Matrícula exitosa.");
      await loadAll();
    } catch {
      setFormMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function cloneCourse() {
    const code = window.prompt("Código único para el curso clonado:");
    if (!code?.trim()) return;
    setBusy(true);
    setFormMsg("");
    try {
      const res = await fetch(apiUrl(`/api/courses/${courseId}/clone`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormMsg(data.error || "No se pudo clonar.");
        return;
      }
      if (data.course?.id) navigate(`/courses/${data.course.id}`);
    } catch {
      setFormMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function addSection(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const body = {
        title: newTitle.trim(),
        order: newOrder === "" ? undefined : Number(newOrder),
      };
      if (newParent) body.parentId = newParent;
      const res = await fetch(apiUrl(`/api/courses/${courseId}/sections`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormMsg(data.error || "No se pudo crear la sección.");
        return;
      }
      setNewTitle("");
      setNewParent("");
      setNewOrder("");
      await loadAll();
    } catch {
      setFormMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSection(id) {
    if (!window.confirm("¿Eliminar esta sección?")) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/courses/${courseId}/sections/${id}`), {
        method: "DELETE",
        headers: { ...authHeaders() },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormMsg(data.error || "No se pudo eliminar.");
        return;
      }
      await loadAll();
    } catch {
      setFormMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function addContent(sectionId, payload) {
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/courses/${courseId}/sections/${sectionId}/content`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormMsg(data.error || "No se pudo agregar contenido.");
        return;
      }
      await loadAll();
    } catch {
      setFormMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function sendCourseInquiry(e) {
    e.preventDefault();
    setInquiryMsg("");
    const tid = course?.teacherUserId;
    if (!tid || !inquiryBody.trim()) {
      setInquiryMsg("Escribe el mensaje para el docente.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({
          type: "course_query",
          courseId,
          toUserId: tid,
          subject: inquirySubject.trim() || "Consulta sobre el curso",
          body: inquiryBody.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInquiryMsg(data.error || "No se pudo enviar.");
        return;
      }
      setInquiryMsg("Consulta enviada. El docente puede verla en «Consultas del curso».");
      setInquirySubject("");
      setInquiryBody("");
    } catch {
      setInquiryMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  if (err) {
    return (
      <div className="space-y-3">
        <p className="text-red-400">{err}</p>
        <Link to="/courses/mine" className="text-sky-400 underline">
          Volver a mis cursos
        </Link>
      </div>
    );
  }

  if (!course) return <p className="text-slate-400">Cargando…</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            <Link
              to="/courses/mine"
              className="text-sky-300 hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
            >
              Mis cursos
            </Link>
            <span className="mx-2">/</span>
            <span>{course.code}</span>
          </p>
          <h1 className="text-2xl font-bold text-white mt-1">{course.name}</h1>
          <p className="text-slate-400 mt-2 max-w-2xl whitespace-pre-wrap">{course.description || "Sin descripción."}</p>
          <p className="text-slate-500 text-sm mt-2">
            {course.startDate} → {course.endDate || "sin fecha fin"}
            {course.published ? (
              <span className="ml-2 text-emerald-500">Publicado</span>
            ) : (
              <span className="ml-2 text-amber-500">Borrador</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Acciones del curso">
          <Link
            to={`/courses/${courseId}/evaluations`}
            className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Evaluaciones
          </Link>
          {isTeacher ? (
            <Link
              to={`/courses/${courseId}/consultas`}
              className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Consultas
            </Link>
          ) : null}
          {isTeacher && !course.published ? (
            <button
              type="button"
              disabled={busy}
              onClick={publish}
              aria-busy={busy}
              aria-label={busy ? "Publicando curso" : "Publicar curso"}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Publicar
            </button>
          ) : null}
          {course.published && !isTeacher && !isEnrolled ? (
            <button
              type="button"
              disabled={busy}
              onClick={enroll}
              aria-busy={busy}
              aria-label={busy ? "Matriculando en el curso" : "Matricularme en este curso"}
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Matricularme
            </button>
          ) : null}
          {isTeacher ? (
            <button
              type="button"
              disabled={busy}
              onClick={cloneCourse}
              aria-busy={busy}
              aria-label={busy ? "Clonando curso" : "Clonar este curso"}
              className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Clonar curso
            </button>
          ) : null}
        </div>
      </div>

      {formMsg ? (
        <p
          id="course-form-msg"
          role="status"
          aria-live="polite"
          className={
            formMsg.includes("exitosa") || formMsg.includes("guardados") || formMsg.includes("publicado")
              ? "text-emerald-300"
              : "text-amber-300"
          }
        >
          {formMsg}
        </p>
      ) : null}

      {isTeacher ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 space-y-4" aria-labelledby="course-edit-heading">
          <h2 id="course-edit-heading" className="text-lg font-semibold text-white">
            Editar datos (docente)
          </h2>
          <form onSubmit={saveCourse} className="grid gap-3 sm:grid-cols-2" aria-labelledby="course-edit-heading">
            <div className="block space-y-1 sm:col-span-1">
              <label htmlFor="course-edit-code" className="text-xs font-medium text-slate-300">
                Código
              </label>
              <input
                id="course-edit-code"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
              />
            </div>
            <div className="block space-y-1 sm:col-span-1">
              <label htmlFor="course-edit-name" className="text-xs font-medium text-slate-300">
                Nombre
              </label>
              <input
                id="course-edit-name"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="block space-y-1 sm:col-span-2">
              <label htmlFor="course-edit-desc" className="text-xs font-medium text-slate-300">
                Descripción
              </label>
              <textarea
                id="course-edit-desc"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm min-h-[72px] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
            <div className="block space-y-1">
              <label htmlFor="course-edit-start" className="text-xs font-medium text-slate-300">
                Inicio
              </label>
              <input
                id="course-edit-start"
                type="date"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
              />
            </div>
            <div className="block space-y-1">
              <label htmlFor="course-edit-end" className="text-xs font-medium text-slate-300">
                Fin
              </label>
              <input
                id="course-edit-end"
                type="date"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
              />
            </div>
            <div className="block space-y-1 sm:col-span-2">
              <label htmlFor="course-edit-photo" className="text-xs font-medium text-slate-300">
                URL imagen
              </label>
              <input
                id="course-edit-photo"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={editPhoto}
                onChange={(e) => setEditPhoto(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              aria-label={busy ? "Guardando cambios del curso" : "Guardar cambios del curso"}
              className="sm:col-span-2 rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Guardar cambios
            </button>
          </form>
        </section>
      ) : null}

      {isTeacher || isEnrolled ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 space-y-2" aria-labelledby="course-students-heading">
          <h2 id="course-students-heading" className="text-lg font-semibold text-white">
            Estudiantes del curso
          </h2>
          {students.length === 0 ? (
            <p className="text-slate-500 text-sm">Nadie matriculado aún.</p>
          ) : (
            <ul
              className="text-sm text-slate-300 divide-y divide-slate-800 border border-slate-800 rounded-md overflow-hidden"
              aria-labelledby="course-students-heading"
            >
              {students.map((s) => (
                <li
                  key={s.id}
                  className="px-3 py-2 flex justify-between gap-2 bg-slate-950/40"
                  aria-label={`${s.fullName || s.username}, usuario ${s.username}`}
                >
                  <span>{s.fullName || s.username}</span>
                  <span className="text-slate-400">{s.username}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {isEnrolled && course.published && course.teacherUserId && !isTeacher ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 space-y-3" aria-labelledby="course-inquiry-heading">
          <h2 id="course-inquiry-heading" className="text-lg font-semibold text-white">
            Consulta al docente
          </h2>
          <p id="course-inquiry-help" className="text-slate-300 text-sm">
            Debes estar matriculado. El mensaje se registra como consulta del curso.
          </p>
          {inquiryMsg ? (
            <p id="course-inquiry-status" className="text-sm text-emerald-300" role="status" aria-live="polite">
              {inquiryMsg}
            </p>
          ) : null}
          <form
            onSubmit={sendCourseInquiry}
            className="space-y-3 max-w-xl"
            aria-labelledby="course-inquiry-heading"
            aria-describedby="course-inquiry-help"
          >
            <div className="block space-y-1">
              <label htmlFor="course-inquiry-subject" className="text-xs font-medium text-slate-300">
                Asunto (opcional)
              </label>
              <input
                id="course-inquiry-subject"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={inquirySubject}
                onChange={(e) => setInquirySubject(e.target.value)}
                placeholder="Duda sobre la tarea 1"
              />
            </div>
            <div className="block space-y-1">
              <label htmlFor="course-inquiry-body" className="text-xs font-medium text-slate-300">
                Mensaje
              </label>
              <textarea
                id="course-inquiry-body"
                className="w-full min-h-[100px] rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={inquiryBody}
                onChange={(e) => setInquiryBody(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              aria-label={busy ? "Enviando consulta" : "Enviar consulta al docente"}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Enviar consulta
            </button>
          </form>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Contenido por secciones</h2>
        {!canSeeSections && sectionsMsg ? <p className="text-slate-400 text-sm">{sectionsMsg}</p> : null}
        {canSeeSections && sections && sections.length === 0 && isTeacher ? (
          <p className="text-slate-500 text-sm">No hay secciones. Crea la primera abajo.</p>
        ) : null}
        {canSeeSections && Array.isArray(sections) && sectionRoots.length > 0
          ? sectionRoots.map((node) => (
              <SectionBranch
                key={node.id}
                node={node}
                isTeacher={isTeacher}
                busy={busy}
                onDelete={deleteSection}
                onAddContent={addContent}
              />
            ))
          : null}
      </section>

      {isTeacher ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 space-y-3" aria-labelledby="course-new-section-heading">
          <h2 id="course-new-section-heading" className="text-lg font-semibold text-white">
            Nueva sección
          </h2>
          <form onSubmit={addSection} className="flex flex-col sm:flex-row flex-wrap gap-3 items-end" aria-labelledby="course-new-section-heading">
            <div className="block space-y-1 flex-1 min-w-[200px]">
              <label htmlFor="course-new-section-title" className="text-xs font-medium text-slate-300">
                Título
              </label>
              <input
                id="course-new-section-title"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Unidad 1 — Introducción"
              />
            </div>
            <div className="block space-y-1 w-full sm:w-48">
              <label htmlFor="course-new-section-parent" className="text-xs font-medium text-slate-300">
                Sección padre (opcional)
              </label>
              <select
                id="course-new-section-parent"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={newParent}
                onChange={(e) => setNewParent(e.target.value)}
              >
                <option value="">— Raíz —</option>
                {(sections || []).map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="block space-y-1 w-full sm:w-24">
              <label htmlFor="course-new-section-order" className="text-xs font-medium text-slate-300">
                Orden
              </label>
              <input
                id="course-new-section-order"
                className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                value={newOrder}
                onChange={(e) => setNewOrder(e.target.value)}
                placeholder="auto"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              aria-label={busy ? "Añadiendo sección" : "Añadir sección al curso"}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Añadir sección
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

function AddContentForm({ disabled, onAdd }) {
  const uid = useId();
  const [type, setType] = useState("text");
  const [textBody, setTextBody] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [filename, setFilename] = useState("");
  const [caption, setCaption] = useState("");

  function submit(e) {
    e.preventDefault();
    if (type === "text") {
      if (!textBody.trim()) return;
      onAdd({ type: "text", data: textBody });
      setTextBody("");
      return;
    }
    if (!url.trim()) return;
    const base = { type, url: url.trim() };
    if (title.trim()) base.title = title.trim();
    if (type === "document" && filename.trim()) base.filename = filename.trim();
    if (type === "image" && caption.trim()) base.caption = caption.trim();
    onAdd(base);
    setUrl("");
    setTitle("");
    setFilename("");
    setCaption("");
  }

  const inputFocus =
    "rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-950";

  return (
    <form onSubmit={submit}>
      <fieldset className="rounded border border-dashed border-slate-600 p-3 space-y-2 bg-slate-950/30">
        <legend className="text-xs font-medium text-slate-300 px-1">Añadir bloque a esta sección</legend>
        <div className="flex flex-wrap gap-2 items-center">
          <label htmlFor={`${uid}-content-type`} className="sr-only">
            Tipo de bloque de contenido
          </label>
          <select
            id={`${uid}-content-type`}
            className={`${inputFocus} shrink-0`}
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={disabled}
            aria-label="Tipo de contenido a añadir"
          >
            <option value="text">Texto</option>
            <option value="video">Video (URL)</option>
            <option value="image">Imagen (URL)</option>
            <option value="document">Documento (URL)</option>
          </select>
          {type === "text" ? (
            <>
              <label htmlFor={`${uid}-text-body`} className="sr-only">
                Texto del bloque
              </label>
              <textarea
                id={`${uid}-text-body`}
                className={`flex-1 min-w-[200px] min-h-[60px] ${inputFocus}`}
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="Contenido en texto plano o markdown simple"
                disabled={disabled}
              />
            </>
          ) : (
            <>
              <label htmlFor={`${uid}-media-url`} className="sr-only">
                URL del recurso
              </label>
              <input
                id={`${uid}-media-url`}
                className={`flex-1 min-w-[200px] ${inputFocus}`}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                disabled={disabled}
                inputMode="url"
                autoComplete="url"
              />
              <label htmlFor={`${uid}-media-title`} className="sr-only">
                Título visible (opcional)
              </label>
              <input
                id={`${uid}-media-title`}
                className={`w-40 ${inputFocus}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título"
                disabled={disabled}
              />
              {type === "document" ? (
                <>
                  <label htmlFor={`${uid}-doc-filename`} className="sr-only">
                    Nombre de archivo mostrado
                  </label>
                  <input
                    id={`${uid}-doc-filename`}
                    className={`w-40 ${inputFocus}`}
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="Nombre archivo"
                    disabled={disabled}
                  />
                </>
              ) : null}
              {type === "image" ? (
                <>
                  <label htmlFor={`${uid}-img-caption`} className="sr-only">
                    Pie de foto o descripción corta
                  </label>
                  <input
                    id={`${uid}-img-caption`}
                    className={`w-44 ${inputFocus}`}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Pie de foto"
                    disabled={disabled}
                  />
                </>
              ) : null}
            </>
          )}
          <button
            type="submit"
            disabled={disabled}
            aria-label="Agregar bloque de contenido a la sección"
            className="rounded bg-slate-700 px-3 py-1 text-sm text-white hover:bg-slate-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Agregar
          </button>
        </div>
      </fieldset>
    </form>
  );
}
