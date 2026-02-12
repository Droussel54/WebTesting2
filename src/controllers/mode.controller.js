// src/controllers/mode.controller.js
const DEV_MODE = process.env.DEV_MODE === "true";
let demoMode = DEV_MODE ? true : false;

export function getMode(req, res) {
    res.json({
        devMode: DEV_MODE,
        demoMode
    });
}

export function setMode(req, res) {
    if (!DEV_MODE) {
        return res.status(403).json({ error: "Mode toggle only allowed in DEV_MODE" });
    }
    demoMode = !!req.body.demoMode;
    res.json({ devMode: DEV_MODE, demoMode });
}

export function isDemoMode() {
    return demoMode;
}
