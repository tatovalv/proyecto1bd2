import http from "http";
import { createApp } from "../src/app.js";

const app = createApp();
const server = http.createServer(app);
server.listen(0, async () => {
  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/api/health`);
  const body = await res.json();
  console.log(body);
  server.close();
  if (!body.ok) process.exit(1);
});
