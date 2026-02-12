// src/controllers/player.controller.js
import { getSinglePlayer } from "../services/ubisoft.service.js";

export async function getPlayer(req, res) {
    const { username, platform } = req.query;

    if (!username) {
        return res.status(400).json({ error: "username is required" });
    }

    try {
        const data = await getSinglePlayer(username, platform || "pc");
        res.json(data);
    } catch (err) {
        console.error("Error in /api/player:", err);
        res.status(500).json({ error: "Failed to fetch player" });
    }
}
