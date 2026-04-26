import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

function getSecret() {
  const s = (process.env.JWT_SECRET || process.env.COOKIE_SECRET || "").trim();
  if (!s) throw new Error("JWT_SECRET o COOKIE_SECRET no configurado");
  return s;
}

/**
 * @param {{ userId: string, username: string, passwordVersion?: number }} p
 * @returns {{ token: string, jti: string, exp: number }}
 */
export function signAccessToken(p) {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "1h").trim();
  const jti = randomUUID();
  const pv = Number(p.passwordVersion ?? 0) || 0;
  const payload = { sub: p.userId, username: p.username, jti, pv };
  const token = jwt.sign(payload, getSecret(), { expiresIn, algorithm: "HS256" });
  const decoded = jwt.decode(token);
  const exp = typeof decoded?.exp === "number" ? decoded.exp : 0;
  return { token, jti, exp };
}

/** @param {string} token */
export function verifyAccessToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
}
