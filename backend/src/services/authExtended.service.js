import { randomUUID } from "crypto";
import { types } from "cassandra-driver";
import { getCassandraClient } from "../config/cassandra.js";
import { getRedis } from "../config/redis.js";
import { hashPasswordWithSalt } from "../lib/password.js";
import { clientIp, userAgent } from "../lib/requestMeta.js";

function ks() {
  return (process.env.CASSANDRA_KEYSPACE || "tec_digitalito").trim();
}

async function writeAccessLog(req, userId, eventType) {
  const client = getCassandraClient();
  if (!client) return;
  const uid = types.Uuid.fromString(userId);
  await client.execute(
    `INSERT INTO ${ks()}.access_log (user_id, event_time, event_type, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)`,
    [uid, new Date(), eventType, clientIp(req), userAgent(req)],
    { prepare: true }
  );
}

export async function findUserRowById(userId) {
  const client = getCassandraClient();
  if (!client) return null;
  const rs = await client.execute(
    `SELECT user_id, username, password_hash, salt, email, failed_attempts, locked_until, created_at, password_version
     FROM ${ks()}.users_auth WHERE user_id = ?`,
    [types.Uuid.fromString(userId)],
    { prepare: true }
  );
  if (!rs.rowLength) return null;
  const row = rs.first();
  return mapRow(row);
}

export async function findUserRowByUsername(username) {
  const client = getCassandraClient();
  if (!client) return null;
  const rs = await client.execute(
    `SELECT user_id, username, password_hash, salt, email, failed_attempts, locked_until, created_at, password_version
     FROM ${ks()}.users_auth WHERE username = ?`,
    [username],
    { prepare: true }
  );
  if (!rs.rowLength) return null;
  return mapRow(rs.first());
}

/** @param {import('cassandra-driver').types.Row} row */
function mapRow(row) {
  let pv = row.get("password_version");
  if (pv == null || pv === undefined) pv = 0;
  return {
    userId: row.get("user_id").toString(),
    username: row.get("username"),
    passwordHash: row.get("password_hash"),
    salt: row.get("salt"),
    email: row.get("email"),
    failedAttempts: row.get("failed_attempts") ?? 0,
    lockedUntil: row.get("locked_until"),
    passwordVersion: Number(pv) || 0,
  };
}

/**
 * Últimas IPs de login exitoso (máx. 10 filas, filtrar en memoria).
 * @param {string} userId
 */
export async function getRecentSuccessfulLoginIps(userId, limitScan = 30) {
  const client = getCassandraClient();
  if (!client) return [];
  const uid = types.Uuid.fromString(userId);
  const rs = await client.execute(
    `SELECT event_type, ip_address, event_time FROM ${ks()}.access_log WHERE user_id = ? LIMIT ?`,
    [uid, limitScan],
    { prepare: true }
  );
  const ips = [];
  for (const row of rs) {
    if (row.get("event_type") === "login_success") {
      const ip = row.get("ip_address");
      if (ip && !ips.includes(ip)) ips.push(ip);
      if (ips.length >= 3) break;
    }
  }
  return ips;
}

export async function revokeRememberTokensForUser(userId) {
  const redis = getRedis();
  if (!redis) return;
  const setKey = `remember_uid:${userId}`;
  const tokens = await redis.smembers(setKey);
  for (const t of tokens) {
    await redis.del(`remember_t:${t}`);
  }
  await redis.del(setKey);
}

export async function issueRememberToken(userId) {
  const redis = getRedis();
  if (!redis) return null;
  const token = randomUUID();
  const ttl = parseRememberSeconds();
  await redis.set(`remember_t:${token}`, userId, "EX", ttl);
  await redis.sadd(`remember_uid:${userId}`, token);
  await redis.expire(`remember_uid:${userId}`, ttl);
  return { token, ttlSeconds: ttl };
}

function parseRememberSeconds() {
  const raw = (process.env.REMEMBER_ME_EXPIRES_IN || "7d").trim();
  const m = /^(\d+)([dhms])$/i.exec(raw);
  if (!m) return 7 * 86400;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u === "d") return n * 86400;
  if (u === "h") return n * 3600;
  if (u === "m") return n * 60;
  if (u === "s") return n;
  return 7 * 86400;
}

export async function resolveRememberToken(cookieToken) {
  const redis = getRedis();
  if (!redis || !cookieToken) return null;
  const userId = await redis.get(`remember_t:${cookieToken}`);
  return userId || null;
}

export async function createPasswordResetToken(userId) {
  const redis = getRedis();
  if (!redis) return null;
  const token = randomUUID();
  await redis.set(`reset_token:${token}`, userId, "EX", 15 * 60);
  return token;
}

export async function consumePasswordResetToken(token) {
  const redis = getRedis();
  if (!redis) return null;
  const key = `reset_token:${token}`;
  const userId = await redis.get(key);
  if (!userId) return null;
  await redis.del(key);
  return userId;
}

export async function updatePasswordDistributed(userId, newPasswordPlain) {
  const client = getCassandraClient();
  if (!client) throw new Error("NO_CASSANDRA");
  const { salt, passwordHash } = await hashPasswordWithSalt(newPasswordPlain);
  const row = await findUserRowById(userId);
  const nextPv = (row?.passwordVersion ?? 0) + 1;
  await client.execute(
    `UPDATE ${ks()}.users_auth SET password_hash = ?, salt = ?, password_version = ? WHERE user_id = ?`,
    [passwordHash, salt, nextPv, types.Uuid.fromString(userId)],
    { prepare: true }
  );
  await revokeRememberTokensForUser(userId);
  const redis = getRedis();
  if (redis) await revokeAllJwtForUser(userId);
  return nextPv;
}

export async function revokeAllJwtForUser(userId) {
  const redis = getRedis();
  if (!redis) return;
  const pattern = `jwt_uid:${userId}`;
  const jtis = await redis.smembers(pattern);
  for (const jti of jtis) {
    await redis.del(`jwt:${jti}`);
  }
  await redis.del(pattern);
}

export async function registerAccessTokenInRedis(userId, jti, ttlSeconds) {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`jwt:${jti}`, "valid", "EX", ttlSeconds);
  await redis.sadd(`jwt_uid:${userId}`, jti);
  await redis.expire(`jwt_uid:${userId}`, 8 * 86400);
}

export async function revokeAccessTokenInRedis(userId, jti) {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`jwt:${jti}`);
  await redis.srem(`jwt_uid:${userId}`, jti);
}

export { writeAccessLog };
