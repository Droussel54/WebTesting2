// src/services/r6.service.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Force CommonJS version of r6api.js v4
const R6API = require("r6api.js/dist/index.js");

import { isDemoMode } from "../controllers/mode.controller.js";
import {
    generateRandomPlayer,
    generateRandomSeasonalHistory
} from "./demo-generator.service.js";

// -------------------------------------------------------------
// Load credentials
// -------------------------------------------------------------
const email = process.env.R6_EMAIL?.trim();
const password = process.env.R6_PASSWORD?.trim();

let r6 = null;

if (email && password) {
    r6 = new R6API({ email, password });
} else {
    console.warn("[R6API] Missing R6_EMAIL or R6_PASSWORD.");
}

// -------------------------------------------------------------
// Platform mapping
// -------------------------------------------------------------
function mapPlatform(platform) {
    const p = (platform || "").toLowerCase();
    if (p === "pc") return "uplay";
    if (p === "xbox") return "xbl";
    if (p === "ps" || p === "psn" || p === "playstation") return "psn";
    return "uplay";
}

// -------------------------------------------------------------
// Find user
// -------------------------------------------------------------
async function findUser(platform, username) {
    if (!r6) return null;

    const apiPlatform = mapPlatform(platform);

    try {
        const users = await r6.findUserByUsername({
            platform: apiPlatform,
            usernames: [username]
        });

        return users?.[0] || null;
    } catch (err) {
        console.error("[R6API] findUser error:", err);
        return null;
    }
}

// -------------------------------------------------------------
// Full player stats
// -------------------------------------------------------------
export async function getPlayerFullStats(platform, username) {
    if (isDemoMode()) {
        return generateRandomPlayer(username, platform);
    }

    const user = await findUser(platform, username);
    if (!user) return null;

    const apiPlatform = user.platform;
    const id = user.id;

    try {
        const [stats] = await r6.getStats({ id, platform: apiPlatform });
        const [ranked] = await r6.getRank({ id, platform: apiPlatform });
        const [operators] = await r6.getOperators({ id, platform: apiPlatform });

        return {
            username: user.username,
            platform,
            general: stats?.pvp || {},
            ranked: ranked || {},
            operators: operators || []
        };
    } catch (err) {
        console.error("[R6API] getPlayerFullStats error:", err);
        return null;
    }
}

// -------------------------------------------------------------
// Seasonal history
// -------------------------------------------------------------
export async function getSeasonalHistory(platform, username) {
    if (isDemoMode()) {
        return generateRandomSeasonalHistory();
    }

    const user = await findUser(platform, username);
    if (!user) return [];

    const apiPlatform = user.platform;
    const id = user.id;

    try {
        const [rankedSeasons] = await r6.getRank({
            id,
            platform: apiPlatform,
            seasons: "all"
        });

        return Object.values(rankedSeasons || {}).map(season => ({
            season: season.seasonCode,
            region: season.region || "N/A",
            mmr: season.mmr || 0,
            maxMmr: season.maxMmr || 0,
            rank: season.rank || 0,
            maxRank: season.maxRank || 0
        }));
    } catch (err) {
        console.error("[R6API] getSeasonalHistory error:", err);
        return [];
    }
}

// -------------------------------------------------------------
// Batch players
// -------------------------------------------------------------
export async function getPlayersBatch(players) {
    const results = [];

    for (const p of players) {
        try {
            const data = await getPlayerFullStats(p.platform, p.username);

            if (!data) {
                results.push({
                    success: false,
                    username: p.username,
                    platform: p.platform,
                    error: "Player not found"
                });
                continue;
            }

            results.push({ success: true, data });
        } catch (err) {
            results.push({
                success: false,
                username: p.username,
                platform: p.platform,
                error: err.message
            });
        }
    }

    return results;
}
