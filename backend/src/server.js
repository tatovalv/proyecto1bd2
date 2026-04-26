import "dotenv/config";
import { bootstrap } from "./bootstrap.js";
import { createApp } from "./app.js";

const preferredPort = Number(process.env.PORT) || 3000;
const maxPortAttempts = 10;

function start(port, attemptsLeft) {
  const app = createApp();
  const server = app.listen(port, () => {
    if (port !== preferredPort) {
      console.log(
        `Puerto ${preferredPort} en uso; usando ${port}. Cierra el otro proceso o define PORT.`
      );
    }
    console.log(`TEC Digitalito API → http://localhost:${port} (PID ${process.pid})`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 1) {
      server.close(() => start(port + 1, attemptsLeft - 1));
      return;
    }
    if (err.code === "EADDRINUSE") {
      console.error(
        `No hay puerto libre entre ${preferredPort} y ${preferredPort + maxPortAttempts - 1}.`
      );
      process.exit(1);
      return;
    }
    console.error(err);
    process.exit(1);
  });
}

try {
  await bootstrap();
} catch (e) {
  console.error("TEC Digitalito: error en arranque:", e.message || e);
  process.exit(1);
}

start(preferredPort, maxPortAttempts);
