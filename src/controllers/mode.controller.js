// src/controllers/mode.controller.js

export function isDevMode() {
    return process.env.DEV_MODE === "true";
}

let demoMode = isDevMode(); // demo = true in dev by default, false in prod

export function getMode(req, res) {
    res.json({
        devMode: isDevMode(),
        demoMode
    });
}

export function setMode(req, res) {
    if (!isDevMode()) {
        return res.status(403).json({ error: "Mode toggle only allowed in DEV_MODE" });
    }
    demoMode = !!req.body.demoMode;
    res.json({ devMode: true, demoMode });
}

export function isDemoMode() {
    return demoMode;
}
