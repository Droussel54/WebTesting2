// src/controllers/player.controller.js
import { isDemoMode } from "./mode.controller.js";
import { placeholderPlayers } from "../services/demo-data.service.js";
import { getSinglePlayer } from "../services/ubisoft.service.js";

export async function getPlayer(req, res) {
    const { username, platform } = req.query;

    if (!username) {
        return res.status(400).json({ error: "username is required" });
    }

    if (isDemoMode()) {
        const p =
            placeholderPlayers.find(x => x.username.toLowerCase() === username.toLowerCase()) ||
            placeholderPlayers[0];
        return res.json(p);
    }

    try {
        const data = await getSinglePlayer(username, platform);
        res.json(data);
    } catch (err) {
        console.error("Error in /api/player:", err);
        res.status(500).json({ error: "Failed to fetch player" });
    }
}
