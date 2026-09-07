import { Hono } from "hono";

const app = new Hono();

app.get("/", (context) => context.text("This is api"));

export default app;
