// src/services/demo-generator.service.js

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const OPERATORS = [
  "ace",
  "jager",
  "ash",
  "smoke",
  "sledge",
  "mute",
  "hibana",
  "zofia",
  "ela",
  "bandit",
  "thermite",
  "twitch",
  "valkyrie",
  "castle",
  "pulse",
  "finka",
  "lion",
  "alibi",
  "maestro",
];

export function generateRandomPlayer(username, platform) {
  const rank = randomInt(0, 32);
  const mmr = randomInt(800, 6000);
  const lastMatchMmrChange = randomInt(-30, 40);

  const kills = randomInt(100, 2000);
  const deaths = randomInt(80, 1800);
  const matchesWon = randomInt(20, 300);
  const matchesLost = randomInt(20, 300);

  const ops = [];
  const opCount = randomInt(3, 6);

  for (let i = 0; i < opCount; i++) {
    const name = randomChoice(OPERATORS);
    ops.push({
      name,
      kills: randomInt(10, 300),
      deaths: randomInt(5, 250),
      wins: randomInt(5, 80),
      losses: randomInt(5, 80),
    });
  }

  return {
    username,
    platform,
    ranked: {
      rank,
      mmr,
      season: "Y9S4",
      lastMatchMmrChange,
    },
    general: {
      kills,
      deaths,
      matchesWon,
      matchesLost,
    },
    operators: ops,
  };
}

export function generateRandomSeasonalHistory() {
  const seasons = [
    "Y0S0",
    "Y1S1",
    "Y1S2",
    "Y1S3",
    "Y1S4",
    "Y2S1",
    "Y2S2",
    "Y2S3",
    "Y2S4",
    "Y3S1",
    "Y3S2",
    "Y3S3",
    "Y3S4",
    "Y4S1",
    "Y4S2",
    "Y4S3",
    "Y4S4",
    "Y5S1",
    "Y5S2",
    "Y5S3",
    "Y5S4",
    "Y6S1",
    "Y6S2",
    "Y6S3",
    "Y6S4",
    "Y7S1",
    "Y7S2",
    "Y7S3",
    "Y7S4",
    "Y8S1",
    "Y8S2",
    "Y8S3",
    "Y8S4",
    "Y9S1",
    "Y9S2",
    "Y9S3",
    "Y9S4",
    "Y10S1",
    "Y10S2",
    "Y10S3",
    "Y10S4",
  ];

  return seasons.map((season) => {
    const mmr = randomInt(1500, 6000);
    const maxMmr = mmr + randomInt(0, 300);
    const rank = randomInt(0, 32);
    const maxRank = Math.max(rank, randomInt(0, 32));

    return {
      season,
      region: "NA",
      mmr,
      maxMmr,
      rank,
      maxRank,
    };
  });
}
