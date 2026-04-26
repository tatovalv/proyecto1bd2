import { Router } from "express";
import { types } from "cassandra-driver";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getCassandraClient } from "../config/cassandra.js";

function ks() {
  return (process.env.CASSANDRA_KEYSPACE || "tec_digitalito").trim();
}

export function createAdminRouter() {
  const router = Router();
  router.use(requireAuth, requireAdmin);

  router.get("/activity-log", async (req, res) => {
    try {
      const userId = String(req.query.userId || "").trim();
      if (!userId) {
        return res.status(400).json({ error: "Query userId (uuid del usuario) es obligatorio." });
      }
      const client = getCassandraClient();
      if (!client) {
        return res.status(503).json({ error: "Cassandra no disponible (¿AUTH_STORE=json?)." });
      }
      const rs = await client.execute(
        `SELECT event_time, event_type, ip_address, user_agent
         FROM ${ks()}.access_log WHERE user_id = ? LIMIT 200`,
        [types.Uuid.fromString(userId)],
        { prepare: true }
      );
      const events = [];
      for (const row of rs) {
        events.push({
          event_time: row.get("event_time"),
          event_type: row.get("event_type"),
          ip_address: row.get("ip_address"),
          user_agent: row.get("user_agent"),
        });
      }
      res.json({ events });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "No se pudo leer la bitácora." });
    }
  });

  return router;
}
