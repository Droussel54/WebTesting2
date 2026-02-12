// src/services/ubisoft.service.js
import { fetchWithRetry } from "../utils/fetchWithRetry.js";
import { isDemoMode } from "../controllers/mode.controller.js";
import {
    generateRandomPlayer,
    generateRandomSeasonalHistory
} from "./demo-generator.service.js";

// Ubisoft constants
const APP_ID = "3587dcbb-7f81-457c-9781-0e3f29f6f56a";
const SPACE_ID = "98a601e5-ca91-4440-b1c5-753f601a2c90";

const SANDBOX = {
    pc: "OSBOR_PC_LNCH_A",
    xbox: "OSBOR_XBOXONE_LNCH_A",
    ps: "OSBOR_PS4_LNCH_A"
};

function getCredentials() {
    return {
        email: process.env.UBI_EMAIL,
        password: process.env.UBI_PASSWORD
    };
}

let cachedSession = null;
let cachedSessionExpires = 0;

// -------------------------------------------------------------
// Session
// -------------------------------------------------------------
async function getUbisoftSession() {
    const now = Date.now();

    if (cachedSession && now < cachedSessionExpires) {
        return cachedSession;
    }

    const { email, password } = getCredentials();

    if (!email || !password) {
        throw new Error("UBI_EMAIL / UBI_PASSWORD not configured");
    }

    const res = await fetchWithRetry("https://public-ubiservices.ubi.com/v3/profiles/sessions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Ubi-AppId": APP_ID,
            "Ubi-RequestedPlatformType": "uplay",
            "User-Agent": "R6Tracker/1.0"
        },
        body: JSON.stringify({ email, password })
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

    cachedSessionExpires = now + 1000 * 60 * 60 * 2;

    return cachedSession;
}

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
        cachedSession = null;
        const newSession = await getUbisoftSession();
        return ubiGet(url, newSession);
    }

    if (!res.ok) {
        throw new Error(`Ubisoft API error: ${res.status}`);
    }

    return res.json();
}

// -------------------------------------------------------------
// Profile
// -------------------------------------------------------------
async function getProfile(username, platform) {
    const session = await getUbisoftSession();

    const data = await ubiGet(
        `https://public-ubiservices.ubi.com/v3/profiles?nameOnPlatform=${encodeURIComponent(
            username
        )}&platformType=${platform}`,
        session
    );

    if (!data.profiles || data.profiles.length === 0) {
        throw new Error("Player not found");
    }

    return data.profiles[0];
}

// -------------------------------------------------------------
// Ranked stats
// -------------------------------------------------------------
async function getRankedStats(profileId, platform) {
    const session = await getUbisoftSession();
    const sandbox = SANDBOX[platform] || SANDBOX.pc;

    const url = `https://public-ubiservices.ubi.com/v1/spaces/${SPACE_ID}/sandboxes/${sandbox}/r6playerprofile/playerstats?profileIds=${profileId}`;

    const data = await ubiGet(url, session);

    return data.playerProfiles?.[0] || null;
}

// -------------------------------------------------------------
// Operator stats
// -------------------------------------------------------------
async function getOperatorStats(profileId, platform) {
    const session = await getUbisoftSession();
    const sandbox = SANDBOX[platform] || SANDBOX.pc;

    const url = `https://public-ubiservices.ubi.com/v1/spaces/${SPACE_ID}/sandboxes/${sandbox}/r6operators?profileIds=${profileId}`;

    const data = await ubiGet(url, session);

    return data.operators?.[profileId] || [];
}

// -------------------------------------------------------------
// Seasonal stats
// -------------------------------------------------------------
async function getSeasonalStats(profileId, platform) {
    const session = await getUbisoftSession();
    const sandbox = SANDBOX[platform] || SANDBOX.pc;

    const url = `https://public-ubiservices.ubi.com/v1/spaces/${SPACE_ID}/sandboxes/${sandbox}/r6ranked/playerprofile/progressions?profileIds=${profileId}`;

    const data = await ubiGet(url, session);

    return data.playerProfiles?.[0]?.seasons || [];
}

// -------------------------------------------------------------
// Normalization helper
// -------------------------------------------------------------
function normalizePlayer(username, platform, ranked, general, operators) {
    return {
        username,
        platform,
        ranked: {
            rank: ranked?.rank || 0,
            mmr: ranked?.mmr || 0,
            season: ranked?.seasonId || ranked?.season || "Y9S4",
            lastMatchMmrChange: ranked?.lastMatchMmrChange || 0
        },
        general: {
            kills: general?.kills || 0,
            deaths: general?.deaths || 0,
            matchesWon: general?.matchesWon || 0,
            matchesLost: general?.matchesLost || 0
        },
        operators: operators.map(o => ({
            name: o.operatorId || o.name,
            kills: o.kills || 0,
            deaths: o.deaths || 0,
            wins: o.roundsWon || o.wins || 0,
            losses: o.roundsLost || o.losses || 0
        }))
    };
}

// -------------------------------------------------------------
// Public API
// -------------------------------------------------------------
export async function getPlayersBatch(players) {
    if (isDemoMode()) {
        return players.map(p => ({
            success: true,
            data: generateRandomPlayer(p.username, (p.platform || "pc").toLowerCase())
        }));
    }

    return Promise.all(
        players.map(async p => {
            const platform = (p.platform || "pc").toLowerCase();

            try {
                const profile = await getProfile(p.username, platform);
                const ranked = await getRankedStats(profile.profileId, platform);
                const operators = await getOperatorStats(profile.profileId, platform);

                const general = ranked?.general;

                return {
                    success: true,
                    data: normalizePlayer(p.username, platform, ranked, general, operators)
                };
            } catch (err) {
                console.error("Error in getPlayersBatch for", p.username, err.message);
                const demo = generateRandomPlayer(p.username, platform);
                return { success: true, data: demo };
            }
        })
    );
}

export async function getSinglePlayer(username, platform) {
    const plat = (platform || "pc").toLowerCase();

    if (isDemoMode()) {
        return generateRandomPlayer(username, plat);
    }

    try {
        const profile = await getProfile(username, plat);
        const ranked = await getRankedStats(profile.profileId, plat);
        const operators = await getOperatorStats(profile.profileId, plat);

        const general = ranked?.general;

        return normalizePlayer(username, plat, ranked, general, operators);
    } catch (err) {
        console.error("Error in getSinglePlayer for", username, err.message);
        return generateRandomPlayer(username, plat);
    }
}

export async function getSeasonalHistory(username, platform) {
    const plat = (platform || "pc").toLowerCase();

    if (isDemoMode()) {
        return generateRandomSeasonalHistory();
    }

    try {
        const profile = await getProfile(username, plat);
        const seasons = await getSeasonalStats(profile.profileId, plat);

        if (!seasons || seasons.length === 0) {
            return generateRandomSeasonalHistory();
        }

        return seasons.map(s => ({
            season: s.seasonId,
            region: "NA",
            mmr: s.mmr,
            maxMmr: s.maxMmr,
            rank: s.rank,
            maxRank: s.maxRank
        }));
    } catch (err) {
        console.error("Error in getSeasonalHistory for", username, err.message);
        return generateRandomSeasonalHistory();
    }
}
