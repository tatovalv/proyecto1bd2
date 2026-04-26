import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: String,
    selectedOptionId: String,
  },
  { _id: false }
);

const evaluationResultSchema = new mongoose.Schema(
  {
    evaluationId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    courseId: { type: String, required: true },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, required: true },
    submittedAt: { type: Date, default: () => new Date() },
  },
  { collection: "evaluation_results" }
);

evaluationResultSchema.index({ evaluationId: 1, studentId: 1 }, { unique: true });

export const EvaluationResult =
  mongoose.models.EvaluationResult || mongoose.model("EvaluationResult", evaluationResultSchema);
