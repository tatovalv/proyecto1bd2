import Redis from "ioredis";

/** @type {Redis | Redis.Cluster | null} */
let client = null;

export function getRedis() {
  return client;
}

function parseNodes() {
  const raw = (process.env.REDIS_NODES || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const [host, portStr] = part.includes(":") ? part.split(":") : [part, "6379"];
      return { host: host.trim(), port: Number(portStr) || 6379 };
    });
}

function buildLocalNatMap(nodes) {
  const byPort = new Map(nodes.map((n) => [n.port, n]));
  const n1 = byPort.get(7000);
  const n2 = byPort.get(7001);
  const n3 = byPort.get(7002);
  const isLocal = (h) => h === "localhost" || h === "127.0.0.1";

  if (!n1 || !n2 || !n3) return undefined;
  if (!isLocal(n1.host) || !isLocal(n2.host) || !isLocal(n3.host)) return undefined;

  return {
    "redis-node1:7000": { host: n1.host, port: n1.port },
    "redis-node2:7000": { host: n2.host, port: n2.port },
    "redis-node3:7000": { host: n3.host, port: n3.port },
  };
}

/**
 * Cluster (3 masters) o instancia única según `REDIS_MODE` o cantidad de nodos.
 */
export async function connectRedis() {
  const nodes = parseNodes();
  if (!nodes.length) {
    client = null;
    return null;
  }

  if (client) {
    await client.quit().catch(() => {});
    client = null;
  }

  const mode = (process.env.REDIS_MODE || "").trim().toLowerCase();
  const useCluster =
    mode === "cluster" || (mode !== "standalone" && nodes.length >= 3);

  const redisOptions = {
    maxRetriesPerRequest: 3,
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 10_000,
  };

  if (useCluster) {
    const natMap = buildLocalNatMap(nodes);
    client = new Redis.Cluster(
      nodes.map((n) => ({ host: n.host, port: n.port })),
      {
        redisOptions,
        ...(natMap ? { natMap } : {}),
        clusterRetryStrategy(times) {
          return Math.min(times * 200, 2000);
        },
      }
    );
  } else {
    const n = nodes[0];
    client = new Redis({
      host: n.host,
      port: n.port,
      ...redisOptions,
    });
  }

  await client.ping();
  return client;
}

export async function closeRedis() {
  if (!client) return;
  await client.quit().catch(() => {});
  client = null;
}
