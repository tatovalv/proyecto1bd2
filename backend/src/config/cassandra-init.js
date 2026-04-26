function assertSafeKeyspace(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error("Nombre de keyspace inválido");
  }
  return name;
}

/**
 * Crea keyspace y tablas si no existen (HU1–3 + bitácora).
 * @param {import('cassandra-driver').Client} client - conectado **sin** USE de keyspace aún
 */
export async function ensureCassandraSchema(client) {
  const ks = assertSafeKeyspace((process.env.CASSANDRA_KEYSPACE || "tec_digitalito").trim());
  const rfRaw = Number(process.env.CASSANDRA_REPLICATION_FACTOR);
  const rf = Number.isFinite(rfRaw) && rfRaw > 0 ? Math.floor(rfRaw) : 1;

  await client.execute(
    `CREATE KEYSPACE IF NOT EXISTS ${ks} WITH replication = {'class': 'SimpleStrategy', 'replication_factor': ${rf}}`
  );

  await client.execute(`CREATE TABLE IF NOT EXISTS ${ks}.users_auth (
    user_id uuid PRIMARY KEY,
    username text,
    password_hash text,
    salt text,
    email text,
    failed_attempts int,
    locked_until timestamp,
    created_at timestamp
  )`);

  await client.execute(
    `CREATE INDEX IF NOT EXISTS users_auth_username_idx ON ${ks}.users_auth (username)`
  );

  await client.execute(`CREATE TABLE IF NOT EXISTS ${ks}.access_log (
    user_id uuid,
    event_time timestamp,
    event_type text,
    ip_address text,
    user_agent text,
    PRIMARY KEY (user_id, event_time)
  ) WITH CLUSTERING ORDER BY (event_time DESC)`);

  await client.execute(`CREATE TABLE IF NOT EXISTS ${ks}.active_sessions (
    session_id uuid PRIMARY KEY,
    user_id uuid,
    created_at timestamp,
    expires_at timestamp,
    ip_address text,
    user_agent text
  )`);

  try {
    await client.execute(`ALTER TABLE ${ks}.users_auth ADD password_version int`);
  } catch {
    /* columna ya existe en clusters existentes */
  }

  await client.execute(`USE ${ks}`);
}
