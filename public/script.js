// script.js
import {
    getRankIcon,
    getOperatorIcon,
    getMMRDeltaColor,
    RANK_NAME_MAP
} from "./icon-maps.js";

const fetchBtn = document.getElementById("fetch-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const clearTeamBtn = document.getElementById("clear-team-btn");

const historyModal = document.getElementById("history-modal");
const historyTitle = document.getElementById("history-title");
const historyTimeline = document.getElementById("history-timeline");

const operatorsModal = document.getElementById("operators-modal");
const operatorsTitle = document.getElementById("operators-title");
const operatorsHeatmap = document.getElementById("operators-heatmap");

const modeToggleBtn = document.getElementById("mode-toggle");

// close buttons
document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", () => {
        historyModal.classList.add("hidden");
        operatorsModal.classList.add("hidden");
    });
});

// backdrop click closes modals
[historyModal, operatorsModal].forEach(modal => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
});

// -------------------------------------------------------------
// Mode handling (Live vs Demo)
// -------------------------------------------------------------
let devMode = false;
let demoMode = false;

async function loadMode() {
    try {
        const res = await fetch("/api/mode");
        const data = await res.json();

        devMode = !!data.devMode;
        demoMode = !!data.demoMode;

        if (devMode) {
            modeToggleBtn.classList.remove("hidden");
            updateModeButton();
        }
    } catch (err) {
        console.error("Failed to load mode:", err);
    }
}

function updateModeButton() {
    modeToggleBtn.textContent = demoMode ? "Mode: Demo" : "Mode: Live";
}

modeToggleBtn.addEventListener("click", async () => {
    if (!devMode) return;

    try {
        const res = await fetch("/api/mode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ demoMode: !demoMode })
        });

        const data = await res.json();
        demoMode = !!data.demoMode;
        updateModeButton();
    } catch (err) {
        console.error("Failed to toggle mode:", err);
    }
});

// -------------------------------------------------------------
// Ripple micro-interaction
// -------------------------------------------------------------
function attachRipple() {
    document.querySelectorAll(".ripple").forEach(el => {
        if (el.dataset.rippleBound) return;
        el.dataset.rippleBound = "true";

        el.addEventListener("click", (e) => {
            const rect = el.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            el.style.setProperty("--ripple-x", `${x}px`);
            el.style.setProperty("--ripple-y", `${y}px`);
            el.style.setProperty("--ripple-size", `${size}px`);

            el.classList.remove("ripple-active");
            void el.offsetWidth;
            el.classList.add("ripple-active");

            setTimeout(() => el.classList.remove("ripple-active"), 400);
        });
    });
}

// -------------------------------------------------------------
// Rank color engine (canonical-ish community colors)
// -------------------------------------------------------------
function getRankTierColor(rank) {
    if (rank >= 30) return "#ff4d6d"; // Champion
    if (rank >= 27) return "#4db8ff"; // Diamond
    if (rank >= 24) return "#00c896"; // Emerald
    if (rank >= 21) return "#9fd5ff"; // Platinum
    if (rank >= 18) return "#f2c94c"; // Gold
    if (rank >= 15) return "#c0c0c0"; // Silver
    if (rank >= 12) return "#cd7f32"; // Bronze
    if (rank >= 9)  return "#b87333"; // Copper
    return "#9ca3af";                 // Unranked / fallback
}

function darkenHex(hex, factor = 0.4) {
    const h = hex.replace("#", "");
    const r = Math.round(parseInt(h.substring(0, 2), 16) * factor);
    const g = Math.round(parseInt(h.substring(2, 4), 16) * factor);
    const b = Math.round(parseInt(h.substring(4, 6), 16) * factor);
    return `rgb(${r},${g},${b})`;
}

function hexToRgba(hex, alpha) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function applyMatchTheme(results) {
    const valid = results.filter(r => r.success).map(r => r.data);
    if (valid.length === 0) return;

    const highestRank = valid.reduce((max, p) => {
        const r = p.ranked?.rank ?? 0;
        return r > max ? r : max;
    }, 0);

    const base = getRankTierColor(highestRank);
    const dark = darkenHex(base, 0.35);
    const accent = base;
    const accentSoft = hexToRgba(base, 0.25);
    const accentBorder = hexToRgba(base, 0.35);
    const accentHover = hexToRgba(base, 0.55);

    const root = document.documentElement;
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-soft", accentSoft);
    root.style.setProperty("--accent-border", accentBorder);
    root.style.setProperty("--accent-hover", accentHover);
    root.style.setProperty("--accent-dark", dark);

    // re-apply themed button style for bootstrap-select
    $('.selectpicker').selectpicker('setStyle', 'btn-platform', 'remove');
    $('.selectpicker').selectpicker('setStyle', 'btn-platform');
}

// -------------------------------------------------------------
// Clear team / players
// -------------------------------------------------------------
clearTeamBtn.addEventListener("click", () => {
    document.querySelectorAll("input[data-player]").forEach(i => i.value = "");
    statusEl.textContent = "";
    resultsEl.innerHTML = "";
    resultsEl.classList.remove("visible");
});

// -------------------------------------------------------------
// Fetch players
// -------------------------------------------------------------
fetchBtn.addEventListener("click", async () => {
    const inputs = document.querySelectorAll("input[data-player]");
    const selects = document.querySelectorAll("select[data-platform]");

    const players = [];
    inputs.forEach((input, i) => {
        const username = input.value.trim();
        if (username) {
            players.push({
                username,
                platform: selects[i].value
            });
        }
    });

    if (players.length === 0) {
        statusEl.textContent = "Enter at least one username.";
        return;
    }

    statusEl.textContent = "Loading...";
    resultsEl.classList.remove("visible");
    resultsEl.innerHTML = "";

    // skeletons
    for (let i = 0; i < players.length; i++) {
        const sk = document.createElement("div");
        sk.className = "player-card skeleton";
        sk.style.height = "80px";
        resultsEl.appendChild(sk);
    }

    try {
        const res = await fetch("/api/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ players })
        });

        const data = await res.json();
        statusEl.textContent = "";

        applyMatchTheme(data.results);
        renderResults(data.results);
        attachRipple();

        resultsEl.classList.remove("hidden");
        requestAnimationFrame(() => {
            resultsEl.classList.add("visible");
        });
    } catch (err) {
        console.error(err);
        statusEl.textContent = "Unexpected error. Check console.";
    }
});

// -------------------------------------------------------------
// Render results
// -------------------------------------------------------------
function renderResults(results) {
    resultsEl.innerHTML = "";

    results.forEach(r => {
        const card = document.createElement("div");
        card.className = "player-card";

        if (!r.success) {
            card.innerHTML = `
                <div class="player-strip">
                    <div class="player-strip-top">
                        <span class="player-name">${r.username}</span>
                    </div>
                    <div style="color:#f97373;font-size:0.85rem;">Error: ${r.error}</div>
                </div>
            `;
            resultsEl.appendChild(card);
            return;
        }

        const d = r.data;
        const kd = d.general.deaths > 0
            ? (d.general.kills / d.general.deaths).toFixed(2)
            : "—";

        const mmrDelta = d.ranked.lastMatchMmrChange || 0;
        const mmrDeltaColor = getMMRDeltaColor(mmrDelta);
        const mmrDeltaText = mmrDelta === 0 ? "" :
            `<span class="mmr-delta" style="color:${mmrDeltaColor}">
                ${mmrDelta > 0 ? "+" : ""}${mmrDelta}
            </span>`;

        const topOps = (d.operators || []).slice(0, 3);
        const operatorIcons = topOps.map(op => {
            const icon = getOperatorIcon(op.name);
            return `<img src="${icon}" title="${capitalize(op.name)}" />`;
        }).join("");

        const platformLabel = d.platform?.toUpperCase() ?? "";
        const platformIcon = getPlatformIcon(d.platform);

        const threatScore = computeThreatScore(d);
        const badges = computeBadges(d);

        card.innerHTML = `
            <div class="player-rank-icon">
                <img src="${getRankIcon(d.ranked.rank)}" alt="Rank Icon" />
            </div>

            <div class="player-strip">
                <div class="player-strip-top">
                    <span class="player-name">${d.username}</span>
                    <span class="platform-pill">
                        <span class="platform-icon ${platformIcon.class}"></span>
                        <span>${platformLabel}</span>
                    </span>
                    <span class="player-rank-line">
                        <strong>${RANK_NAME_MAP[d.ranked.rank] || "Unranked"}</strong>
                        — ${d.ranked.mmr ?? "—"} MMR ${mmrDeltaText}
                    </span>
                </div>

                <div class="player-strip-bottom">
                    <div class="threat-bar-wrapper">
                        <div class="threat-bar-label">Threat level</div>
                        <div class="threat-bar">
                            <div class="threat-bar-fill" style="width:${threatScore}%"></div>
                        </div>
                        <div class="threat-bar-value">${threatScore}%</div>
                    </div>

                    <div class="player-badges">
                        ${badges.map(b => `<span class="badge">${b}</span>`).join("")}
                    </div>

                    <div class="operator-preview">
                        <span>Top Ops:</span>
                        <div class="operator-icons">${operatorIcons}</div>
                    </div>
                </div>
            </div>

            <div class="player-actions">
                <button class="history-btn ripple"
                    data-username="${d.username}"
                    data-platform="${d.platform}">
                    Seasonal History
                </button>

                <button class="operators-btn ripple"
                    data-username="${d.username}"
                    data-platform="${d.platform}">
                    Operators
                </button>
            </div>
        `;

        resultsEl.appendChild(card);
    });
}

// -------------------------------------------------------------
// Seasonal history – timeline
// -------------------------------------------------------------
resultsEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".history-btn");
    if (!btn) return;

    const username = btn.dataset.username;
    const platform = btn.dataset.platform;

    historyTimeline.innerHTML = "";
    historyTitle.textContent = `Seasonal History – ${username}`;

    const res = await fetch(`/api/seasonal?username=${username}&platform=${platform}`);
    const data = await res.json();

    (data.history || []).forEach(h => {
        const node = document.createElement("div");
        node.className = "history-node";
        node.innerHTML = `
            <div class="history-node-header">
                <img src="${getRankIcon(h.rank)}" alt="" />
                <div>
                    <div class="history-node-season">${h.season}</div>
                    <div style="font-size:0.75rem;opacity:0.8;">${h.region}</div>
                </div>
            </div>
            <div class="history-node-body">
                <div>MMR: ${h.mmr ?? "—"} (max ${h.maxMmr ?? "—"})</div>
                <div>Rank: ${RANK_NAME_MAP[h.rank] || "—"}</div>
                <div>Max: ${RANK_NAME_MAP[h.maxRank] || "—"}</div>
            </div>
        `;
        historyTimeline.appendChild(node);
    });

    historyModal.classList.remove("hidden");
});

// -------------------------------------------------------------
// Operators modal – heatmap
// -------------------------------------------------------------
resultsEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".operators-btn");
    if (!btn) return;

    const username = btn.dataset.username;
    const platform = btn.dataset.platform;

    const res = await fetch(`/api/player?username=${username}&platform=${platform}`);
    const data = await res.json();

    operatorsTitle.textContent = `Operators – ${data.username}`;
    operatorsHeatmap.innerHTML = "";

    const ops = data.operators || [];
    const maxUsage = Math.max(...ops.map(o => o.kills + o.deaths), 1);

    ops.forEach(op => {
        const usage = op.kills + op.deaths;
        const ratio = Math.round((usage / maxUsage) * 100);
        const kd = op.deaths > 0 ? (op.kills / op.deaths).toFixed(2) : "—";
        const icon = getOperatorIcon(op.name);

        const div = document.createElement("div");
        div.className = "heatmap-card";
        div.innerHTML = `
            <div class="heatmap-header">
                <img src="${icon}" alt="${capitalize(op.name)}" />
                <span class="heatmap-name">${capitalize(op.name)}</span>
            </div>
            <div class="heatmap-bar-wrapper">
                <div class="heatmap-bar">
                    <div class="heatmap-bar-fill" style="width:${ratio}%"></div>
                </div>
            </div>
            <div class="heatmap-meta">
                Usage: ${usage}+ • K/D: ${kd} • W/L: ${op.wins}/${op.losses}
            </div>
        `;
        operatorsHeatmap.appendChild(div);
    });

    operatorsModal.classList.remove("hidden");
});

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function capitalize(name) {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function getPlatformIcon(platform) {
    const p = (platform || "").toLowerCase();
    if (p === "pc") return { class: "platform-icon-pc" };
    if (p === "xbox") return { class: "platform-icon-xbox" };
    if (p === "ps" || p === "psn" || p === "playstation") return { class: "platform-icon-ps" };
    return { class: "platform-icon-pc" };
}

function computeThreatScore(d) {
    const rank = d.ranked?.rank ?? 0;
    const mmr = d.ranked?.mmr ?? 0;
    const kd = d.general.deaths > 0 ? d.general.kills / d.general.deaths : 1;
    const totalMatches = d.general.matchesWon + d.general.matchesLost;
    const winrate = totalMatches > 0 ? d.general.matchesWon / totalMatches : 0.5;

    let score = 0;
    score += Math.min(rank / 35, 1) * 40;
    score += Math.min(mmr / 6000, 1) * 25;
    score += Math.min(kd / 2.5, 1) * 20;
    score += winrate * 15;

    return Math.round(Math.max(0, Math.min(100, score)));
}

function computeBadges(d) {
    const badges = [];
    const kd = d.general.deaths > 0 ? d.general.kills / d.general.deaths : 0;
    const totalMatches = d.general.matchesWon + d.general.matchesLost;
    const winrate = totalMatches > 0 ? d.general.matchesWon / totalMatches : 0;

    if (kd >= 1.5) badges.push("High KD");
    if (winrate >= 0.55) badges.push("High Winrate");
    if ((d.ranked?.lastMatchMmrChange || 0) >= 20) badges.push("Big MMR Gain");
    if ((d.operators || []).length <= 3 && (d.operators || []).length > 0) badges.push("One‑Trick Pool");
    if (d.ranked?.rank >= 30) badges.push("Top Tier");

    return badges;
}

// -------------------------------------------------------------
// Init
// -------------------------------------------------------------
$(document).ready(() => {
    $('.selectpicker').selectpicker();
});

loadMode();
attachRipple();
