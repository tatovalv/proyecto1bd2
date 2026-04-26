import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/requireAuth.js";
import { Message } from "../models/Message.js";
import { getCourse, userTeachesCourse, userEnrolledInCourse } from "../services/courseService.js";

export function createMessagesRouter() {
  const router = Router();
  router.use(requireAuth);

  router.post("/", async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: "MongoDB no conectado." });
      }
      const { type, courseId, toUserId, subject, body, parentMessageId } = req.body || {};
      if (!type || !toUserId || !body) {
        return res.status(400).json({ error: "type, toUserId y body son obligatorios." });
      }
      if (type === "course_query") {
        if (!courseId) return res.status(400).json({ error: "courseId requerido para course_query." });
        const course = await getCourse(courseId);
        if (!course) return res.status(404).json({ error: "Curso no encontrado." });
        const enrolled = await userEnrolledInCourse(req.user.id, courseId);
        const recipientTeaches = await userTeachesCourse(toUserId, courseId);
        if (!enrolled || !recipientTeaches) {
          return res.status(403).json({
            error: "La consulta de curso debe ser de un estudiante matriculado hacia el docente del curso.",
          });
        }
      }
      const doc = await Message.create({
        type,
        courseId: courseId || null,
        fromUserId: req.user.id,
        toUserId,
        subject: subject || "",
        body,
        parentMessageId: parentMessageId || null,
      });
      res.status(201).json({ message: doc });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo enviar el mensaje." });
    }
  });

  router.get("/inbox", async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: "MongoDB no conectado." });
      }
      const list = await Message.find({ toUserId: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
      res.json({ messages: list });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo leer la bandeja." });
    }
  });

  router.get("/sent", async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: "MongoDB no conectado." });
      }
      const list = await Message.find({ fromUserId: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
      res.json({ messages: list });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo leer enviados." });
    }
  });

  router.put("/:id/reply", async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: "MongoDB no conectado." });
      }
      const parent = await Message.findById(req.params.id);
      if (!parent) return res.status(404).json({ error: "Mensaje no encontrado." });
      const body = String(req.body?.body || "").trim();
      if (!body) return res.status(400).json({ error: "body requerido." });
      const doc = await Message.create({
        type: parent.type,
        courseId: parent.courseId,
        fromUserId: req.user.id,
        toUserId: parent.fromUserId,
        subject: `Re: ${parent.subject || ""}`.trim(),
        body,
        parentMessageId: parent._id,
      });
      res.status(201).json({ message: doc });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo responder." });
    }
  });

  router.get("/course/:courseId", async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: "MongoDB no conectado." });
      }
      const { courseId } = req.params;
      if (!(await userTeachesCourse(req.user.id, courseId))) {
        return res.status(403).json({ error: "Solo el docente del curso." });
      }
      const list = await Message.find({ courseId, type: "course_query" })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      res.json({ messages: list });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo listar consultas." });
    }
  });

  return router;
}
