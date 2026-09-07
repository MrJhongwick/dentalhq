import { serve } from "@hono/node-server";
import app from "./index";

serve({
  fetch: app.fetch,
  port: 8787,
});

console.log("API running at http://localhost:8787");
