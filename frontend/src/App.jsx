import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Link, NavLink, Navigate, useNavigate } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CoursesPublishedPage from "./pages/CoursesPublishedPage.jsx";
import MyCoursesPage from "./pages/MyCoursesPage.jsx";
import CourseCreatePage from "./pages/CourseCreatePage.jsx";
import CourseDetailPage from "./pages/CourseDetailPage.jsx";
import CourseConsultationsPage from "./pages/CourseConsultationsPage.jsx";
import CourseEvaluationsPage from "./pages/CourseEvaluationsPage.jsx";
import CourseEvaluationNewPage from "./pages/CourseEvaluationNewPage.jsx";
import CourseEvaluationDetailPage from "./pages/CourseEvaluationDetailPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import MessageComposePage from "./pages/MessageComposePage.jsx";
import PeoplePage from "./pages/PeoplePage.jsx";
import UserProfilePage from "./pages/UserProfilePage.jsx";
import AdminActivityPage from "./pages/AdminActivityPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import ChangePasswordPage from "./pages/ChangePasswordPage.jsx";
import {
  apiUrl,
  authHeaders,
  hasAccessToken,
  onAccessTokenChange,
  refreshAccessToken,
  setAccessToken,
} from "./api/client.js";

async function fetchMe() {
  return fetch(apiUrl("/api/auth/me"), { headers: { ...authHeaders() }, credentials: "include" });
}

function RequireRole({ session, loading, roles, children }) {
  if (!hasAccessToken()) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-slate-400">Cargando…</p>;
  const role = session?.role || "student";
  if (roles.includes(role)) return children;
  return <Navigate to="/dashboard" replace />;
}

function Layout({ children, session, loadingSession }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasAccessToken());

  useEffect(() => onAccessTokenChange(() => setIsLoggedIn(hasAccessToken())), []);

  async function onLogout() {
    try {
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: { ...authHeaders() },
        credentials: "include",
      });
    } catch {}
    setAccessToken("");
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-app-bg">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900">
            TEC Digitalito
          </Link>
          {!isLoggedIn ? (
            <nav className="flex items-center gap-2 text-sm">
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md ${isActive ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100"}`
                }
              >
                Iniciar sesión
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md ${isActive ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100"}`
                }
              >
                Registro
              </NavLink>
            </nav>
          ) : (
            <nav className="flex items-center gap-2 text-sm flex-wrap justify-end">
              {[
                ["/dashboard", "Panel", ["student", "teacher", "admin"]],
                ["/courses/mine", "Mis cursos", ["student", "teacher", "admin"]],
                ["/courses/new", "Crear curso", ["teacher", "admin"]],
                ["/courses/published", "Catálogo", ["student", "teacher", "admin"]],
                ["/people", "Personas", ["student", "teacher", "admin"]],
                ["/messages", "Mensajes", ["student", "teacher", "admin"]],
                ["/admin/activity", "Admin", ["admin"]],
              ]
                .filter(([, , allowed]) => !loadingSession && allowed.includes(session?.role || "student"))
                .map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md ${isActive ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  {label}
                </NavLink>
                ))}
              <NavLink
                to="/change-password"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md ${isActive ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100"}`
                }
              >
                Contraseña
              </NavLink>
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Salir
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);

  const loadSession = useCallback(async () => {
    if (!hasAccessToken()) {
      setSession(null);
      return;
    }
    setLoadingSession(true);
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
        setSession(null);
        return;
      }
      setSession(data.user || null);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
    return onAccessTokenChange(() => {
      void loadSession();
    });
  }, [loadSession]);

  return (
    <Layout session={session} loadingSession={loadingSession}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/courses/mine" element={<MyCoursesPage />} />
        <Route
          path="/courses/new"
          element={
            <RequireRole session={session} loading={loadingSession} roles={["teacher", "admin"]}>
              <CourseCreatePage />
            </RequireRole>
          }
        />
        <Route path="/courses/published" element={<CoursesPublishedPage />} />
        <Route
          path="/courses/:courseId/evaluations/new"
          element={
            <RequireRole session={session} loading={loadingSession} roles={["teacher", "admin"]}>
              <CourseEvaluationNewPage />
            </RequireRole>
          }
        />
        <Route path="/courses/:courseId/evaluations/:evalId" element={<CourseEvaluationDetailPage />} />
        <Route path="/courses/:courseId/evaluations" element={<CourseEvaluationsPage />} />
        <Route
          path="/courses/:courseId/consultas"
          element={
            <RequireRole session={session} loading={loadingSession} roles={["teacher", "admin"]}>
              <CourseConsultationsPage />
            </RequireRole>
          }
        />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/users/:userId" element={<UserProfilePage />} />
        <Route path="/messages/compose" element={<MessageComposePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route
          path="/admin/activity"
          element={
            <RequireRole session={session} loading={loadingSession} roles={["admin"]}>
              <AdminActivityPage />
            </RequireRole>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Routes>
    </Layout>
  );
}
