import express from "express";
import cors from "cors";
import { config } from "./config";
import { initDatabase } from "./database";
import { errorHandler } from "./middleware/errorHandler";
import "./models"; // load associations

import authRoutes from "./routes/auth";
import campaignRoutes from "./routes/campaigns";
import recipientRoutes from "./routes/recipients";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/campaigns", campaignRoutes);
app.use("/api/v1/recipients", recipientRoutes);
app.use("/api/v1/recipient", recipientRoutes); // singular alias per spec

// Health check
app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));

// Error handler
app.use(errorHandler);

export { app };

// Start server (only if run directly, not in tests)
if (require.main === module) {
  initDatabase().then(() => {
    app.listen(config.port, () => {
      console.log(`API running at http://localhost:${config.port}`);
    });
  });
}
