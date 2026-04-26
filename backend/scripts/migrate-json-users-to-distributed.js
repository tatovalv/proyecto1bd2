import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { types } from "cassandra-driver";
import neo4j from "neo4j-driver";
import { connectCassandra, shutdownCassandra } from "../src/config/cassandra.js";
import { connectNeo4j, shutdownNeo4j, getNeo4jDriver } from "../src/config/neo4j.js";
import { getCassandraClient } from "../src/config/cassandra.js";

function ks() {
  return (process.env.CASSANDRA_KEYSPACE || "tec_digitalito").trim();
}

function parseUsernamesArg() {
  const raw = process.argv[2] || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function readJsonUsers() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const usersPath = path.join(__dirname, "..", "data", "users.json");
  const txt = await fs.readFile(usersPath, "utf8");
  const parsed = JSON.parse(txt);
  return Array.isArray(parsed) ? parsed : [];
}

async function upsertCassandraUser(client, u) {
  const userId = types.Uuid.fromString(u.id);
  const createdAt = u.createdAt ? new Date(u.createdAt) : new Date();
  const failedAttempts = Number(u.failedLoginAttempts || 0);
  const lockedUntil = u.lockedUntil ? new Date(u.lockedUntil) : null;
  const passwordVersion = Number(u.passwordVersion || 0);

  await client.execute(
    `INSERT INTO ${ks()}.users_auth (user_id, username, password_hash, salt, email, failed_attempts, locked_until, created_at, password_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      u.username,
      u.passwordHash,
      u.salt,
      u.email || null,
      failedAttempts,
      lockedUntil,
      createdAt,
      passwordVersion,
    ],
    { prepare: true }
  );
}

async function upsertNeo4jUser(driver, u) {
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    await session.executeWrite((tx) =>
      tx.run(
        `MERGE (n:User {id: $id})
         SET n.username = $username,
             n.fullName = $fullName,
             n.birthDate = $birthDate,
             n.avatarUrl = $avatarUrl,
             n.email = $email,
             n.role = coalesce(n.role, 'student')`,
        {
          id: u.id,
          username: u.username,
          fullName: u.fullName || null,
          birthDate: u.dateOfBirth || null,
          avatarUrl: u.avatarPath || null,
          email: u.email || null,
        }
      )
    );
  } finally {
    await session.close();
  }
}

async function main() {
  const usernames = parseUsernamesArg();
  if (!usernames.length) {
    console.error("Uso: node scripts/migrate-json-users-to-distributed.js user1,user2");
    process.exit(1);
  }

  const jsonUsers = await readJsonUsers();
  const selected = jsonUsers.filter((u) => usernames.includes(u.username));
  if (!selected.length) {
    console.error("No se encontraron usuarios en JSON para migrar.");
    process.exit(1);
  }

  const missing = usernames.filter((name) => !selected.some((u) => u.username === name));
  if (missing.length) {
    console.warn(`Aviso: no encontrados en JSON: ${missing.join(", ")}`);
  }

  await connectCassandra();
  await connectNeo4j();
  const cassandra = getCassandraClient();
  const neo = getNeo4jDriver();
  if (!cassandra || !neo) {
    throw new Error("No se pudo conectar a Cassandra o Neo4j.");
  }

  for (const u of selected) {
    await upsertCassandraUser(cassandra, u);
    await upsertNeo4jUser(neo, u);
    console.log(`Migrado: ${u.username} (email=${u.email || "null"})`);
  }

  console.log(`Migración completada. Total migrados: ${selected.length}`);
}

main()
  .catch((err) => {
    console.error("Error en migración:", err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownNeo4j();
    await shutdownCassandra();
  });

