import { getAuthMode } from "./config/authMode.js";
import { connectCassandra, shutdownCassandra } from "./config/cassandra.js";
import { ensureCassandraSchema } from "./config/cassandra-init.js";
import { connectNeo4j, ensureNeo4jSchema, shutdownNeo4j } from "./config/neo4j.js";
import { connectRedis, closeRedis } from "./config/redis.js";
import { connectMongo, disconnectMongo } from "./config/mongodb.js";

async function connectMongoWithLog() {
  const mongo = await connectMongo();
  if (mongo) {
    console.log("TEC Digitalito: MongoDB conectado.");
  } else {
    console.warn(
      "TEC Digitalito: MONGODB_URI no definido — cursos/evaluaciones/mensajes requieren MongoDB Atlas."
    );
  }
  return mongo;
}

export async function bootstrap() {
  if (getAuthMode() === "distributed") {
    const missing = [];
    if (!(process.env.CASSANDRA_CONTACT_POINTS || "").trim()) missing.push("CASSANDRA_CONTACT_POINTS");
    if (!(process.env.NEO4J_URI || "").trim()) missing.push("NEO4J_URI");
    if (!(process.env.REDIS_NODES || "").trim()) missing.push("REDIS_NODES");
    if (!(process.env.JWT_SECRET || "").trim()) missing.push("JWT_SECRET");
    if (missing.length) {
      throw new Error(
        `Modo distributed: faltan variables de entorno: ${missing.join(", ")}. ` +
          "Define AUTH_STORE=json para desarrollo solo con archivo."
      );
    }

    const cassandra = await connectCassandra();
    if (!cassandra) {
      throw new Error("No se pudo conectar a Cassandra.");
    }
    await ensureCassandraSchema(cassandra);
    console.log("TEC Digitalito: Cassandra listo (keyspace + tablas).");

    await connectNeo4j();
    await ensureNeo4jSchema();
    console.log("TEC Digitalito: Neo4j listo (constraints/índices).");

    console.log(
      "TEC Digitalito: conectando a Redis y MongoDB en paralelo (Mongo no espera a que Redis termine)."
    );
    await Promise.all([
      (async () => {
        await connectRedis();
        console.log("TEC Digitalito: Redis listo.");
      })(),
      connectMongoWithLog(),
    ]);
  } else {
    console.log("TEC Digitalito: AUTH_STORE=json (sin Cassandra/Redis en el arranque).");
    if ((process.env.NEO4J_URI || "").trim()) {
      await connectNeo4j();
      await ensureNeo4jSchema();
      console.log("TEC Digitalito: Neo4j listo (modo json + grafo para cursos).");
    }
    await connectMongoWithLog();
  }
}

export async function shutdownInfra() {
  await disconnectMongo();
  await closeRedis();
  await shutdownNeo4j();
  await shutdownCassandra();
}
