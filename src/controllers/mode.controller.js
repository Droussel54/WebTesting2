// src/controllers/mode.controller.js
let demoMode = false;
let devMode = true;

export function getMode(_req, res) {
    res.json({ demoMode, devMode });
}

export function setMode(req, res) {
    demoMode = !!req.body.demoMode;
    res.json({ demoMode, devMode });
}

export function isDemoMode() {
    return demoMode;
}
