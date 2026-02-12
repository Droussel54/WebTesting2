// src/services/demo-data.service.js

export const placeholderPlayers = [
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

export const placeholderSeasonal = [
    { season: "Y9S4", region: "NA", mmr: 5100, maxMmr: 5200, rank: 31, maxRank: 31 },
    { season: "Y9S3", region: "NA", mmr: 4800, maxMmr: 4900, rank: 30, maxRank: 30 },
    { season: "Y9S2", region: "NA", mmr: 4500, maxMmr: 4600, rank: 29, maxRank: 29 }
];
