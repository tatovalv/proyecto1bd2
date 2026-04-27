import { Link } from "react-router-dom";

const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const btnSecondary =
  "inline-flex items-center justify-center rounded-lg border border-slate-400 px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-3xl font-bold text-slate-900">Plataforma de cursos virtuales</h1>
        <p className="text-slate-700 max-w-2xl leading-relaxed mt-3">
          Crea cursos, organiza contenidos, publica evaluaciones y mantén comunicación entre docentes y estudiantes en un
          solo lugar.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Comienza aquí</h2>
        <div className="flex flex-wrap gap-3" role="group" aria-label="Acciones de cuenta">
          <Link to="/register" className={btnPrimary}>
            Crear cuenta
          </Link>
          <Link to="/login" className={btnSecondary}>
            Ya tengo usuario
          </Link>
          <Link
            to="/forgot-password"
            className={`${btnSecondary} text-slate-800`}
            aria-label="Recuperar contraseña olvidada"
          >
            Olvidé mi contraseña
          </Link>
        </div>
      </div>
      <ul
        className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm"
        aria-label="Funcionalidades principales de la plataforma"
      >
        <li className="rounded-xl border border-slate-200 bg-white p-4 text-slate-800">Gestiona cursos y secciones</li>
        <li className="rounded-xl border border-slate-200 bg-white p-4 text-slate-800">Publica evaluaciones y resultados</li>
        <li className="rounded-xl border border-slate-200 bg-white p-4 text-slate-800">Envía mensajes y consultas</li>
      </ul>
    </div>
  );
}
