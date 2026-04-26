import mongoose from "mongoose";

const contentItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["text", "video", "document", "image"], required: true },
    data: String,
    url: String,
    title: String,
    filename: String,
    caption: String,
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    parentId: { type: String, default: null },
    content: { type: [contentItemSchema], default: [] },
    children: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const courseContentSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, index: true },
    sections: { type: [sectionSchema], default: [] },
  },
  { collection: "courses_content" }
);

export const CourseContent =
  mongoose.models.CourseContent || mongoose.model("CourseContent", courseContentSchema);
