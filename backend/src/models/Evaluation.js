import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    options: { type: [optionSchema], default: [] },
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true },
    title: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    questions: { type: [questionSchema], default: [] },
  },
  { collection: "evaluations" }
);

evaluationSchema.index({ courseId: 1 });

export const Evaluation =
  mongoose.models.Evaluation || mongoose.model("Evaluation", evaluationSchema);
