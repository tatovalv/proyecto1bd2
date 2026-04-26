import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-3xl font-bold text-slate-900">Plataforma de cursos virtuales</h1>
        <p className="text-slate-600 max-w-2xl leading-relaxed mt-3">
          Crea cursos, organiza contenidos, publica evaluaciones y mantén comunicación entre docentes y
          estudiantes en un solo lugar.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Comienza aquí</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Crear cuenta
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Ya tengo usuario
          </Link>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Olvidé mi contraseña
          </Link>
        </div>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <li className="rounded-xl border border-slate-200 bg-white p-4">Gestiona cursos y secciones</li>
        <li className="rounded-xl border border-slate-200 bg-white p-4">Publica evaluaciones y resultados</li>
        <li className="rounded-xl border border-slate-200 bg-white p-4">Envía mensajes y consultas</li>
      </ul>
    </div>
  );
}
