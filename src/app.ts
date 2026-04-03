import express from "express";
import type { Express } from "express";
import { logRequest } from "./logger.js";
import healthRoutes from "./routes/health.js";
import mcpRoutes from "./routes/mcp.js";

const app: Express = express();

app.use(express.json({ limit: "50mb" }));
app.use(logRequest);

app.use(healthRoutes);
app.use("/mcp", mcpRoutes);

export default app;
