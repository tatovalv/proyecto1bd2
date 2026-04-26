import { Router } from "express";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import {
  getCourse,
  userTeachesCourse,
  userEnrolledInCourse,
  getCourseContentDoc,
} from "../services/courseService.js";
import { requireRole } from "../middleware/requireRole.js";

export function createSectionsRouter() {
  const router = Router({ mergeParams: true });

  router.get("/", async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId } = req.params;
      const course = await getCourse(courseId);
      if (!course) return res.status(404).json({ error: "Curso no encontrado." });
      const teaches = await userTeachesCourse(req.user.id, courseId);
      const enrolled = await userEnrolledInCourse(req.user.id, courseId);
      if (!teaches && !(enrolled && course.published)) {
        return res.status(403).json({ error: "No autorizado." });
      }
      const doc = await getCourseContentDoc(courseId);
      if (!doc) return res.status(404).json({ error: "Sin contenido." });
      res.json({ sections: doc.sections });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo leer el contenido." });
    }
  });

  function mongo503(res) {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: "MongoDB no conectado." });
      return true;
    }
    return false;
  }

  router.post("/", requireRole("teacher", "admin"), async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId } = req.params;
      const teaches = await userTeachesCourse(req.user.id, courseId);
      if (!teaches) return res.status(403).json({ error: "Solo el docente puede editar secciones." });
      const doc = await getCourseContentDoc(courseId);
      if (!doc) return res.status(404).json({ error: "Contenido no encontrado." });
      const { title, parentId, order } = req.body || {};
      if (!title) return res.status(400).json({ error: "title requerido." });
      const id = randomUUID();
      doc.sections.push({
        id,
        title,
        order: Number(order) || doc.sections.length + 1,
        parentId: parentId || null,
        content: [],
        children: [],
      });
      await doc.save();
      res.status(201).json({ section: doc.sections[doc.sections.length - 1] });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo crear la sección." });
    }
  });

  router.put("/:sectionId", requireRole("teacher", "admin"), async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId, sectionId } = req.params;
      const teaches = await userTeachesCourse(req.user.id, courseId);
      if (!teaches) return res.status(403).json({ error: "Solo el docente puede editar secciones." });
      const doc = await getCourseContentDoc(courseId);
      if (!doc) return res.status(404).json({ error: "Contenido no encontrado." });
      const idx = doc.sections.findIndex((s) => s.id === sectionId);
      if (idx === -1) return res.status(404).json({ error: "Sección no encontrada." });
      const { title, order, parentId } = req.body || {};
      if (title != null) doc.sections[idx].title = title;
      if (order != null) doc.sections[idx].order = Number(order);
      if (parentId !== undefined) doc.sections[idx].parentId = parentId;
      await doc.save();
      res.json({ section: doc.sections[idx] });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo actualizar la sección." });
    }
  });

  router.delete("/:sectionId", requireRole("teacher", "admin"), async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId, sectionId } = req.params;
      const teaches = await userTeachesCourse(req.user.id, courseId);
      if (!teaches) return res.status(403).json({ error: "Solo el docente puede editar secciones." });
      const doc = await getCourseContentDoc(courseId);
      if (!doc) return res.status(404).json({ error: "Contenido no encontrado." });
      doc.sections = doc.sections.filter((s) => s.id !== sectionId);
      await doc.save();
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo eliminar la sección." });
    }
  });

  router.post("/:sectionId/content", requireRole("teacher", "admin"), async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId, sectionId } = req.params;
      const course = await getCourse(courseId);
      if (!course) return res.status(404).json({ error: "Curso no encontrado." });
      const teaches = await userTeachesCourse(req.user.id, courseId);
      const enrolled = await userEnrolledInCourse(req.user.id, courseId);
      if (!teaches && !(enrolled && course.published)) {
        return res.status(403).json({ error: "No autorizado." });
      }
      if (!teaches) {
        return res.status(403).json({ error: "Solo el docente puede agregar contenido." });
      }
      const doc = await getCourseContentDoc(courseId);
      if (!doc) return res.status(404).json({ error: "Contenido no encontrado." });
      const idx = doc.sections.findIndex((s) => s.id === sectionId);
      if (idx === -1) return res.status(404).json({ error: "Sección no encontrada." });
      const item = req.body || {};
      if (!item.type) return res.status(400).json({ error: "type requerido (text|video|document|image)." });
      doc.sections[idx].content.push({
        type: item.type,
        data: item.data,
        url: item.url,
        title: item.title,
        filename: item.filename,
        caption: item.caption,
      });
      await doc.save();
      res.status(201).json({ content: doc.sections[idx].content.at(-1) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo agregar contenido." });
    }
  });

  return router;
}
