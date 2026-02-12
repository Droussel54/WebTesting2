// src/controllers/seasonal.controller.js
import { getSeasonalHistory } from "../services/ubisoft.service.js";

export async function getSeasonal(req, res) {
    const { username, platform } = req.query;

    if (!username) {
        return res.status(400).json({ error: "username is required" });
    }

    try {
        const history = await getSeasonalHistory(username, platform || "pc");
        res.json({ username, history });
    } catch (err) {
        console.error("Error in /api/seasonal:", err);
        res.status(500).json({ error: "Failed to fetch seasonal history" });
    }
}
