import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createCoursesRouter } from "./routes/courses.routes.js";
import { createUsersRouter } from "./routes/users.routes.js";
import { createMessagesRouter } from "./routes/messages.routes.js";
import { createAdminRouter } from "./routes/admin.routes.js";
import { getAuthMode } from "./config/authMode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  const cookieSecret = process.env.COOKIE_SECRET || "tec-digitalito-dev-secret";
  const uploadDir = path.join(__dirname, "..", "uploads", "avatars");
  fs.mkdirSync(uploadDir, { recursive: true });

  const frontendOrigin = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").trim();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: frontendOrigin,
      credentials: true,
    })
  );
  app.use(cookieParser(cookieSecret));
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads/avatars", express.static(uploadDir));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "tec-digitalito-backend",
      pid: process.pid,
      authMode: getAuthMode(),
    });
  });

  app.use("/api/auth", createAuthRouter({ uploadDir }));
  app.use("/api/courses", createCoursesRouter());
  app.use("/api/users", createUsersRouter());
  app.use("/api/messages", createMessagesRouter());
  app.use("/api/admin", createAdminRouter());

  return app;
}
