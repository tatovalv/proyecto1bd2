import { types } from "cassandra-driver";
import neo4j from "neo4j-driver";
import { getCassandraClient } from "../config/cassandra.js";
import { getNeo4jDriver } from "../config/neo4j.js";
import { getRedis } from "../config/redis.js";
import { hashPasswordWithSalt, verifyPassword } from "../lib/password.js";
import { signAccessToken } from "../lib/jwt.js";
import { MAX_FAILED_LOGIN_ATTEMPTS, lockoutDurationMs } from "../lib/lockoutConfig.js";
import { clientIp } from "../lib/requestMeta.js";
import {
  findUserRowByUsername,
  writeAccessLog,
  getRecentSuccessfulLoginIps,
  revokeRememberTokensForUser,
  issueRememberToken,
  registerAccessTokenInRedis,
} from "./authExtended.service.js";
import { sendSuspiciousLoginAlert } from "../lib/mailer.js";

function ks() {
  return (process.env.CASSANDRA_KEYSPACE || "tec_digitalito").trim();
}

/** @param {string} username */
async function neo4jUsernameTaken(username) {
  const driver = getNeo4jDriver();
  if (!driver) return false;
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run(
        "MATCH (u:User) WHERE toLower(u.username) = toLower($username) RETURN u.id AS id LIMIT 1",
        { username }
      )
    );
    return res.records.length > 0;
  } finally {
    await session.close();
  }
}

/**
 * @param {import('express').Request} req
 * @param {object} p
 */
export async function registerDistributed(req, p) {
  const { username, password, fullName, dateOfBirth, email, avatarPath } = p;
  const role = p.role === "teacher" ? "teacher" : "student";
  const client = getCassandraClient();
  const driver = getNeo4jDriver();
  if (!client || !driver) {
    return { ok: false, status: 500, error: "Servicio de datos no disponible." };
  }

  const row = await findUserRowByUsername(username);
  if (row) {
    return { ok: false, status: 409, error: "Este nombre de usuario ya está en uso." };
  }
  if (await neo4jUsernameTaken(username)) {
    return { ok: false, status: 409, error: "Este nombre de usuario ya está en uso." };
  }

  const userId = types.Uuid.random();
  const userIdStr = userId.toString();
  const { salt, passwordHash } = await hashPasswordWithSalt(password);
  const createdAt = new Date();

  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `CREATE (u:User {
          id: $id,
          username: $username,
          fullName: $fullName,
          birthDate: $birthDate,
          avatarUrl: $avatarUrl,
          email: $email,
          role: $role,
          createdAt: datetime()
        })`,
        {
          id: userIdStr,
          username,
          fullName,
          birthDate: dateOfBirth,
          avatarUrl: avatarPath,
          email: email || null,
          role,
        }
      );
    });
  } catch (e) {
    console.error("Neo4j register:", e.message);
    return { ok: false, status: 500, error: "No se pudo crear el perfil de usuario." };
  } finally {
    await session.close();
  }

  try {
    await client.execute(
      `INSERT INTO ${ks()}.users_auth (user_id, username, password_hash, salt, email, failed_attempts, locked_until, created_at, password_version)
       VALUES (?, ?, ?, ?, ?, 0, null, ?, 0)`,
      [userId, username, passwordHash, salt, email || null, createdAt],
      { prepare: true }
    );
  } catch (e) {
    console.error("Cassandra register:", e.message);
    const s2 = driver.session({ defaultAccessMode: neo4j.session.WRITE });
    try {
      await s2.executeWrite(async (tx) => {
        await tx.run("MATCH (u:User {id: $id}) DETACH DELETE u", { id: userIdStr });
      });
    } finally {
      await s2.close();
    }
    return { ok: false, status: 500, error: "No se pudo guardar la credencial del usuario." };
  }

  await writeAccessLog(req, userIdStr, "register_success").catch(() => {});

  return {
    ok: true,
    user: {
      id: userIdStr,
      username,
      fullName,
      dateOfBirth,
      avatarUrl: avatarPath,
      role,
    },
  };
}

function isLocked(lockedUntil) {
  if (!lockedUntil) return { blocked: false };
  const untilMs = lockedUntil instanceof Date ? lockedUntil.getTime() : new Date(lockedUntil).getTime();
  if (Number.isNaN(untilMs)) return { blocked: false };
  if (Date.now() >= untilMs) return { blocked: false };
  const iso = lockedUntil instanceof Date ? lockedUntil.toISOString() : new Date(lockedUntil).toISOString();
  return { blocked: true, lockedUntil: iso };
}

/**
 * @param {import('express').Request} req
 * @param {boolean} [rememberMe]
 */
export async function loginDistributed(req, username, password, rememberMe = false) {
  const INVALID = "Credenciales inválidas";
  const client = getCassandraClient();
  const redis = getRedis();
  if (!client || !redis) {
    return { ok: false, status: 500, error: "Servicio de datos no disponible." };
  }

  const row = await findUserRowByUsername(username);
  if (!row) {
    return { ok: false, status: 401, error: INVALID };
  }

  if (row.lockedUntil) {
    const untilMs =
      row.lockedUntil instanceof Date
        ? row.lockedUntil.getTime()
        : new Date(row.lockedUntil).getTime();
    if (!Number.isNaN(untilMs) && Date.now() >= untilMs) {
      await client.execute(
        `UPDATE ${ks()}.users_auth SET failed_attempts = 0, locked_until = null WHERE user_id = ?`,
        [types.Uuid.fromString(row.userId)],
        { prepare: true }
      );
      row.failedAttempts = 0;
      row.lockedUntil = null;
    }
  }

  const lock = isLocked(row.lockedUntil);
  if (lock.blocked) {
    return {
      ok: false,
      status: 423,
      error:
        "Tu cuenta está bloqueada temporalmente por varios intentos fallidos. Vuelve a intentar más tarde.",
      lockedUntil: lock.lockedUntil,
    };
  }

  const passwordOk = await verifyPassword(password, row.passwordHash);
  if (!passwordOk) {
    const nextAttempts = (row.failedAttempts ?? 0) + 1;
    let lockedUntil = null;
    if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + lockoutDurationMs());
    }
    await client.execute(
      `UPDATE ${ks()}.users_auth SET failed_attempts = ?, locked_until = ? WHERE user_id = ?`,
      [nextAttempts, lockedUntil, types.Uuid.fromString(row.userId)],
      { prepare: true }
    );
    await writeAccessLog(req, row.userId, "login_failed").catch(() => {});
    return {
      ok: false,
      status: 401,
      error: INVALID,
      notify: {
        email: row.email,
        username: row.username,
        failedAttempts: nextAttempts,
        accountLocked: Boolean(lockedUntil),
        lockedUntilIso: lockedUntil ? lockedUntil.toISOString() : null,
      },
    };
  }

  await client.execute(
    `UPDATE ${ks()}.users_auth SET failed_attempts = 0, locked_until = null WHERE user_id = ?`,
    [types.Uuid.fromString(row.userId)],
    { prepare: true }
  );

  const ip = clientIp(req);
  const lastIps = await getRecentSuccessfulLoginIps(row.userId);
  let suspicious = false;
  if (lastIps.length >= 3 && !lastIps.includes(ip)) {
    suspicious = true;
    await writeAccessLog(req, row.userId, "suspicious").catch(() => {});
    void sendSuspiciousLoginAlert({
      email: row.email,
      username: row.username,
      ip,
      previousIps: lastIps,
    }).catch((err) => console.error("correo sospechoso:", err.message));
    await revokeRememberTokensForUser(row.userId);
  }

  const loggedInAt = new Date().toISOString();
  await writeAccessLog(req, row.userId, "login_success").catch(() => {});

  const pv = row.passwordVersion ?? 0;
  const { token, jti, exp } = signAccessToken({
    userId: row.userId,
    username: row.username,
    passwordVersion: pv,
  });
  const ttl = Math.max(1, exp - Math.floor(Date.now() / 1000));
  await registerAccessTokenInRedis(row.userId, jti, ttl);

  let rememberCookie = null;
  if (rememberMe) {
    const rem = await issueRememberToken(row.userId);
    if (rem) {
      rememberCookie = {
        name: "remember_token",
        value: rem.token,
        maxAge: rem.ttlSeconds * 1000,
      };
    }
  }

  return {
    ok: true,
    accessToken: token,
    tokenType: "Bearer",
    expiresIn: ttl,
    user: await loadPublicProfile(row.userId),
    loggedInAt,
    authorizationHeader: `Bearer ${token}`,
    rememberCookie,
    suspicious,
  };
}

/** @param {string} userId */
export async function loadPublicProfile(userId) {
  const driver = getNeo4jDriver();
  if (!driver) return null;
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run(
        "MATCH (u:User {id: $id}) RETURN u.id AS id, u.username AS username, u.fullName AS fullName, u.birthDate AS birthDate, u.avatarUrl AS avatarUrl, coalesce(u.role, 'student') AS role LIMIT 1",
        { id: userId }
      )
    );
    if (!res.records.length) return null;
    const r = res.records[0];
    return {
      id: r.get("id"),
      username: r.get("username"),
      fullName: r.get("fullName"),
      dateOfBirth: r.get("birthDate"),
      avatarUrl: r.get("avatarUrl"),
      role: r.get("role") || "student",
      lastLoginAt: null,
    };
  } finally {
    await session.close();
  }
}

/** @param {string} userId */
export async function getRoleByUserId(userId) {
  const driver = getNeo4jDriver();
  if (!driver) return "student";
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.executeRead((tx) =>
      tx.run(
        "MATCH (u:User {id: $id}) RETURN coalesce(u.role, 'student') AS role LIMIT 1",
        { id: userId }
      )
    );
    return String(res.records[0]?.get("role") || "student").toLowerCase();
  } finally {
    await session.close();
  }
}
