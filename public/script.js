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
const teamThreatWrapper = document.getElementById("team-threat-wrapper");
const teamThreatEl = document.getElementById("team-threat");
const teamThreatTooltip = document.getElementById("team-threat-tooltip");

const historyModal = document.getElementById("history-modal");
const historyTitle = document.getElementById("history-title");
const historyTimeline = document.getElementById("history-timeline");

const operatorsModal = document.getElementById("operators-modal");
const operatorsTitle = document.getElementById("operators-title");
const operatorsHeatmap = document.getElementById("operators-heatmap");

const modeToggleBtn = document.getElementById("mode-toggle");

// -------------------------------------------------------------
// Error UI helpers
// -------------------------------------------------------------
function showError(msg) {
    let box = document.getElementById("error-box");
    if (!box) {
        box = document.createElement("div");
        box.id = "error-box";
        box.style.cssText = `
            background: rgba(255, 80, 80, 0.15);
            border: 1px solid rgba(255, 80, 80, 0.4);
            padding: 10px 14px;
            border-radius: 6px;
            color: #ff6b6b;
            font-weight: 600;
            margin-bottom: 12px;
        `;
        statusEl.parentNode.insertBefore(box, statusEl);
    }
    box.textContent = msg;
    box.classList.remove("hidden");
}

function clearError() {
    const box = document.getElementById("error-box");
    if (box) {
        box.textContent = "";
        box.classList.add("hidden");
    }
}

// -------------------------------------------------------------
// Safe fetch wrapper
// -------------------------------------------------------------
async function fetchJSON(url, options = {}) {
    try {
        const res = await fetch(url, options);

        if (!res.ok) {
            return { error: `HTTP ${res.status}` };
        }

        const data = await res.json();
        if (data.error) {
            return { error: data.error };
        }

        return data;
    } catch (err) {
        return { error: "Network error" };
    }
}

// -------------------------------------------------------------
// Capture default theme
// -------------------------------------------------------------
const root = document.documentElement;
const defaultTheme = {
    accent: getComputedStyle(root).getPropertyValue("--accent").trim(),
    accentSoft: getComputedStyle(root).getPropertyValue("--accent-soft").trim(),
    accentBorder: getComputedStyle(root).getPropertyValue("--accent-border").trim(),
    accentHover: getComputedStyle(root).getPropertyValue("--accent-hover").trim(),
    accentDark: getComputedStyle(root).getPropertyValue("--accent-dark").trim()
};

// -------------------------------------------------------------
// Close modals
// -------------------------------------------------------------
document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", () => {
        historyModal.classList.add("hidden");
        operatorsModal.classList.add("hidden");
    });
});

[historyModal, operatorsModal].forEach(modal => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.add("hidden");
    });
});

// -------------------------------------------------------------
// Mode handling
// -------------------------------------------------------------
let devMode = false;
let demoMode = false;

async function loadMode() {
    const data = await fetchJSON("/api/mode");
    if (data.error) return;

    devMode = !!data.devMode;
    demoMode = !!data.demoMode;

    if (devMode) {
        modeToggleBtn.classList.remove("hidden");
        updateModeButton();
    }
}

function updateModeButton() {
    modeToggleBtn.textContent = demoMode ? "Mode: Demo" : "Mode: Live";
}

modeToggleBtn.addEventListener("click", async () => {
    if (!devMode) return;

    const data = await fetchJSON("/api/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoMode: !demoMode })
    });

    if (data.error) {
        showError(data.error);
        return;
    }

    demoMode = !!data.demoMode;
    updateModeButton();
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
// Rank color engine
// -------------------------------------------------------------
function getRankTierColor(rank) {
    if (rank >= 30) return "#ff4d6d";
    if (rank >= 27) return "#4db8ff";
    if (rank >= 24) return "#00c896";
    if (rank >= 21) return "#9fd5ff";
    if (rank >= 18) return "#f2c94c";
    if (rank >= 15) return "#c0c0c0";
    if (rank >= 12) return "#cd7f32";
    if (rank >= 9)  return "#b87333";
    return "#9ca3af";
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

    root.style.setProperty("--accent", base);
    root.style.setProperty("--accent-soft", hexToRgba(base, 0.22));
    root.style.setProperty("--accent-border", hexToRgba(base, 0.35));
    root.style.setProperty("--accent-hover", hexToRgba(base, 0.6));
    root.style.setProperty("--accent-dark", dark);

    if (highestRank >= 27) {
        root.style.setProperty("--accent-glow", `0 0 18px ${hexToRgba(base, 0.8)}`);
    } else {
        root.style.setProperty("--accent-glow", "none");
    }

    $('.selectpicker').selectpicker('setStyle', 'btn-platform', 'remove');
    $('.selectpicker').selectpicker('setStyle', 'btn-platform');
}

// -------------------------------------------------------------
// Clear team
// -------------------------------------------------------------
clearTeamBtn.addEventListener("click", () => {
    clearError();
    document.querySelectorAll("input[data-player]").forEach(i => i.value = "");
    statusEl.textContent = "";
    resultsEl.innerHTML = "";
    resultsEl.classList.remove("visible");
    teamThreatEl.classList.add("hidden");
    teamThreatTooltip.classList.add("hidden");

    root.style.setProperty("--accent", defaultTheme.accent);
    root.style.setProperty("--accent-soft", defaultTheme.accentSoft);
    root.style.setProperty("--accent-border", defaultTheme.accentBorder);
    root.style.setProperty("--accent-hover", defaultTheme.accentHover);
    root.style.setProperty("--accent-dark", defaultTheme.accentDark);

    $('.selectpicker').selectpicker('setStyle', 'btn-platform', 'remove');
    $('.selectpicker').selectpicker('setStyle', 'btn-platform');
});

// -------------------------------------------------------------
// Fetch players
// -------------------------------------------------------------
fetchBtn.addEventListener("click", async () => {
    clearError();

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
        showError("Enter at least one username.");
        return;
    }

    statusEl.textContent = "Loading...";
    resultsEl.classList.remove("visible");
    resultsEl.innerHTML = "";

    for (let i = 0; i < players.length; i++) {
        const sk = document.createElement("div");
        sk.className = "player-card skeleton";
        sk.style.height = "80px";
        resultsEl.appendChild(sk);
    }

    const data = await fetchJSON("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players })
    });

    if (data.error) {
        statusEl.textContent = "";
        showError(data.error);
        resultsEl.innerHTML = "";
        return;
    }

    statusEl.textContent = "";
    applyMatchTheme(data.results);
    renderResults(data.results);
    attachRipple();

    resultsEl.classList.remove("hidden");
    requestAnimationFrame(() => {
        resultsEl.classList.add("visible");
    });
});

// -------------------------------------------------------------
// Render results
// -------------------------------------------------------------
function renderResults(results) {
    const teamThreat = computeTeamThreatScore(results); 
    const breakdown = computeTeamThreatBreakdown(results);
    
    teamThreatEl.textContent = `Team Threat Score: ${teamThreat}%`;
    teamThreatEl.classList.remove("hidden");

    teamThreatWrapper.addEventListener("mouseenter", () => {
       teamThreatTooltip.classList.remove("hidden");
    });

    teamThreatWrapper.addEventListener("mouseleave", () => {
        teamThreatTooltip.classList.add("hidden");
    });

    teamThreatTooltip.innerHTML = breakdown.map(b => `
        <div class="team-threat-line">
            <span>${b.label}</span>
            <span>${b.value}%</span>
        </div>
    `).join("");

    applyThreatBackground(teamThreat);

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

        const kills = d.general?.kills ?? 0;
        const deaths = d.general?.deaths ?? 0;
        const wins = d.general?.wins ?? 0;
        const losses = d.general?.losses ?? 0;

        const kd = deaths > 0 ? (kills / deaths).toFixed(2) : "—";
        const wl = `${wins}/${losses}`;
        const seasonLabel = d.ranked?.season || "—";

        const mmrDelta = d.ranked?.lastMatchMmrChange ?? 0;
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
        const breakdown = computeThreatBreakdown(d);
        const badges = computeBadges(d);

        card.innerHTML = `
            <div class="player-rank-icon">
                <img src="${getRankIcon(d.ranked?.rank ?? 0)}" alt="Rank Icon" />
            </div>

            <div class="player-strip">
                <div class="player-strip-top">
                    <span class="player-name">${d.username}</span>
                    <span class="platform-pill">
                        <span class="platform-icon ${platformIcon.class}"></span>
                        <span>${platformLabel}</span>
                    </span>
                    <span class="player-rank-line">
                        <strong>${RANK_NAME_MAP[d.ranked?.rank ?? 0] || "Unranked"}</strong>
                        — ${d.ranked?.mmr ?? "—"} MMR ${mmrDeltaText}
                    </span>
                </div>

                <div class="player-strip-bottom">
                    <div class="threat-bar-wrapper">
                        <div class="threat-tooltip">
                            ${breakdown.map(b => `
                                <div class="threat-breakdown-line">
                                    <span>${b.label}</span>
                                    <span>${b.value}%</span>
                                </div>
                            `).join("")}
                        </div>
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

                <div class="player-meta">
                    <span class="player-meta-item">K/D: ${kd}</span>
                    <span class="player-meta-item">W/L: ${wl}</span>
                    <span class="player-meta-item">Season: ${seasonLabel}</span>
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
        const threatWrapper = card.querySelector(".threat-bar-wrapper");
        const tooltip = card.querySelector(".threat-tooltip");

        threatWrapper.addEventListener("mouseenter", () => {
            tooltip.classList.add("visible");
        });

        threatWrapper.addEventListener("mouseleave", () => {
            tooltip.classList.remove("visible");
        });
    });
}

// -------------------------------------------------------------
// Threat Background
// -------------------------------------------------------------
function applyThreatBackground(teamThreat) {
    if (teamThreat > 75) {
        root.style.setProperty("--bg-accent", "rgba(255, 60, 60, 0.15)");
        root.style.setProperty("--bg-glow", "0 0 40px rgba(255, 60, 60, 0.4)");
        document.body.classList.add("danger-pulse");
        document.body.classList.remove("safe-glow");
    }
    else if (teamThreat < 40) {
        root.style.setProperty("--bg-accent", "rgba(0, 200, 150, 0.15)");
        root.style.setProperty("--bg-glow", "0 0 40px rgba(0, 200, 150, 0.4)");
        document.body.classList.add("safe-glow");
        document.body.classList.remove("danger-pulse");
    }
    else {
        root.style.setProperty("--bg-accent", "rgba(255,255,255,0.03)");
        root.style.setProperty("--bg-glow", "none");
        document.body.classList.remove("danger-pulse");
        document.body.classList.remove("safe-glow");
    }
}

// -------------------------------------------------------------
// Seasonal history modal
// -------------------------------------------------------------
resultsEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".history-btn");
    if (!btn) return;

    const username = btn.dataset.username;
    const platform = btn.dataset.platform;

    historyTimeline.innerHTML = "";
    historyTitle.textContent = `Seasonal History – ${username}`;

    const data = await fetchJSON(`/api/seasonal?username=${username}&platform=${platform}`);

    if (data.error) {
        historyTimeline.innerHTML = `
            <div class="history-error">${data.error}</div>
        `;
        historyModal.classList.remove("hidden");
        return;
    }

    const history = [...(data.history || [])];

    history.sort((a, b) => {
        const A = parseSeason(a.season);
        const B = parseSeason(b.season);
        if (A.year !== B.year) return B.year - A.year;
        return B.season - A.season;
    });

    historyTimeline.innerHTML = "";

    history.forEach(h => {
        const node = document.createElement("div");
        node.className = "history-node";

        node.innerHTML = `
            <div class="history-node-header">
                <img src="${getRankIcon(h.rank)}" />
                <div>
                    <div class="history-node-season">${h.season}</div>
                    <div style="font-size:0.75rem;opacity:0.7;">${h.region}</div>
                </div>
            </div>

            <div class="history-node-body">
                <div><strong>MMR:</strong> ${h.mmr} <span style="opacity:0.7;">(max ${h.maxMmr})</span></div>
                <div><strong>Rank:</strong> ${RANK_NAME_MAP[h.rank] || "—"}</div>
                <div><strong>Max Rank:</strong> ${RANK_NAME_MAP[h.maxRank] || "—"}</div>
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

    const data = await fetchJSON(`/api/player?username=${username}&platform=${platform}`);

    if (data.error) {
        operatorsHeatmap.innerHTML = `
            <div class="history-error">${data.error}</div>
        `;
        operatorsModal.classList.remove("hidden");
        return;
    }

    operatorsTitle.textContent = `Operators – ${data.username}`;
    operatorsHeatmap.innerHTML = "";

    const ops = data.operators || [];
    if (ops.length === 0) {
        operatorsHeatmap.innerHTML = `<div class="history-error">No operator data available.</div>`;
        operatorsModal.classList.remove("hidden");
        return;
    }

    const maxUsage = Math.max(...ops.map(o => (o.kills + o.deaths)), 1);

    ops
        .slice()
        .sort((a, b) => (b.kills + b.deaths) - (a.kills + a.deaths))
        .forEach(op => {
            const usage = op.kills + op.deaths;
            const ratio = Math.round((usage / maxUsage) * 100);
            const kd = op.deaths > 0 ? (op.kills / op.deaths).toFixed(2) : "—";
            const winrate = (op.wins + op.losses) > 0
                ? Math.round((op.wins / (op.wins + op.losses)) * 100)
                : 0;

            const perfColor =
                kd >= 1.4 && winrate >= 55 ? "#00c896" :
                kd >= 1.1 ? "#a3e635" :
                kd >= 0.9 ? "#eab308" :
                "#f97316";

            const icon = getOperatorIcon(op.name);

            const div = document.createElement("div");
            div.className = "heatmap-card";

            div.innerHTML = `
                <div class="heatmap-header">
                    <img src="${icon}" />
                    <span class="heatmap-name">${capitalize(op.name)}</span>
                </div>

                <div class="heatmap-bar-label">Usage intensity</div>
                <div class="heatmap-bar">
                    <div class="heatmap-bar-fill" style="width:${ratio}%;background:${perfColor};"></div>
                </div>

                <div class="heatmap-meta">
                    Usage: ${usage}+ • K/D: ${kd} • W/L: ${op.wins}/${op.losses} • Winrate: ${winrate}%
                </div>
            `;

            operatorsHeatmap.appendChild(div);
    });

    operatorsModal.classList.remove("hidden");
});

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function parseSeason(seasonStr) {
    const match = seasonStr?.match(/Y(\d+)S(\d+)/i);
    if (!match) return { year: 0, season: 0 };

    return {
        year: parseInt(match[1], 10),
        season: parseInt(match[2], 10)
    };
}

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
    const kills = d.general?.kills ?? 0;
    const deaths = d.general?.deaths ?? 0;
    const wins = d.general?.wins ?? 0;
    const losses = d.general?.losses ?? 0;
    const totalMatches = wins + losses;

    const kd = deaths > 0 ? kills / deaths : 1;
    const winrate = totalMatches > 0 ? wins / totalMatches : 0.5;
    const mmrDelta = d.ranked?.lastMatchMmrChange ?? 0;
    const opCount = (d.operators || []).length;

    const rankScore = Math.min(rank / 35, 1);
    const mmrScore = Math.min(mmr / 6000, 1);
    const kdScore = Math.min(kd / 2.5, 1);
    const winScore = winrate;
    const streakScore = Math.max(Math.min(mmrDelta / 40, 1), -1);
    const diversityScore = opCount >= 6 ? 1 : opCount / 6;

    let score = 0;
    score += rankScore * 30;
    score += mmrScore * 20;
    score += kdScore * 20;
    score += winScore * 15;
    score += (streakScore * 10);
    score += diversityScore * 5;

    return Math.round(Math.max(0, Math.min(100, score)));
}

function computeThreatBreakdown(d) {
    const kills = d.general?.kills ?? 0;
    const deaths = d.general?.deaths ?? 0;
    const wins = d.general?.wins ?? 0;
    const losses = d.general?.losses ?? 0;
    const totalMatches = wins + losses;

    const kd = deaths > 0 ? kills / deaths : 1;
    const winrate = totalMatches > 0 ? wins / totalMatches : 0.5;
    const mmrDelta = d.ranked?.lastMatchMmrChange ?? 0;
    const opCount = (d.operators || []).length;

    return [
        { label: "Rank", value: Math.round(Math.min((d.ranked?.rank ?? 0) / 35, 1) * 30) },
        { label: "MMR", value: Math.round(Math.min((d.ranked?.mmr ?? 0) / 6000, 1) * 20) },
        { label: "K/D", value: Math.round(Math.min(kd / 2.5, 1) * 20) },
        { label: "Winrate", value: Math.round(winrate * 15) },
        { label: "Streak", value: Math.round(Math.max(Math.min(mmrDelta / 40, 1), -1) * 10) },
        { label: "Op Diversity", value: Math.round(Math.min(opCount / 6, 1) * 5) }
    ];
}

function computeTeamThreatScore(results) {
    const valid = results.filter(r => r.success).map(r => r.data);
    if (valid.length === 0) return 0;

    let weightedSum = 0;
    let weightTotal = 0;

    valid.forEach(p => {
        const threat = computeThreatScore(p);
        const rankWeight = Math.max(p.ranked?.rank ?? 0, 1);
        weightedSum += threat * rankWeight;
        weightTotal += rankWeight;
    });

    return Math.round(weightedSum / weightTotal);
}

function computeTeamThreatBreakdown(results) {
    const valid = results.filter(r => r.success).map(r => r.data);
    if (valid.length === 0) return [];

    let rankSum = 0;
    let mmrSum = 0;
    let kdSum = 0;
    let winSum = 0;
    let streakSum = 0;
    let diversitySum = 0;

    valid.forEach(p => {
        const kills = p.general?.kills ?? 0;
        const deaths = p.general?.deaths ?? 0;
        const wins = p.general?.wins ?? 0;
        const losses = p.general?.losses ?? 0;
        const totalMatches = wins + losses;

        const kd = deaths > 0 ? kills / deaths : 1;
        const winrate = totalMatches > 0 ? wins / totalMatches : 0.5;
        const mmrDelta = p.ranked?.lastMatchMmrChange ?? 0;
        const opCount = (p.operators || []).length;

        rankSum     += Math.min((p.ranked?.rank ?? 0) / 35, 1) * 30;
        mmrSum      += Math.min((p.ranked?.mmr ?? 0) / 6000, 1) * 20;
        kdSum       += Math.min(kd / 2.5, 1) * 20;
        winSum      += winrate * 15;
        streakSum   += Math.max(Math.min(mmrDelta / 40, 1), -1) * 10;
        diversitySum+= Math.min(opCount / 6, 1) * 5;
    });

    const count = valid.length;

    return [
        { label: "Rank", value: Math.round(rankSum / count) },
        { label: "MMR", value: Math.round(mmrSum / count) },
        { label: "K/D", value: Math.round(kdSum / count) },
        { label: "Winrate", value: Math.round(winSum / count) },
        { label: "Streak", value: Math.round(streakSum / count) },
        { label: "Op Diversity", value: Math.round(diversitySum / count) }
    ];
}

function computeBadges(d) {
    const kills = d.general?.kills ?? 0;
    const deaths = d.general?.deaths ?? 0;
    const wins = d.general?.wins ?? 0;
    const losses = d.general?.losses ?? 0;
    const totalMatches = wins + losses;

    const kd = deaths > 0 ? kills / deaths : 0;
    const winrate = totalMatches > 0 ? wins / totalMatches : 0;
    const mmrDelta = d.ranked?.lastMatchMmrChange ?? 0;
    const opCount = (d.operators || []).length;

    const badges = [];

    if (kd >= 1.5) badges.push("High KD");
    if (winrate >= 0.55) badges.push("High Winrate");
    if (mmrDelta >= 20) badges.push("Big MMR Gain");
    if (opCount <= 3 && opCount > 0) badges.push("One‑Trick Pool");
    if ((d.ranked?.rank ?? 0) >= 30) badges.push("Top Tier");
    if (totalMatches >= 300) badges.push("Veteran");

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
