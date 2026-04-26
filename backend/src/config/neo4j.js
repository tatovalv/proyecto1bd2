import neo4j from "neo4j-driver";

/** @type {import('neo4j-driver').Driver | null} */
let driver = null;

export function getNeo4jDriver() {
  return driver;
}

export async function connectNeo4j() {
  const uri = (process.env.NEO4J_URI || "").trim();
  if (!uri) {
    driver = null;
    return null;
  }
  const user = (process.env.NEO4J_USER || "neo4j").trim();
  const password = String(process.env.NEO4J_PASSWORD ?? "");

  if (driver) {
    await driver.close().catch(() => {});
    driver = null;
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  await driver.verifyConnectivity();
  return driver;
}

/**
 * Índices y restricciones mínimas para usuarios (HU1).
 */
export async function ensureNeo4jSchema() {
  if (!driver) return;
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    // En Neo4j no se debe mezclar modificación de schema con escrituras de datos
    // dentro de la misma transacción.
    await session.executeWrite(async (tx) => {
      await tx.run(
        "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE"
      );
      await tx.run("CREATE INDEX user_username IF NOT EXISTS FOR (u:User) ON (u.username)");
      await tx.run(
        "CREATE CONSTRAINT course_id_unique IF NOT EXISTS FOR (c:Course) REQUIRE c.id IS UNIQUE"
      );
      await tx.run("CREATE INDEX course_code IF NOT EXISTS FOR (c:Course) ON (c.code)");
      await tx.run("CREATE INDEX course_published IF NOT EXISTS FOR (c:Course) ON (c.published)");
    });
    await session.executeWrite(async (tx) => {
      await tx.run(
        "MATCH (u:User) WHERE u.role IS NULL SET u.role = 'student'"
      );
    });
  } finally {
    await session.close();
  }
}

export async function shutdownNeo4j() {
  if (!driver) return;
  await driver.close().catch(() => {});
  driver = null;
}
