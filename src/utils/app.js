// src/utils/app.js
import express from "express";
import cors from "cors";

import playersRoutes from "../routes/players.routes.js";
import playerRoutes from "../routes/player.routes.js";
import seasonalRoutes from "../routes/seasonal.routes.js";
import modeRoutes from "../routes/mode.routes.js";

export function createApp() {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.static("public"));

    app.use("/api/players", playersRoutes);
    app.use("/api/player", playerRoutes);
    app.use("/api/seasonal", seasonalRoutes);
    app.use("/api/mode", modeRoutes);

    // Basic health check
    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });

    return app;
}
