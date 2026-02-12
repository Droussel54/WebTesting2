// src/app.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import modeRouter from "./routes/mode.routes.js";
import playersRouter from "./routes/players.routes.js";
import playerRouter from "./routes/player.routes.js";
import seasonalRouter from "./routes/seasonal.routes.js";

const app = express();
app.use(express.json());

// static /public
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "..", "public")));

// health
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        devMode: process.env.DEV_MODE === "true"
    });
});

// routes
app.use("/api/mode", modeRouter);
app.use("/api/players", playersRouter);
app.use("/api/player", playerRouter);
app.use("/api/seasonal", seasonalRouter);

export default app;
