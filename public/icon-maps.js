//
//  icon-maps.js
//  R6Tracker 3.0 – Icon Mapping Module
//
//  Provides:
//   - Rank → CDN filename mapping
//   - Operator → CDN filename mapping
//   - Helper functions for UI rendering
//

// -------------------------------------------------------------
//  RANK ICON MAPPING (Ubisoft Rank ID → stats.cc filename)
// -------------------------------------------------------------

export const RANK_ICON_MAP = {
    0:  "unranked-small.webp",

    // Copper (1–5)
    1:  "copper-v-small.webp",
    2:  "copper-iv-small.webp",
    3:  "copper-iii-small.webp",
    4:  "copper-ii-small.webp",
    5:  "copper-i-small.webp",

    // Bronze (6–10)
    6:  "bronze-v-small.webp",
    7:  "bronze-iv-small.webp",
    8:  "bronze-iii-small.webp",
    9:  "bronze-ii-small.webp",
    10: "bronze-i-small.webp",

    // Silver (11–15)
    11: "silver-v-small.webp",
    12: "silver-iv-small.webp",
    13: "silver-iii-small.webp",
    14: "silver-ii-small.webp",
    15: "silver-i-small.webp",

    // Gold (16–20)
    16: "gold-v-small.webp",
    17: "gold-iv-small.webp",
    18: "gold-iii-small.webp",
    19: "gold-ii-small.webp",
    20: "gold-i-small.webp",

    // Platinum (21–25)
    21: "platinum-v-small.webp",
    22: "platinum-iv-small.webp",
    23: "platinum-iii-small.webp",
    24: "platinum-ii-small.webp",
    25: "platinum-i-small.webp",

    // Diamond (26–30)
    26: "diamond-v-small.webp",
    27: "diamond-iv-small.webp",
    28: "diamond-iii-small.webp",
    29: "diamond-ii-small.webp",
    30: "diamond-i-small.webp",

    // Champion (31+)
    31: "champion-small.webp",
    32: "champion-star-small.webp" // if Ubisoft exposes star level
};


// -------------------------------------------------------------
//  RANK NAME MAPPING (Optional, for UI labels)
// -------------------------------------------------------------

export const RANK_NAME_MAP = {
    0:  "Unranked",

    1:  "Copper V",
    2:  "Copper IV",
    3:  "Copper III",
    4:  "Copper II",
    5:  "Copper I",

    6:  "Bronze V",
    7:  "Bronze IV",
    8:  "Bronze III",
    9:  "Bronze II",
    10: "Bronze I",

    11: "Silver V",
    12: "Silver IV",
    13: "Silver III",
    14: "Silver II",
    15: "Silver I",

    16: "Gold V",
    17: "Gold IV",
    18: "Gold III",
    19: "Gold II",
    20: "Gold I",

    21: "Platinum V",
    22: "Platinum IV",
    23: "Platinum III",
    24: "Platinum II",
    25: "Platinum I",

    26: "Diamond V",
    27: "Diamond IV",
    28: "Diamond III",
    29: "Diamond II",
    30: "Diamond I",

    31: "Champion",
    32: "Champion ★"
};


// -------------------------------------------------------------
//  OPERATOR ICON MAPPING (lowercase operator names → CDN)
// -------------------------------------------------------------
//
//  Operators use lowercase ASCII names, no accents, no hyphens.
//  Example: ace.svg, jager.svg, hibana.svg
//

export const OPERATOR_ICON_BASE = "https://static.stats.cc/siege/operators/";

export function getOperatorIcon(operatorName) {
    if (!operatorName) return null;
    const clean = operatorName.toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${OPERATOR_ICON_BASE}${clean}.svg`;
}


// -------------------------------------------------------------
//  RANK ICON BUILDER
// -------------------------------------------------------------

export const RANK_ICON_BASE = "https://static.stats.cc/siege/ranks/";

export function getRankIcon(rankId) {
    const file = RANK_ICON_MAP[rankId] || "unranked-small.webp";
    return `${RANK_ICON_BASE}${file}`;
}


// -------------------------------------------------------------
//  MMR DELTA COLOR HELPER
// -------------------------------------------------------------

export function getMMRDeltaColor(delta) {
    if (delta > 0) return "#66ff99";   // green
    if (delta < 0) return "#ff6b6b";   // red
    return "#c5c6c7";                  // neutral
}


// -------------------------------------------------------------
//  EXPORT DEFAULT (optional convenience)
// -------------------------------------------------------------

export default {
    RANK_ICON_MAP,
    RANK_NAME_MAP,
    getRankIcon,
    getOperatorIcon,
    getMMRDeltaColor
};
