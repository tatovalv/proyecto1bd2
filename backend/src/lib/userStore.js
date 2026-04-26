/**
 * Usuarios en memoria + respaldo en archivo JSON (paso 1).
 * En el paso 2 se migra el núcleo de auth a Cassandra + Neo4j.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MAX_FAILED_LOGIN_ATTEMPTS, lockoutDurationMs } from "./lockoutConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "..", "data", "users.json");

const byUsername = new Map();
const byId = new Map();

/** @param {string} username */
function norm(username) {
  return username.trim().toLowerCase();
}

function loadFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, "utf8").trim();
    if (!raw) return;
    const users = JSON.parse(raw);
    if (!Array.isArray(users)) return;
    for (const user of users) {
      if (user?.id && user?.username != null) {
        byUsername.set(norm(user.username), user);
        byId.set(user.id, user);
      }
    }
  } catch {
    // archivo ausente o corrupto: empezar vacío
  }
}

function persistToDisk() {
  try {
    const dir = path.dirname(DATA_FILE);
    fs.mkdirSync(dir, { recursive: true });
    const users = [...byId.values()];
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (e) {
    console.error("TEC Digitalito: no se pudo guardar data/users.json:", e.message);
  }
}

loadFromDisk();

/** @param {import('./userTypes.js').StoredUser} user */
export function saveUser(user) {
  const key = norm(user.username);
  if (byUsername.has(key)) return { ok: false, reason: "USERNAME_TAKEN" };
  byUsername.set(key, user);
  byId.set(user.id, user);
  persistToDisk();
  return { ok: true, user };
}

/** @param {string} username */
export function getByUsername(username) {
  return byUsername.get(norm(username)) ?? null;
}

/** @param {string} id */
export function getById(id) {
  return byId.get(id) ?? null;
}

/**
 * @param {import('./userTypes.js').StoredUser} user
 * @returns {{ blocked: false } | { blocked: true, lockedUntil: string }}
 */
export function ensureLoginAllowed(user) {
  if (!user.lockedUntil) return { blocked: false };
  const untilMs = new Date(user.lockedUntil).getTime();
  if (Number.isNaN(untilMs)) {
    user.lockedUntil = null;
    user.failedLoginAttempts = 0;
    persistToDisk();
    return { blocked: false };
  }
  if (Date.now() >= untilMs) {
    user.lockedUntil = null;
    user.failedLoginAttempts = 0;
    persistToDisk();
    return { blocked: false };
  }
  return { blocked: true, lockedUntil: user.lockedUntil };
}

/**
 * @param {import('./userTypes.js').StoredUser} user
 * @returns {{ failedAttempts: number, accountLocked: boolean, lockedUntilIso: string | null }}
 */
export function recordFailedLogin(user) {
  const prev = user.failedLoginAttempts ?? 0;
  user.failedLoginAttempts = prev + 1;
  let accountLocked = false;
  let lockedUntilIso = null;
  if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    user.lockedUntil = new Date(Date.now() + lockoutDurationMs()).toISOString();
    lockedUntilIso = user.lockedUntil;
    accountLocked = true;
  }
  persistToDisk();
  return {
    failedAttempts: user.failedLoginAttempts,
    accountLocked,
    lockedUntilIso,
  };
}

/**
 * @param {import('./userTypes.js').StoredUser} user
 * @returns {string} ISO 8601 del evento registrado
 */
export function recordSuccessfulLogin(user) {
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  const at = new Date().toISOString();
  user.lastLoginAt = at;
  if (!user.loginHistory) user.loginHistory = [];
  user.loginHistory.push(at);
  persistToDisk();
  return at;
}

export function countUsers() {
  return byUsername.size;
}

/** Persiste cambios en usuarios ya cargados (p. ej. cambio de contraseña). */
export function flushUsersToDisk() {
  persistToDisk();
}
