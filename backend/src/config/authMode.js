/**
 * `distributed`: Cassandra + Neo4j + Redis + JWT (HU1–3).
 * `json`: almacén local en archivo (solo desarrollo sin Docker).
 */
export function getAuthMode() {
  const explicit = (process.env.AUTH_STORE || "").trim().toLowerCase();
  if (explicit === "json") return "json";
  if (explicit === "distributed" || explicit === "cassandra") return "distributed";
  const hasCassandra = Boolean((process.env.CASSANDRA_CONTACT_POINTS || "").trim());
  return hasCassandra ? "distributed" : "json";
}
