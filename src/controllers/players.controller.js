// src/controllers/players.controller.js
import { getPlayersBatch } from "../services/ubisoft.service.js";

export async function postPlayers(req, res) {
    const { players } = req.body || { players: [] };

    if (!Array.isArray(players) || players.length === 0) {
        return res.json({ results: [] });
    }

    try {
        const results = await getPlayersBatch(players);
        res.json({ results });
    } catch (err) {
        console.error("Error in /api/players:", err);
        res.status(500).json({ error: "Failed to fetch players" });
    }
}
