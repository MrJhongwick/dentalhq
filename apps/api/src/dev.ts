import { serve } from "@hono/node-server";
import app from "./index";

serve({
  fetch: app.fetch,
  hostname: "127.0.0.1",
  port: 3003,
});

console.log("API running at http://localhost:3003");
