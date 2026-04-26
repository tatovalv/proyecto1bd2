import express, { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { getAuthMode } from "../config/authMode.js";
import { hashPasswordWithSalt, verifyPassword } from "../lib/password.js";
import { verifyPasswordScrypt } from "../lib/passwordLegacy.js";
import {
  saveUser,
  getByUsername,
  getById,
  recordSuccessfulLogin,
  ensureLoginAllowed,
  recordFailedLogin,
  flushUsersToDisk,
} from "../lib/userStore.js";
import { asText } from "../lib/formFields.js";
import { sendFailedLoginNotification } from "../lib/mailer.js";
import { registerDistributed, loginDistributed, loadPublicProfile } from "../services/distributedAuth.js";
import { verifyAccessToken, signAccessToken } from "../lib/jwt.js";
import { getRedis } from "../config/redis.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  findUserRowById,
  findUserRowByUsername,
  writeAccessLog,
  revokeAccessTokenInRedis,
  resolveRememberToken,
  registerAccessTokenInRedis,
  createPasswordResetToken,
  consumePasswordResetToken,
  updatePasswordDistributed,
} from "../services/authExtended.service.js";
import { sendPasswordResetEmail } from "../lib/mailer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INVALID = "Credenciales inválidas";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

/** @param {import('../lib/userTypes.js').StoredUser} user */
function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    dateOfBirth: user.dateOfBirth,
    avatarUrl: user.avatarPath,
    role: user.role || "student",
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

/** @param {import('../lib/userTypes.js').StoredUser} user @param {string} password */
async function verifyJsonPassword(user, password) {
  const h = user.passwordHash || "";
  if (h.startsWith("$2")) {
    return verifyPassword(password, h);
  }
  return verifyPasswordScrypt(password, user.salt, user.passwordHash);
}

/** @param {{ uploadDir: string }} opts */
export function createAuthRouter({ uploadDir }) {
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".dat";
      const safe = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext) ? ext : ".img";
      cb(null, `${randomUUID()}${safe}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith("image/")) {
        cb(new Error("El avatar debe ser una imagen."));
        return;
      }
      cb(null, true);
    },
  });

  const router = Router();

  router.post(
    "/register",
    registerLimiter,
    (req, res, next) => {
      upload.single("avatar")(req, res, (err) => {
        if (err) {
          res.status(400).json({
            error: err.message || "No se pudo subir el archivo.",
          });
          return;
        }
        next();
      });
    },
    async (req, res) => {
      const username = asText(req.body.username, true);
      const password = asText(req.body.password, false);
      const fullName = asText(req.body.fullName, true);
      const dateOfBirth = asText(req.body.dateOfBirth, true);
      const email = asText(req.body.email, true);
      const requestedRole = asText(req.body.role, true).toLowerCase();
      const role = requestedRole === "teacher" ? "teacher" : "student";

      const errors = [];
      if (username.length < 3) errors.push("El nombre de usuario debe tener al menos 3 caracteres.");
      if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        errors.push("Usuario solo puede incluir letras, números, punto, guion y guion bajo.");
      }
      if (password.length < 8) errors.push("La contraseña debe tener al menos 8 caracteres.");
      if (fullName.length < 2) errors.push("Indica tu nombre completo.");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Si indicas correo, debe tener un formato válido.");
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
        errors.push("La fecha de nacimiento debe ser válida (YYYY-MM-DD).");
      } else {
        const d = new Date(dateOfBirth + "T12:00:00");
        if (Number.isNaN(d.getTime())) errors.push("La fecha de nacimiento no es válida.");
        if (d > new Date()) errors.push("La fecha de nacimiento no puede ser futura.");
      }

      if (errors.length) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        res.status(400).json({ error: errors[0], errors });
        return;
      }

      const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : null;

      if (getAuthMode() === "distributed") {
        const out = await registerDistributed(req, {
          username,
          password,
          fullName,
          dateOfBirth,
          email,
          avatarPath,
          role,
        });
        if (!out.ok) {
          if (req.file?.path) fs.unlink(req.file.path, () => {});
          res.status(out.status).json({ error: out.error });
          return;
        }
        res.status(201).json({ user: out.user });
        return;
      }

      const { salt, passwordHash } = await hashPasswordWithSalt(password);
      const user = {
        id: randomUUID(),
        username,
        passwordHash,
        salt,
        fullName,
        dateOfBirth,
        avatarPath,
        email: email || null,
        role,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      const result = saveUser(user);
      if (!result.ok) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        res.status(409).json({ error: "Este nombre de usuario ya está en uso." });
        return;
      }

      res.status(201).json({
        user: {
          id: result.user.id,
          username: result.user.username,
          fullName: result.user.fullName,
          dateOfBirth: result.user.dateOfBirth,
          avatarUrl: result.user.avatarPath,
          role: result.user.role || "student",
        },
      });
    }
  );

  router.post("/login", loginLimiter, express.json({ limit: "32kb" }), async (req, res) => {
    const username = asText(req.body?.username, true);
    const password = asText(req.body?.password, false);

    if (!username || !password) {
      res.status(401).json({ error: INVALID });
      return;
    }

    if (getAuthMode() === "distributed") {
      const rememberMe = Boolean(req.body?.rememberMe);
      const out = await loginDistributed(req, username, password, rememberMe);
      if (out.notify) {
        void sendFailedLoginNotification(out.notify).catch((err) =>
          console.error("TEC Digitalito: envío de correo:", err.message)
        );
      }
      if (!out.ok) {
        res.status(out.status).json({
          error: out.error,
          ...(out.lockedUntil ? { lockedUntil: out.lockedUntil } : {}),
        });
        return;
      }
      res.setHeader("Authorization", out.authorizationHeader);
      if (out.rememberCookie) {
        res.cookie(out.rememberCookie.name, out.rememberCookie.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: out.rememberCookie.maxAge,
          path: "/",
        });
      }
      if (out.suspicious) {
        res.clearCookie("remember_token", { path: "/" });
      }
      res.json({
        accessToken: out.accessToken,
        tokenType: out.tokenType,
        expiresIn: out.expiresIn,
        user: out.user,
        loggedInAt: out.loggedInAt,
        suspicious: Boolean(out.suspicious),
      });
      return;
    }

    const user = getByUsername(username);

    if (user) {
      const lock = ensureLoginAllowed(user);
      if (lock.blocked) {
        res.status(423).json({
          error:
            "Tu cuenta está bloqueada temporalmente por varios intentos fallidos. Vuelve a intentar más tarde.",
          lockedUntil: lock.lockedUntil,
        });
        return;
      }
    }

    const passwordOk = user && (await verifyJsonPassword(user, password));

    if (!passwordOk) {
      if (user) {
        const { failedAttempts, accountLocked, lockedUntilIso } = recordFailedLogin(user);
        void sendFailedLoginNotification({
          email: user.email,
          username: user.username,
          failedAttempts,
          accountLocked,
          lockedUntilIso,
        }).catch((err) => console.error("TEC Digitalito: envío de correo:", err.message));
      }
      res.status(401).json({ error: INVALID });
      return;
    }

    const loggedInAt = recordSuccessfulLogin(user);

    res.cookie("tec_uid", user.id, {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    const { token, exp } = signAccessToken({
      userId: user.id,
      username: user.username,
      passwordVersion: 0,
    });
    const expiresIn = Math.max(1, exp - Math.floor(Date.now() / 1000));
    res.setHeader("Authorization", `Bearer ${token}`);
    res.json({
      accessToken: token,
      tokenType: "Bearer",
      expiresIn,
      user: publicUser(user),
      loggedInAt,
    });
  });

  router.post("/logout", requireAuth, async (req, res) => {
    if (getAuthMode() === "distributed") {
      await revokeAccessTokenInRedis(req.user.id, req.user.jti);
      await writeAccessLog(req, req.user.id, "logout").catch(() => {});
    }
    res.clearCookie("remember_token", { path: "/" });
    res.json({ ok: true });
  });

  router.post("/refresh", express.json({ limit: "8kb" }), async (req, res) => {
    if (getAuthMode() !== "distributed") {
      res.status(501).json({ error: "Refresh solo está disponible en modo distributed." });
      return;
    }
    const raw = req.cookies?.remember_token || req.body?.rememberToken;
    const token = typeof raw === "string" ? raw.trim() : "";
    if (!token) {
      res.status(401).json({ error: "Sesión de refresco no encontrada." });
      return;
    }
    const userId = await resolveRememberToken(token);
    if (!userId) {
      res.status(401).json({ error: "Sesión de refresco inválida o vencida." });
      return;
    }
    const row = await findUserRowById(userId);
    if (!row) {
      res.status(401).json({ error: "Usuario no encontrado." });
      return;
    }
    const { token: accessToken, jti, exp } = signAccessToken({
      userId: row.userId,
      username: row.username,
      passwordVersion: row.passwordVersion ?? 0,
    });
    const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
    await registerAccessTokenInRedis(row.userId, jti, ttl);
    res.setHeader("Authorization", `Bearer ${accessToken}`);
    res.json({
      accessToken: accessToken,
      tokenType: "Bearer",
      expiresIn: ttl,
    });
  });

  router.post("/forgot-password", express.json({ limit: "16kb" }), async (req, res) => {
    const username = asText(req.body?.username, true);
    const generic = { ok: true, message: "Si el usuario existe y tiene correo, recibirás un enlace." };
    console.log(
      `[auth/forgot-password] solicitud recibida; mode=${getAuthMode()} username=${username || "(vacío)"}`
    );
    if (getAuthMode() !== "distributed") {
      console.warn("[auth/forgot-password] omitido: AUTH_STORE no es distributed.");
      res.json(generic);
      return;
    }
    if (!username) {
      console.warn("[auth/forgot-password] omitido: username vacío.");
      res.json(generic);
      return;
    }
    const row = await findUserRowByUsername(username);
    if (!row?.email) {
      console.warn("[auth/forgot-password] usuario sin correo o no encontrado.");
      res.json(generic);
      return;
    }
    const resetTok = await createPasswordResetToken(row.userId);
    if (!resetTok) {
      console.error("[auth/forgot-password] fallo creando token en Redis.");
      res.status(503).json({ error: "Redis no disponible." });
      return;
    }
    const base = (process.env.APP_PUBLIC_URL || "http://localhost:5173").replace(/\/$/, "");
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(resetTok)}`;
    console.log(`[auth/forgot-password] token creado para ${row.email}. Intentando envío...`);
    void sendPasswordResetEmail({ to: row.email, resetUrl }).catch((e) =>
      console.error("reset email:", e.message)
    );
    res.json(generic);
  });

  router.post("/reset-password", express.json({ limit: "32kb" }), async (req, res) => {
    const token = asText(req.body?.token, true);
    const newPassword = asText(req.body?.newPassword, false);
    if (!token || newPassword.length < 8) {
      res.status(400).json({ error: "Token o contraseña inválidos." });
      return;
    }
    if (getAuthMode() !== "distributed") {
      res.status(501).json({ error: "No disponible en modo json." });
      return;
    }
    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      res.status(400).json({ error: "Token inválido o vencido." });
      return;
    }
    try {
      await updatePasswordDistributed(userId, newPassword);
    } catch {
      res.status(500).json({ error: "No se pudo actualizar la contraseña." });
      return;
    }
    res.json({ ok: true });
  });

  router.put("/change-password", requireAuth, express.json({ limit: "32kb" }), async (req, res) => {
    const current = asText(req.body?.currentPassword, false);
    const next = asText(req.body?.newPassword, false);
    if (!current || next.length < 8) {
      res.status(400).json({ error: "Datos inválidos." });
      return;
    }
    if (getAuthMode() === "distributed") {
      const row = await findUserRowById(req.user.id);
      if (!row || !(await verifyPassword(current, row.passwordHash))) {
        res.status(401).json({ error: "Contraseña actual incorrecta." });
        return;
      }
      try {
        await updatePasswordDistributed(req.user.id, next);
      } catch {
        res.status(500).json({ error: "No se pudo actualizar." });
        return;
      }
      await revokeAccessTokenInRedis(req.user.id, req.user.jti);
      return res.json({ ok: true });
    }

    const u = getById(req.user.id);
    if (!u || !(await verifyJsonPassword(u, current))) {
      res.status(401).json({ error: "Contraseña actual incorrecta." });
      return;
    }
    const { salt, passwordHash } = await hashPasswordWithSalt(next);
    u.passwordHash = passwordHash;
    u.salt = salt;
    flushUsersToDisk();
    res.json({ ok: true });
  });

  router.get("/me", async (req, res) => {
    if (getAuthMode() === "distributed") {
      const hdr = (req.headers.authorization || "").toString();
      const m = /^Bearer\s+(.+)$/i.exec(hdr);
      if (!m) {
        res.status(401).json({ error: "Sesión requerida." });
        return;
      }
      try {
        const payload = verifyAccessToken(m[1]);
        const redis = getRedis();
        if (redis) {
          const st = await redis.get(`jwt:${payload.jti}`);
          if (st !== "valid") {
            res.status(401).json({ error: "Sesión inválida o cerrada." });
            return;
          }
        }
        const row = await findUserRowById(payload.sub);
        if (!row) {
          res.status(401).json({ error: "Sesión inválida." });
          return;
        }
        const dbPv = row.passwordVersion ?? 0;
        const tokenPv = Number(payload.pv ?? 0);
        if (dbPv !== tokenPv) {
          res.status(401).json({ error: "Contraseña actualizada: vuelve a iniciar sesión." });
          return;
        }
        const user = await loadPublicProfile(payload.sub);
        if (!user) {
          res.status(401).json({ error: "Sesión inválida." });
          return;
        }
        res.json({ user });
      } catch {
        res.status(401).json({ error: "Sesión inválida." });
      }
      return;
    }

    const hdr = (req.headers.authorization || "").toString();
    const bm = /^Bearer\s+(.+)$/i.exec(hdr);
    if (bm) {
      try {
        const payload = verifyAccessToken(bm[1]);
        const u = getById(payload.sub);
        if (!u) {
          res.status(401).json({ error: "Sesión inválida." });
          return;
        }
        res.json({ user: publicUser(u) });
      } catch {
        res.status(401).json({ error: "Sesión inválida." });
      }
      return;
    }

    const uid = req.signedCookies?.tec_uid;
    if (!uid) {
      res.status(401).json({ error: "Sesión requerida." });
      return;
    }
    const u = getById(uid);
    if (!u) {
      res.clearCookie("tec_uid", { path: "/" });
      res.status(401).json({ error: "Sesión inválida." });
      return;
    }
    res.json({ user: publicUser(u) });
  });

  return router;
}
