// src/services/ubisoft.service.js
import fetch from "node-fetch";
import { placeholderPlayers, placeholderSeasonal } from "./demo-data.service.js";
import { isDemoMode } from "../controllers/mode.controller.js";

// Ubisoft constants
const APP_ID = "3587dcbb-7f81-457c-9781-0e3f29f6f56a";
const SPACE_ID = "98a601e5-ca91-4440-b1c5-753f601a2c90";

const SANDBOX = {
    pc: "OSBOR_PC_LNCH_A",
    xbox: "OSBOR_XBOXONE_LNCH_A",
    ps: "OSBOR_PS4_LNCH_A"
};

// Credentials
const UBI_EMAIL = process.env.UBI_EMAIL;
const UBI_PASSWORD = process.env.UBI_PASSWORD;

// Cached session
let cachedSession = null;
let cachedSessionExpires = 0;

// -------------------------------------------------------------
// Helper: fetch with retry
// -------------------------------------------------------------
async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok && res.status >= 500 && i < retries - 1) {
                await new Promise(r => setTimeout(r, 300));
                continue;
            }
            return res;
        } catch (err) {
            if (i === retries - 1) throw err;
        }
    }
}

// -------------------------------------------------------------
// Authenticate with Ubisoft
// -------------------------------------------------------------
async function getUbisoftSession() {
    const now = Date.now();

    // Use cached session if valid
    if (cachedSession && now < cachedSessionExpires) {
        return cachedSession;
    }

    const res = await fetch("https://public-ubiservices.ubi.com/v3/profiles/sessions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Ubi-AppId": APP_ID,
            "Ubi-RequestedPlatformType": "uplay",
            "User-Agent": "R6Tracker/1.0",
        },
        body: JSON.stringify({
            email: UBI_EMAIL,
            password: UBI_PASSWORD
        })
    });

    if (!res.ok) {
        throw new Error("Ubisoft login failed: " + res.status);
    }

    const data = await res.json();

    cachedSession = {
        ticket: data.ticket,
        sessionId: data.sessionId,
        profileId: data.userId
    };

    // Session lasts 2 hours
    cachedSessionExpires = now + 1000 * 60 * 60 * 2;

    return cachedSession;
}

// -------------------------------------------------------------
// Helper: Ubisoft GET request
// -------------------------------------------------------------
async function ubiGet(url, session) {
    const res = await fetchWithRetry(url, {
        headers: {
            "Ubi-AppId": APP_ID,
            "Authorization": `ubi_v1 t=${session.ticket}`,
            "Ubi-SessionId": session.sessionId,
            "User-Agent": "R6Tracker/1.0"
        }
    });

    if (res.status === 401) {
        // Session expired → refresh
        cachedSession = null;
        const newSession = await getUbisoftSession();
        return ubiGet(url, newSession);
    }

    return res.json();
}

// -------------------------------------------------------------
// Step 1: Get profileId from username
// -------------------------------------------------------------
async function getProfile(username, platform) {
    const session = await getUbisoftSession();

    const res = await ubiGet(
        `https://public-ubiservices.ubi.com/v3/profiles?nameOnPlatform=${encodeURIComponent(username)}&platformType=${platform}`,
        session
    );

    if (!res.profiles || res.profiles.length === 0) {
        throw new Error("Player not found");
    }

    return res.profiles[0];
}

// -------------------------------------------------------------
// Step 2: Ranked stats
// -------------------------------------------------------------
async function getRankedStats(profileId, platform) {
    const session = await getUbisoftSession();
    const sandbox = SANDBOX[platform];

    const url = `https://public-ubiservices.ubi.com/v1/spaces/${SPACE_ID}/sandboxes/${sandbox}/r6playerprofile/playerstats?profileIds=${profileId}`;

    const data = await ubiGet(url, session);

    return data.playerProfiles?.[0] || null;
}

// -------------------------------------------------------------
// Step 3: Operator stats
// -------------------------------------------------------------
async function getOperatorStats(profileId, platform) {
    const session = await getUbisoftSession();
    const sandbox = SANDBOX[platform];

    const url = `https://public-ubiservices.ubi.com/v1/spaces/${SPACE_ID}/sandboxes/${sandbox}/r6operators?profileIds=${profileId}`;

    const data = await ubiGet(url, session);

    return data.operators?.[profileId] || [];
}

// -------------------------------------------------------------
// Step 4: Seasonal history
// -------------------------------------------------------------
async function getSeasonalStats(profileId, platform) {
    const session = await getUbisoftSession();
    const sandbox = SANDBOX[platform];

    const url = `https://public-ubiservices.ubi.com/v1/spaces/${SPACE_ID}/sandboxes/${sandbox}/r6ranked/playerprofile/progressions?profileIds=${profileId}`;

    const data = await ubiGet(url, session);

    return data.playerProfiles?.[0]?.seasons || [];
}

// -------------------------------------------------------------
// Public API used by controllers
// -------------------------------------------------------------
export async function getPlayersBatch(players) {
    if (isDemoMode()) {
        return players.map((p, i) => ({
            success: true,
            data: placeholderPlayers[i % placeholderPlayers.length]
        }));
    }

    return Promise.all(
        players.map(async p => {
            try {
                const profile = await getProfile(p.username, p.platform);
                const ranked = await getRankedStats(profile.profileId, p.platform);
                const operators = await getOperatorStats(profile.profileId, p.platform);

                return {
                    success: true,
                    data: {
                        username: p.username,
                        platform: p.platform,
                        ranked,
                        general: ranked.general,
                        operators
                    }
                };
            } catch (err) {
                return { success: false, username: p.username, error: err.message };
            }
        })
    );
}

export async function getSinglePlayer(username, platform) {
    if (isDemoMode()) {
        return placeholderPlayers[0];
    }

    const profile = await getProfile(username, platform);
    const ranked = await getRankedStats(profile.profileId, platform);
    const operators = await getOperatorStats(profile.profileId, platform);

    return {
        username,
        platform,
        ranked,
        general: ranked.general,
        operators
    };
}

export async function getSeasonalHistory(username, platform) {
    if (isDemoMode()) {
        return placeholderSeasonal;
    }

    const profile = await getProfile(username, platform);
    const seasons = await getSeasonalStats(profile.profileId, platform);

    return seasons.map(s => ({
        season: s.seasonId,
        region: "NA",
        mmr: s.mmr,
        maxMmr: s.maxMmr,
        rank: s.rank,
        maxRank: s.maxRank
    }));
}
