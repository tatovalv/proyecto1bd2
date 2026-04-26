/**
 * Compatibilidad con usuarios del JSON antiguo (scrypt + sal hex).
 * El modo `distributed` usa solo bcrypt en `password.js`.
 */
import crypto from "crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

function hashScrypt(password, saltHex) {
  const salt = Buffer.from(saltHex, "hex");
  const derived = crypto.scryptSync(password, salt, KEYLEN, SCRYPT_PARAMS);
  return derived.toString("hex");
}

/**
 * @param {string} password
 * @param {string} saltHex
 * @param {string} storedHashHex
 */
export function verifyPasswordScrypt(password, saltHex, storedHashHex) {
  let computed;
  try {
    computed = hashScrypt(password, saltHex);
  } catch {
    return false;
  }
  try {
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(storedHashHex, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
