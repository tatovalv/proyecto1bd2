import { Router } from "express";
import neo4j from "neo4j-driver";
import { requireAuth } from "../middleware/requireAuth.js";
import { getNeo4jDriver } from "../config/neo4j.js";
export function createUsersRouter() {
  const router = Router();
  const driver = () => getNeo4jDriver();

  router.get("/search", requireAuth, async (req, res) => {
    const d = driver();
    if (!d) return res.status(503).json({ error: "Neo4j no disponible." });
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.status(400).json({ error: "Parámetro q demasiado corto." });
    const session = d.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          "MATCH (u:User) WHERE toLower(u.username) CONTAINS toLower($q) OR toLower(u.fullName) CONTAINS toLower($q) RETURN u.id AS id, u.username AS username, u.fullName AS fullName, u.avatarUrl AS avatarUrl LIMIT 25",
          { q }
        )
      );
      res.json({
        users: result.records.map((r) => ({
          id: r.get("id"),
          username: r.get("username"),
          fullName: r.get("fullName"),
          avatarUrl: r.get("avatarUrl"),
        })),
      });
    } finally {
      await session.close();
    }
  });

  router.get("/friends", requireAuth, async (req, res) => {
    const d = driver();
    if (!d) return res.status(503).json({ error: "Neo4j no disponible." });
    const session = d.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          "MATCH (me:User {id: $id})-[:FRIENDS_WITH]-(f:User) RETURN f.id AS id, f.username AS username, f.fullName AS fullName, f.avatarUrl AS avatarUrl ORDER BY f.username",
          { id: req.user.id }
        )
      );
      res.json({
        friends: result.records.map((r) => ({
          id: r.get("id"),
          username: r.get("username"),
          fullName: r.get("fullName"),
          avatarUrl: r.get("avatarUrl"),
        })),
      });
    } finally {
      await session.close();
    }
  });

  /** Solicitudes entrantes y salientes (para la UI de amistad). */
  router.get("/friend-requests", requireAuth, async (req, res) => {
    const d = driver();
    if (!d) return res.status(503).json({ error: "Neo4j no disponible." });
    const session = d.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const incoming = await session.executeRead((tx) =>
        tx.run(
          `MATCH (from:User)-[:SENT_REQUEST_TO]->(me:User {id: $me})
           RETURN from.id AS id, from.username AS username, from.fullName AS fullName, from.avatarUrl AS avatarUrl
           ORDER BY from.username`,
          { me: req.user.id }
        )
      );
      const outgoing = await session.executeRead((tx) =>
        tx.run(
          `MATCH (me:User {id: $me})-[:SENT_REQUEST_TO]->(to:User)
           WHERE NOT (me)-[:FRIENDS_WITH]-(to)
           RETURN to.id AS id, to.username AS username, to.fullName AS fullName, to.avatarUrl AS avatarUrl
           ORDER BY to.username`,
          { me: req.user.id }
        )
      );
      const mapRow = (r) => ({
        id: r.get("id"),
        username: r.get("username"),
        fullName: r.get("fullName"),
        avatarUrl: r.get("avatarUrl"),
      });
      res.json({
        incoming: incoming.records.map(mapRow),
        outgoing: outgoing.records.map(mapRow),
      });
    } finally {
      await session.close();
    }
  });

  router.get("/:id", requireAuth, async (req, res) => {
    const d = driver();
    if (!d) return res.status(503).json({ error: "Neo4j no disponible." });
    const session = d.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const result = await session.executeRead((tx) =>
        tx.run(
          "MATCH (u:User {id: $id}) RETURN u.id AS id, u.username AS username, u.fullName AS fullName, u.birthDate AS birthDate, u.avatarUrl AS avatarUrl",
          { id: req.params.id }
        )
      );
      if (!result.records.length) return res.status(404).json({ error: "Usuario no encontrado." });
      const r = result.records[0];
      res.json({
        user: {
          id: r.get("id"),
          username: r.get("username"),
          fullName: r.get("fullName"),
          birthDate: r.get("birthDate"),
          avatarUrl: r.get("avatarUrl"),
        },
      });
    } finally {
      await session.close();
    }
  });

  router.post("/:id/friend", requireAuth, async (req, res) => {
    const d = driver();
    if (!d) return res.status(503).json({ error: "Neo4j no disponible." });
    if (req.params.id === req.user.id) return res.status(400).json({ error: "No puedes enviarte solicitud a ti mismo." });
    const session = d.session({ defaultAccessMode: neo4j.session.WRITE });
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (me:User {id: $me}), (other:User {id: $other})
           WHERE NOT (me)-[:FRIENDS_WITH]-(other)
           MERGE (me)-[:SENT_REQUEST_TO]->(other)`,
          { me: req.user.id, other: req.params.id }
        );
      });
      res.status(201).json({ ok: true });
    } finally {
      await session.close();
    }
  });

  router.put("/:id/friend", requireAuth, async (req, res) => {
    const d = driver();
    if (!d) return res.status(503).json({ error: "Neo4j no disponible." });
    const status = String(req.body?.status || "").toLowerCase();
    if (!["accept", "reject"].includes(status)) {
      return res.status(400).json({ error: "status debe ser accept o reject." });
    }
    const session = d.session({ defaultAccessMode: neo4j.session.WRITE });
    try {
      if (status === "accept") {
        await session.executeWrite(async (tx) => {
          await tx.run(
            `MATCH (from:User {id: $from})-[r:SENT_REQUEST_TO]->(me:User {id: $me})
             DELETE r
             WITH from, me
             MERGE (from)-[:FRIENDS_WITH]->(me)
             MERGE (me)-[:FRIENDS_WITH]->(from)`,
            { from: req.params.id, me: req.user.id }
          );
        });
      } else {
        await session.executeWrite(async (tx) => {
          await tx.run(
            "MATCH (:User {id: $from})-[r:SENT_REQUEST_TO]->(:User {id: $me}) DELETE r",
            { from: req.params.id, me: req.user.id }
          );
        });
      }
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo actualizar la solicitud." });
    } finally {
      await session.close();
    }
  });

  router.get("/:id/courses", requireAuth, async (req, res) => {
    const d = driver();
    if (!d) return res.status(503).json({ error: "Neo4j no disponible." });
    const session = d.session({ defaultAccessMode: neo4j.session.READ });
    try {
      const fr = await session.executeRead((tx) =>
        tx.run(
          "MATCH (me:User {id: $me})-[:FRIENDS_WITH]-(f:User {id: $fid}) RETURN count(f) AS n",
          { me: req.user.id, fid: req.params.id }
        )
      );
      if (!fr.records[0]?.get("n")) {
        return res.status(403).json({ error: "Solo puedes ver cursos de usuarios con los que eres amigo." });
      }
      const result = await session.executeRead((tx) =>
        tx.run(
          `MATCH (f:User {id: $fid})-[:TEACHES|ENROLLED_IN]->(c:Course)
           RETURN DISTINCT c.id AS id, c.code AS code, c.name AS name, c.published AS published`,
          { fid: req.params.id }
        )
      );
      res.json({
        courses: result.records.map((r) => ({
          id: r.get("id"),
          code: r.get("code"),
          name: r.get("name"),
          published: r.get("published"),
        })),
      });
    } finally {
      await session.close();
    }
  });

  return router;
}
