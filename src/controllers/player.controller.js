// src/controllers/player.controller.js
import { getPlayerFullStats } from "../services/r6.service.js";

export async function getPlayer(req, res) {
    const { username, platform } = req.query;

    if (!username) {
        return res.status(400).json({ error: "username is required" });
    }

    try {
        const data = await getPlayerFullStats(platform || "pc", username);

        if (!data) {
            return res.status(404).json({ error: "Player not found" });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch player." });
    }
}
