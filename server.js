// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;
const DEV_MODE = process.env.DEV_MODE === "true";

// In-memory toggle for demo mode (only allowed in DEV_MODE)
let demoMode = DEV_MODE ? true : false;

// ---------------------------------------------------------------------
// Retry wrapper for Ubisoft calls
// ---------------------------------------------------------------------
async function fetchWithRetry(url, options = {}, retries = 3, delayMs = 300) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fetch(url, options);
        } catch (err) {
            if (err.code === "EAI_AGAIN" && i < retries - 1) {
                await new Promise(r => setTimeout(r, delayMs));
                continue;
            }
            throw err;
        }
    }
}

// ---------------------------------------------------------------------
// Placeholder data (Demo Mode)
// ---------------------------------------------------------------------
const placeholderPlayers = [
    {
        username: "SweatyChamp",
        platform: "pc",
        ranked: {
            rank: 31,
            mmr: 5100,
            season: "Y9S4",
            lastMatchMmrChange: +24
        },
        general: {
            kills: 1200,
            deaths: 800,
            matchesWon: 120,
            matchesLost: 90
        },
        operators: [
            { name: "ace", kills: 300, deaths: 180, wins: 60, losses: 40 },
            { name: "jager", kills: 280, deaths: 170, wins: 55, losses: 38 },
            { name: "ash", kills: 260, deaths: 190, wins: 50, losses: 42 },
            { name: "smoke", kills: 200, deaths: 160, wins: 45, losses: 35 }
        ]
    },
    {
        username: "GoldSmurf",
        platform: "pc",
        ranked: {
            rank: 18,
            mmr: 3200,
            season: "Y9S4",
            lastMatchMmrChange: -18
        },
        general: {
            kills: 800,
            deaths: 900,
            matchesWon: 80,
            matchesLost: 95
        },
        operators: [
            { name: "sledge", kills: 200, deaths: 230, wins: 35, losses: 45 },
            { name: "mute", kills: 150, deaths: 180, wins: 30, losses: 40 },
            { name: "hibana", kills: 180, deaths: 190, wins: 32, losses: 42 }
        ]
    }
];

const placeholderSeasonal = [
    { season: "Y9S4", region: "NA", mmr: 5100, maxMmr: 5200, rank: 31, maxRank: 31 },
    { season: "Y9S3", region: "NA", mmr: 4800, maxMmr: 4900, rank: 30, maxRank: 30 },
    { season: "Y9S2", region: "NA", mmr: 4500, maxMmr: 4600, rank: 29, maxRank: 29 }
];

// ---------------------------------------------------------------------
// Express setup
// ---------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(express.static("public"));

// ---------------------------------------------------------------------
// Health-check endpoint
// ---------------------------------------------------------------------
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        mode: DEV_MODE ? "development" : "production",
        demoMode
    });
});

// ---------------------------------------------------------------------
// Mode endpoints (UI toggle)
// ---------------------------------------------------------------------
app.get("/api/mode", (req, res) => {
    res.json({
        devMode: DEV_MODE,
        demoMode
    });
});

app.post("/api/mode", (req, res) => {
    if (!DEV_MODE) {
        return res.status(403).json({ error: "Mode toggle only allowed in DEV_MODE" });
    }
    demoMode = !!req.body.demoMode;
    res.json({ devMode: DEV_MODE, demoMode });
});

// ---------------------------------------------------------------------
// Ubisoft fallback wrapper
// ---------------------------------------------------------------------
async function safeUbisoftCall(fn, fallback) {
    try {
        return await fn();
    } catch (err) {
        console.error("Ubisoft API failed, using fallback:", err);
        return fallback;
    }
}

// ---------------------------------------------------------------------
// /api/players – batch lookup
// ---------------------------------------------------------------------
app.post("/api/players", async (req, res) => {
    const { players } = req.body || { players: [] };

    if (demoMode) {
        const results = players.map((p, i) => ({
            success: true,
            data: placeholderPlayers[i % placeholderPlayers.length]
        }));
        return res.json({ results });
    }

    // Real Ubisoft logic (placeholder fallback)
    const results = await Promise.all(
        players.map(async (p, i) =>
            safeUbisoftCall(
                async () => {
                    // TODO: real Ubisoft call
                    throw new Error("Ubisoft not implemented");
                },
                {
                    success: true,
                    data: placeholderPlayers[i % placeholderPlayers.length]
                }
            )
        )
    );

    res.json({ results });
});

// ---------------------------------------------------------------------
// /api/player – single player (compare/operators)
// ---------------------------------------------------------------------
app.get("/api/player", async (req, res) => {
    const { username } = req.query;

    if (demoMode) {
        const p =
            placeholderPlayers.find(x => x.username.toLowerCase() === username.toLowerCase()) ||
            placeholderPlayers[0];
        return res.json(p);
    }

    const data = await safeUbisoftCall(
        async () => {
            // TODO: real Ubisoft call
            throw new Error("Ubisoft not implemented");
        },
        placeholderPlayers[0]
    );

    res.json(data);
});

// ---------------------------------------------------------------------
// /api/seasonal – seasonal history
// ---------------------------------------------------------------------
app.get("/api/seasonal", async (req, res) => {
    const { username } = req.query;

    if (demoMode) {
        return res.json({ username, history: placeholderSeasonal });
    }

    const history = await safeUbisoftCall(
        async () => {
            // TODO: real Ubisoft call
            throw new Error("Ubisoft not implemented");
        },
        placeholderSeasonal
    );

    res.json({ username, history });
});

// ---------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`DEV_MODE=${DEV_MODE}, demoMode=${demoMode}`);
});
