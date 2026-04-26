import neo4j from "neo4j-driver";
import { getNeo4jDriver } from "../config/neo4j.js";

/** Comprueba `role === 'admin'` en Neo4j. */
export async function requireAdmin(req, res, next) {
  const driver = getNeo4jDriver();
  if (!driver) {
    res.status(503).json({ error: "Neo4j no disponible." });
    return;
  }
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const resNeo = await session.executeRead((tx) =>
      tx.run("MATCH (u:User {id: $id}) RETURN coalesce(u.role, 'student') AS role", {
        id: req.user.id,
      })
    );
    const role = resNeo.records[0]?.get("role");
    if (role !== "admin") {
      res.status(403).json({ error: "Solo administradores." });
      return;
    }
    next();
  } finally {
    await session.close();
  }
}
