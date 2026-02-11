import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

// Authenticate with Ubisoft
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

    if (!res.ok) throw new Error("Ubisoft login failed");

    const data = await res.json();
    return data.ticket;
}

// Fetch player ID
async function getPlayerId(ticket, username, platform) {
    const url = `https://public-ubiservices.ubi.com/v3/profiles?nameOnPlatform=${username}&platformType=${platform}`;

    const res = await fetch(url, {
        headers: {
            "Authorization": `Ubi_v1 t=${ticket}`,
            "Ubi-AppId": APP_ID
        }
    });

    const data = await res.json();

    if (!data.profiles || data.profiles.length === 0)
        throw new Error("Player not found");

    return data.profiles[0].profileId;
}

// Fetch player stats
async function getPlayerStats(ticket, playerId, platform) {
    const spaceId = platform === "uplay"
        ? "56d5f9f8d2720b7f318b4567"
        : "5715c6a0d2720b7f2c8b4567";

    const sandboxId = platform === "uplay"
        ? "OSBOR_PC_LNCH_A"
        : platform === "xbl"
        ? "OSBOR_XBOXONE_LNCH_A"
        : "OSBOR_PS4_LNCH_A";

    const url = `https://public-ubiservices.ubi.com/v1/spaces/${spaceId}/sandboxes/${sandboxId}/playerstats2/statistics?populations=${playerId}&statistics=generalpvp_kills,generalpvp_death,generalpvp_matchwon,generalpvp_matchlost`;

    const res = await fetch(url, {
        headers: {
            "Authorization": `Ubi_v1 t=${ticket}`,
            "Ubi-AppId": APP_ID
        }
    });

    const data = await res.json();
    return data;
}

// API endpoint
app.get("/api/player", async (req, res) => {
    try {
        const { username, platform } = req.query;

        if (!username || !platform)
            return res.status(400).json({ error: "Missing username or platform" });

        const mappedPlatform = PLATFORM_MAP[platform.toLowerCase()];
        if (!mappedPlatform)
            return res.status(400).json({ error: "Invalid platform" });

        const ticket = await loginUbi();
        const playerId = await getPlayerId(ticket, username, mappedPlatform);
        const stats = await getPlayerStats(ticket, playerId, mappedPlatform);

        res.json({
            username,
            platform: mappedPlatform,
            playerId,
            stats
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
