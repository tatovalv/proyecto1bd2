import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import * as courseService from "../services/courseService.js";
import { createSectionsRouter } from "./sections.routes.js";
import { createEvaluationsRouter } from "./evaluations.routes.js";

function handleCourseError(err, res) {
  const msg = err?.message || "";
  if (msg === "NEO4J_UNAVAILABLE") return res.status(503).json({ error: "Neo4j no disponible." });
  if (msg === "MONGO_UNAVAILABLE") return res.status(503).json({ error: "MongoDB no disponible." });
  if (msg === "NOT_FOUND") return res.status(404).json({ error: "No encontrado." });
  if (msg === "FORBIDDEN") return res.status(403).json({ error: "No autorizado." });
  if (msg === "NOT_PUBLISHED") return res.status(400).json({ error: "El curso no está publicado." });
  console.error(err);
  return res.status(500).json({ error: "Error interno." });
}

export function createCoursesRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/", async (req, res) => {
    try {
      const list = await courseService.listTeachingCourses(req.user.id);
      res.json({ courses: list });
    } catch (e) {
      handleCourseError(e, res);
    }
  });

  router.get("/enrolled", async (req, res) => {
    try {
      const list = await courseService.listEnrolledCourses(req.user.id);
      res.json({ courses: list });
    } catch (e) {
      handleCourseError(e, res);
    }
  });

  router.get("/published", async (req, res) => {
    try {
      const list = await courseService.listPublishedCourses();
      res.json({ courses: list });
    } catch (e) {
      handleCourseError(e, res);
    }
  });

  router.post("/", requireRole("teacher", "admin"), async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: "MongoDB no conectado." });
      }
      const { code, name, description, startDate, endDate, photoUrl } = req.body || {};
      if (!code || !name || !startDate) {
        return res.status(400).json({ error: "code, name y startDate son obligatorios." });
      }
      const id = await courseService.createCourse(req.user.id, {
        code,
        name,
        description,
        startDate,
        endDate: endDate || null,
        photoUrl,
        teacherUsername: req.user.username,
      });
      const course = await courseService.getCourse(id);
      res.status(201).json({ course });
    } catch (e) {
      handleCourseError(e, res);
    }
  });

  router.post("/:courseId/clone", requireRole("teacher", "admin"), async (req, res) => {
    try {
      const newId = await courseService.cloneCourse(req.user.id, req.params.courseId, {
        ...(req.body || {}),
        teacherUsername: req.user.username,
      });
      const course = await courseService.getCourse(newId);
      res.status(201).json({ course });
    } catch (e) {
      handleCourseError(e, res);
    }
  });

  router.post("/:courseId/enroll", requireRole("student", "admin"), async (req, res) => {
    try {
      await courseService.enrollStudent(req.user.id, req.params.courseId);
      res.status(201).json({ ok: true });
    } catch (e) {
      handleCourseError(e, res);
    }
  });

  router.post("/:courseId/publish", requireRole("teacher", "admin"), async (req, res) => {
    try {
      if (!(await courseService.userTeachesCourse(req.user.id, req.params.courseId))) {
        return res.status(403).json({ error: "Solo el docente puede publicar." });
      }
      await courseService.publishCourse(req.params.courseId);
      const course = await courseService.getCourse(req.params.courseId);
      res.json({ course });
    } catch (e) {
      handleCourseError(e, res);
    }
  });

  router.get("/:courseId/students", async (req, res) => {
    try {
      const { courseId } = req.params;
      const course = await courseService.getCourse(courseId);
      if (!course) return res.status(404).json({ error: "Curso no encontrado." });
      const teaches = await courseService.userTeachesCourse(req.user.id, courseId);
      const enrolled = await courseService.userEnrolledInCourse(req.user.id, courseId);
      if (!teaches && !(enrolled && course.published)) {
        return res.status(403).json({ error: "Solo docente o estudiantes matriculados pueden ver estudiantes." });
      }
      const students = await courseService.listStudents(courseId);
      res.json({ students });
    } catch (e) {
      handleCourseError(e, res);
    }
  });

  router.use("/:courseId/sections", createSectionsRouter());
  router.use("/:courseId/evaluations", createEvaluationsRouter());

  router.get("/:courseId", async (req, res) => {
    try {
      const course = await courseService.getCourse(req.params.courseId);
      if (!course) return res.status(404).json({ error: "Curso no encontrado." });
      const teaches = await courseService.userTeachesCourse(req.user.id, req.params.courseId);
      const enrolled = await courseService.userEnrolledInCourse(req.user.id, req.params.courseId);
      if (!course.published && !teaches && !enrolled) {
        return res.status(403).json({ error: "No autorizado." });
      }
      let payload = { ...course };
      if (teaches || enrolled) {
        const teacherUserId = await courseService.getPrimaryTeacherId(req.params.courseId);
        payload = { ...payload, teacherUserId };
      }
      res.json({ course: payload });
    } catch (e) {
      handleCourseError(e, res);
    }
  });

  router.put("/:courseId", requireRole("teacher", "admin"), async (req, res) => {
    try {
      if (!(await courseService.userTeachesCourse(req.user.id, req.params.courseId))) {
        return res.status(403).json({ error: "Solo el docente puede editar." });
      }
      const patch = req.body || {};
      await courseService.updateCourse(req.params.courseId, patch);
      const course = await courseService.getCourse(req.params.courseId);
      res.json({ course });
    } catch (e) {
      handleCourseError(e, res);
    }
  });

  return router;
}
