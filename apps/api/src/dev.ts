import { serve } from "@hono/node-server";
import app, { database } from "./index";

const server = serve({
  fetch: app.fetch,
  hostname: "127.0.0.1",
  port: 3003,
});

console.log("API running at http://localhost:3003");
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () =>
    server.close(() => {
      void database.close().finally(() => process.exit(0));
    }),
  );
}
