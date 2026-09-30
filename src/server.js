import { existsSync } from "node:fs";
import { createApp } from "./app/app.js";
import { loadConfig } from "./app/config.js";

if (existsSync(".env")) process.loadEnvFile(".env");

const config = loadConfig();
const app = createApp({ config });

app.listen(config.port, () => {
  console.log(`[eventos] Agenda en http://localhost:${config.port} (datos: ${config.events.source})`);
});
