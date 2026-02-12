// src/controllers/players.controller.js
import { isDemoMode } from "./mode.controller.js";
import { placeholderPlayers } from "../services/demo-data.service.js";
import { getPlayersBatch } from "../services/ubisoft.service.js";

export async function postPlayers(req, res) {
    const { players } = req.body || { players: [] };

    if (isDemoMode()) {
        const results = players.map((p, i) => ({
            success: true,
            data: placeholderPlayers[i % placeholderPlayers.length]
        }));
        return res.json({ results });
    }

    try {
        const results = await getPlayersBatch(players);
        res.json({ results });
    } catch (err) {
        console.error("Error in /api/players:", err);
        res.status(500).json({ error: "Failed to fetch players" });
    }
}
