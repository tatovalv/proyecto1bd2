import { getAuthMode } from "../config/authMode.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { getRedis } from "../config/redis.js";
import { findUserRowById } from "../services/authExtended.service.js";
import { getRoleByUserId } from "../services/distributedAuth.js";

/**
 * Requiere cabecera `Authorization: Bearer <jwt>`.
 * En modo `distributed` comprueba Redis `jwt:<jti> === valid`.
 */
export async function requireAuth(req, res, next) {
  const hdr = (req.headers.authorization || "").toString();
  const m = /^Bearer\s+(.+)$/i.exec(hdr);
  if (!m) {
    res.status(401).json({ error: "Sesión requerida." });
    return;
  }
  try {
    const payload = verifyAccessToken(m[1]);
    if (getAuthMode() === "distributed") {
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
    }
    req.user = {
      id: payload.sub,
      username: payload.username,
      jti: payload.jti,
      role:
        getAuthMode() === "distributed"
          ? await getRoleByUserId(payload.sub)
          : "student",
    };
    next();
  } catch {
    res.status(401).json({ error: "Sesión inválida." });
  }
}
