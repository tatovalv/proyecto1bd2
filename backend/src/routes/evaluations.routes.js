import { Router } from "express";
import mongoose from "mongoose";
import { Evaluation } from "../models/Evaluation.js";
import { EvaluationResult } from "../models/EvaluationResult.js";
import { requireRole } from "../middleware/requireRole.js";
import { getCourse, userTeachesCourse, userEnrolledInCourse } from "../services/courseService.js";

function mongo503(res) {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: "MongoDB no conectado." });
    return true;
  }
  return false;
}

function stripCorrect(qs) {
  return (qs || []).map((q) => ({
    id: q.id,
    text: q.text,
    options: (q.options || []).map((o) => ({ id: o.id, text: o.text })),
  }));
}

function scoreEvaluation(evaluation, answers) {
  let correct = 0;
  let total = 0;
  for (const q of evaluation.questions || []) {
    total += 1;
    const ans = answers.find((a) => a.questionId === q.id);
    if (!ans) continue;
    const opt = (q.options || []).find((o) => o.id === ans.selectedOptionId);
    if (opt?.isCorrect) correct += 1;
  }
  const score = total === 0 ? 0 : (correct / total) * 100;
  return { score, correct, total };
}

export function createEvaluationsRouter() {
  const router = Router({ mergeParams: true });

  router.post("/", requireRole("teacher", "admin"), async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId } = req.params;
      if (!(await userTeachesCourse(req.user.id, courseId))) {
        return res.status(403).json({ error: "Solo el docente puede crear evaluaciones." });
      }
      const { title, startDate, endDate, questions } = req.body || {};
      if (!title || !startDate || !endDate) {
        return res.status(400).json({ error: "title, startDate y endDate son obligatorios." });
      }
      const evalDoc = await Evaluation.create({
        courseId,
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        questions: questions || [],
      });
      res.status(201).json({ evaluation: evalDoc });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo crear la evaluación." });
    }
  });

  router.get("/", async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId } = req.params;
      const teaches = await userTeachesCourse(req.user.id, courseId);
      const enrolled = await userEnrolledInCourse(req.user.id, courseId);
      const course = await getCourse(courseId);
      if (!course) return res.status(404).json({ error: "Curso no encontrado." });
      if (!teaches && !(enrolled && course.published)) {
        return res.status(403).json({ error: "No autorizado." });
      }
      const list = await Evaluation.find({ courseId }).sort({ startDate: -1 }).lean();
      if (!teaches) {
        return res.json({
          evaluations: list.map((e) => ({
            _id: e._id,
            courseId: e.courseId,
            title: e.title,
            startDate: e.startDate,
            endDate: e.endDate,
          })),
        });
      }
      res.json({ evaluations: list });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo listar." });
    }
  });

  router.get("/all-results", requireRole("teacher", "admin"), async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId } = req.params;
      if (!(await userTeachesCourse(req.user.id, courseId))) {
        return res.status(403).json({ error: "Solo el docente." });
      }
      const evals = await Evaluation.find({ courseId }).select("_id").lean();
      const ids = evals.map((e) => String(e._id));
      const results = await EvaluationResult.find({ evaluationId: { $in: ids } }).lean();
      res.json({ results });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo listar resultados." });
    }
  });

  router.get("/:evalId", async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId, evalId } = req.params;
      const teaches = await userTeachesCourse(req.user.id, courseId);
      const enrolled = await userEnrolledInCourse(req.user.id, courseId);
      const course = await getCourse(courseId);
      if (!course) return res.status(404).json({ error: "Curso no encontrado." });
      if (!teaches && !(enrolled && course.published)) {
        return res.status(403).json({ error: "No autorizado." });
      }
      const ev = await Evaluation.findById(evalId).lean();
      if (!ev || ev.courseId !== courseId) return res.status(404).json({ error: "Evaluación no encontrada." });
      if (teaches) return res.json({ evaluation: ev });
      res.json({ evaluation: { ...ev, questions: stripCorrect(ev.questions) } });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Error al cargar evaluación." });
    }
  });

  router.post("/:evalId/submit", requireRole("student", "admin"), async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId, evalId } = req.params;
      if (!(await userEnrolledInCourse(req.user.id, courseId))) {
        return res.status(403).json({ error: "Debes estar matriculado." });
      }
      const ev = await Evaluation.findById(evalId);
      if (!ev || ev.courseId !== courseId) return res.status(404).json({ error: "Evaluación no encontrada." });
      const now = new Date();
      if (now < ev.startDate || now > ev.endDate) {
        return res.status(400).json({ error: "Fuera del periodo de la evaluación." });
      }
      const answers = req.body?.answers || [];
      const { score } = scoreEvaluation(ev, answers);
      const doc = await EvaluationResult.findOneAndUpdate(
        { evaluationId: String(ev._id), studentId: req.user.id },
        {
          evaluationId: String(ev._id),
          studentId: req.user.id,
          courseId,
          answers,
          score,
          submittedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.json({ score, submittedAt: doc.submittedAt, resultId: doc._id });
    } catch (e) {
      console.error(e);
      if (e.code === 11000) return res.status(409).json({ error: "Ya enviaste esta evaluación." });
      res.status(500).json({ error: "No se pudo enviar." });
    }
  });

  router.get("/:evalId/results", async (req, res) => {
    try {
      if (mongo503(res)) return;
      const { courseId, evalId } = req.params;
      const teaches = await userTeachesCourse(req.user.id, courseId);
      if (teaches) {
        const list = await EvaluationResult.find({ evaluationId: evalId }).lean();
        return res.json({ results: list });
      }
      const one = await EvaluationResult.findOne({
        evaluationId: evalId,
        studentId: req.user.id,
      }).lean();
      if (!one) return res.status(404).json({ error: "Sin resultados." });
      res.json({ result: one });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo leer resultados." });
    }
  });

  return router;
}
