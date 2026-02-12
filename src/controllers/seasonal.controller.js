// src/controllers/seasonal.controller.js
import { isDemoMode } from "./mode.controller.js";
import { placeholderSeasonal } from "../services/demo-data.service.js";
import { getSeasonalHistory } from "../services/ubisoft.service.js";

export async function getSeasonal(req, res) {
    const { username, platform } = req.query;

    if (!username) {
        return res.status(400).json({ error: "username is required" });
    }

    if (isDemoMode()) {
        return res.json({ username, history: placeholderSeasonal });
    }

    try {
        const history = await getSeasonalHistory(username, platform);
        res.json({ username, history });
    } catch (err) {
        console.error("Error in /api/seasonal:", err);
        res.status(500).json({ error: "Failed to fetch seasonal history" });
    }
}
