import "dotenv/config";
import neo4j from "neo4j-driver";

function parseArgs() {
  const username = (process.argv[2] || "").trim();
  const role = (process.argv[3] || "").trim().toLowerCase();
  return { username, role };
}

async function main() {
  const { username, role } = parseArgs();
  if (!username || !["student", "teacher", "admin"].includes(role)) {
    console.error("Uso: node scripts/set-user-role.js <username> <student|teacher|admin>");
    process.exit(1);
  }

  const uri = (process.env.NEO4J_URI || "").trim();
  const user = (process.env.NEO4J_USER || process.env.NEO4J_USERNAME || "neo4j").trim();
  const pass = String(process.env.NEO4J_PASSWORD || "");
  if (!uri) {
    throw new Error("NEO4J_URI no definido.");
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    const res = await session.executeWrite((tx) =>
      tx.run(
        "MATCH (u:User) WHERE toLower(u.username)=toLower($username) SET u.role=$role RETURN u.username AS username, u.role AS role LIMIT 1",
        { username, role }
      )
    );
    if (!res.records.length) {
      console.error(`Usuario no encontrado: ${username}`);
      process.exit(1);
    }
    const row = res.records[0];
    console.log(`Rol actualizado: ${row.get("username")} -> ${row.get("role")}`);
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});

