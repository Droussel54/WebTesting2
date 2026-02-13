// src/controllers/players.controller.js
import { getPlayersBatch } from "../services/r6.service.js";

export async function postPlayers(req, res) {
    const { players } = req.body || {};

    if (!Array.isArray(players) || players.length === 0) {
        return res.json({ results: [] });
    }

    try {
        const results = await getPlayersBatch(players);
        res.json({ results });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch players." });
    }
}
