import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["course_query", "direct"], required: true },
    courseId: { type: String, default: null, index: true },
    fromUserId: { type: String, required: true, index: true },
    toUserId: { type: String, required: true, index: true },
    subject: { type: String, default: "" },
    body: { type: String, required: true },
    parentMessageId: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, default: () => new Date() },
    readAt: { type: Date, default: null },
  },
  { collection: "messages" }
);

messageSchema.index({ toUserId: 1, createdAt: -1 });
messageSchema.index({ fromUserId: 1, createdAt: -1 });
messageSchema.index({ courseId: 1, type: 1 });

export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
