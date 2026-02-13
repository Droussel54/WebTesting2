// src/controllers/seasonal.controller.js
import { getSeasonalHistory } from "../services/r6.service.js";

export async function getSeasonal(req, res) {
    const { username, platform } = req.query;

    if (!username) {
        return res.status(400).json({ error: "username is required" });
    }

    try {
        const history = await getSeasonalHistory(platform || "pc", username);
        res.json({ username, history });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch seasonal history." });
    }
}
