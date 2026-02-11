import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// Ubisoft constants
const APP_ID = "3587dcbb-7f81-457c-9781-0e3f29f6f56a";

const PLATFORM_MAP = {
    pc: "uplay",
    uplay: "uplay",
    xbox: "xbl",
    xbl: "xbl",
    ps: "psn",
    psn: "psn"
};

const PLATFORM_ENV = {
    uplay: {
        spaceId: "56d5f9f8d2720b7f318b4567",
        sandboxId: "OSBOR_PC_LNCH_A"
    },
    xbl: {
        spaceId: "5715c6a0d2720b7f2c8b4567",
        sandboxId: "OSBOR_XBOXONE_LNCH_A"
    },
    psn: {
        spaceId: "5715c6a0d2720b7f2c8b4567",
        sandboxId: "OSBOR_PS4_LNCH_A"
    }
};

// --- Core Ubisoft helpers ---

async function loginUbi() {
    const res = await fetch("https://public-ubiservices.ubi.com/v3/profiles/sessions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Ubi-AppId": APP_ID
        },
        body: JSON.stringify({
            email: process.env.UBI_EMAIL,
            password: process.env.UBI_PASSWORD
        })
    });

    if (!res.ok) throw new Error(`Ubisoft login failed (${res.status})`);

    const data = await res.json();
    if (!data.ticket) throw new Error("Ubisoft login did not return a ticket");

    return data.ticket;
}

async function getPlayerId(ticket, username, platform) {
    const url = `https://public-ubiservices.ubi.com/v3/profiles?nameOnPlatform=${encodeURIComponent(
        username
    )}&platformType=${platform}`;

    const res = await fetch(url, {
        headers: {
            "Authorization": `Ubi_v1 t=${ticket}`,
            "Ubi-AppId": APP_ID
        }
    });

    if (!res.ok) throw new Error(`Failed to fetch player profile (${res.status})`);

    const data = await res.json();

    if (!data.profiles || data.profiles.length === 0)
        throw new Error("Player not found");

    const profile = data.profiles[0];

    return {
        profileId: profile.profileId,
        userId: profile.userId,
        nameOnPlatform: profile.nameOnPlatform
    };
}

async function getGeneralStats(ticket, playerId, env) {
    const statsList = [
        "generalpvp_kills",
        "generalpvp_death",
        "generalpvp_matchwon",
        "generalpvp_matchlost",
        "generalpvp_timeplayed"
    ].join(",");

    const url = `https://public-ubiservices.ubi.com/v1/spaces/${env.spaceId}/sandboxes/${env.sandboxId}/playerstats2/statistics?populations=${playerId}&statistics=${statsList}`;

    const res = await fetch(url, {
        headers: {
            "Authorization": `Ubi_v1 t=${ticket}`,
            "Ubi-AppId": APP_ID
        }
    });

    if (!res.ok) throw new Error(`Failed to fetch general stats (${res.status})`);

    const data = await res.json();
    return data?.results?.[playerId] || {};
}

async function getRankedStats(ticket, playerId, env) {
    const url = `https://public-ubiservices.ubi.com/v1/spaces/${env.spaceId}/sandboxes/${env.sandboxId}/r6playerprofile/playerprofile/progressions?profile_ids=${playerId}`;

    const res = await fetch(url, {
        headers: {
            "Authorization": `Ubi_v1 t=${ticket}`,
            "Ubi-AppId": APP_ID
        }
    });

    if (!res.ok) throw new Error(`Failed to fetch ranked stats (${res.status})`);

    const data = await res.json();
    return data?.player_profiles?.[0] || {};
}

// seasonal history (per season progression)
async function getSeasonalHistory(ticket, playerId, env) {
    // Typical pattern: same endpoint with seasons param or returns history;
    // here we assume it returns an array of seasons for the profile.
    const url = `https://public-ubiservices.ubi.com/v1/spaces/${env.spaceId}/sandboxes/${env.sandboxId}/r6playerprofile/playerprofile/progressions?profile_ids=${playerId}&seasons=all`;

    const res = await fetch(url, {
        headers: {
            "Authorization": `Ubi_v1 t=${ticket}`,
            "Ubi-AppId": APP_ID
        }
    });

    if (!res.ok) throw new Error(`Failed to fetch seasonal history (${res.status})`);

    const data = await res.json();
    // Shape into something simple: array of { season, mmr, maxMmr, rank, maxRank }
    const profiles = data?.player_profiles || [];
    return profiles.map(p => ({
        season: p.season,
        region: p.region,
        mmr: p.mmr,
        maxMmr: p.max_mmr,
        rank: p.rank,
        maxRank: p.max_rank
    }));
}

// --- Unified function for single player lookup ---

async function fetchPlayerFull(ticket, username, platform) {
    const mappedPlatform = PLATFORM_MAP[platform.toLowerCase()];
    if (!mappedPlatform) throw new Error("Invalid platform");

    const env = PLATFORM_ENV[mappedPlatform];
    if (!env) throw new Error("Unsupported platform environment");

    const player = await getPlayerId(ticket, username, mappedPlatform);

    const [general, ranked] = await Promise.all([
        getGeneralStats(ticket, player.profileId, env),
        getRankedStats(ticket, player.profileId, env)
    ]);

    return {
        username: player.nameOnPlatform,
        platform: mappedPlatform,
        profileId: player.profileId,
        userId: player.userId,
        general: {
            kills: Number(general.generalpvp_kills?.value || 0),
            deaths: Number(general.generalpvp_death?.value || 0),
            matchesWon: Number(general.generalpvp_matchwon?.value || 0),
            matchesLost: Number(general.generalpvp_matchlost?.value || 0),
            timePlayedSeconds: Number(general.generalpvp_timeplayed?.value || 0)
        },
        ranked: {
            mmr: ranked.mmr,
            maxMmr: ranked.max_mmr,
            lastRank: ranked.last_rank,
            rank: ranked.rank,
            maxRank: ranked.max_rank,
            skillMean: ranked.skill_mean,
            skillStdev: ranked.skill_stdev,
            lastMatchMmrChange: ranked.last_match_mmr_change,
            season: ranked.season,
            region: ranked.region
        }
    };
}

// --- Single player endpoint ---

app.get("/api/player", async (req, res) => {
    try {
        const { username, platform } = req.query;

        if (!username || !platform)
            return res.status(400).json({ error: "Missing username or platform" });

        const ticket = await loginUbi();
        const result = await fetchPlayerFull(ticket, username, platform);

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- MULTI-PLAYER BATCH ENDPOINT ---

app.post("/api/players", async (req, res) => {
    try {
        const { players } = req.body;

        if (!Array.isArray(players) || players.length === 0)
            return res.status(400).json({ error: "players must be an array" });

        const ticket = await loginUbi();

        const results = await Promise.all(
            players.map(async (p) => {
                try {
                    const data = await fetchPlayerFull(ticket, p.username, p.platform);
                    return { success: true, username: p.username, data };
                } catch (err) {
                    return { success: false, username: p.username, error: err.message };
                }
            })
        );

        res.json({ results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- Seasonal history endpoint ---

app.get("/api/seasonal", async (req, res) => {
    try {
        const { username, platform } = req.query;

        if (!username || !platform)
            return res.status(400).json({ error: "Missing username or platform" });

        const mappedPlatform = PLATFORM_MAP[platform.toLowerCase()];
        if (!mappedPlatform)
            return res.status(400).json({ error: "Invalid platform" });

        const env = PLATFORM_ENV[mappedPlatform];
        if (!env)
            return res.status(400).json({ error: "Unsupported platform environment" });

        const ticket = await loginUbi();
        const player = await getPlayerId(ticket, username, mappedPlatform);
        const history = await getSeasonalHistory(ticket, player.profileId, env);

        res.json({
            username: player.nameOnPlatform,
            platform: mappedPlatform,
            profileId: player.profileId,
            history
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- Root ping ---

app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "R6 Ubisoft API backend running" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
