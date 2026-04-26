import cassandra from "cassandra-driver";

/** @type {cassandra.Client | null} */
let client = null;

export function getCassandraClient() {
  return client;
}

function contactPoints() {
  return (process.env.CASSANDRA_CONTACT_POINTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function assertSafeKeyspace(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error("Nombre de keyspace inválido");
  }
  return name;
}

async function withRetry(fn, { label, maxAttempts, baseDelayMs }) {
  let lastErr;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = Math.min(30_000, baseDelayMs * 2 ** (i - 1));
      console.warn(`${label}: intento ${i}/${maxAttempts} fallido — ${err.message}. Reintento en ${wait}ms`);
      if (i === maxAttempts) break;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/**
 * Cliente sin keyspace hasta que exista el esquema; luego `USE keyspace`.
 */
export async function connectCassandra() {
  const points = contactPoints();
  if (!points.length) {
    client = null;
    return null;
  }
  const dc = (process.env.CASSANDRA_DATACENTER || "datacenter1").trim();
  const port = Number(process.env.CASSANDRA_PORT) || 9042;

  if (client) {
    await client.shutdown().catch(() => {});
    client = null;
  }

  client = new cassandra.Client({
    contactPoints: points,
    localDataCenter: dc,
    protocolOptions: { port },
  });

  await withRetry(() => client.execute("SELECT release_version FROM system.local"), {
    label: "Cassandra",
    maxAttempts: 10,
    baseDelayMs: 5000,
  });

  assertSafeKeyspace((process.env.CASSANDRA_KEYSPACE || "tec_digitalito").trim());
  return client;
}

export async function shutdownCassandra() {
  if (!client) return;
  await client.shutdown().catch(() => {});
  client = null;
}
