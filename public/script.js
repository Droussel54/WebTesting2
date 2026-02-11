const form = document.getElementById("players-form");
const statusEl = document.getElementById("status");
const resultsTable = document.getElementById("results-table");
const resultsBody = document.getElementById("results-body");
const historyPanel = document.getElementById("history-panel");
const historyTitle = document.getElementById("history-title");
const historyBody = document.getElementById("history-body");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const platform = document.getElementById("platform").value;
    const inputs = document.querySelectorAll("input[data-player-index]");
    const players = [];

    inputs.forEach(input => {
        const username = input.value.trim();
        if (username) {
            players.push({ username, platform });
        }
    });

    if (players.length === 0) {
        statusEl.textContent = "Enter at least one username.";
        return;
    }

    statusEl.textContent = "Loading...";
    resultsTable.classList.add("hidden");
    historyPanel.classList.add("hidden");
    resultsBody.innerHTML = "";

    try {
        const res = await fetch("/api/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ players })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            statusEl.textContent = err.error || `Request failed (${res.status})`;
            return;
        }

        const data = await res.json();
        statusEl.textContent = "";

        data.results.forEach(r => {
            const tr = document.createElement("tr");

            if (!r.success) {
                tr.innerHTML = `
                    <td>${r.username}</td>
                    <td>${players[0].platform}</td>
                    <td colspan="6">Error: ${r.error}</td>
                `;
                resultsBody.appendChild(tr);
                return;
            }

            const d = r.data;
            const kd = d.general.deaths > 0
                ? (d.general.kills / d.general.deaths).toFixed(2)
                : "—";

            tr.innerHTML = `
                <td>${d.username}</td>
                <td>${d.platform}</td>
                <td>${d.ranked.mmr ?? "—"}</td>
                <td>${d.ranked.rank ?? "—"}</td>
                <td>${kd}</td>
                <td>${d.general.matchesWon}/${d.general.matchesLost}</td>
                <td>${d.ranked.season ?? "—"}</td>
                <td><button class="history-button" data-username="${d.username}" data-platform="${d.platform}">View</button></td>
            `;

            resultsBody.appendChild(tr);
        });

        resultsTable.classList.remove("hidden");
    } catch (err) {
        console.error(err);
        statusEl.textContent = "Unexpected error. Check console.";
    }
});

resultsBody.addEventListener("click", async (e) => {
    const btn = e.target.closest(".history-button");
    if (!btn) return;

    const username = btn.getAttribute("data-username");
    const platform = btn.getAttribute("data-platform");

    statusEl.textContent = `Loading seasonal history for ${username}...`;
    historyPanel.classList.add("hidden");
    historyBody.innerHTML = "";

    try {
        const res = await fetch(`/api/seasonal?username=${encodeURIComponent(username)}&platform=${encodeURIComponent(platform)}`);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            statusEl.textContent = err.error || `History request failed (${res.status})`;
            return;
        }

        const data = await res.json();
        statusEl.textContent = "";

        historyTitle.textContent = `Seasonal History – ${data.username} (${data.platform})`;
        historyBody.innerHTML = "";

        data.history.forEach(h => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${h.season}</td>
                <td>${h.region}</td>
                <td>${h.mmr ?? "—"}</td>
                <td>${h.maxMmr ?? "—"}</td>
                <td>${h.rank ?? "—"}</td>
                <td>${h.maxRank ?? "—"}</td>
            `;
            historyBody.appendChild(tr);
        });

        historyPanel.classList.remove("hidden");
    } catch (err) {
        console.error(err);
        statusEl.textContent = "Unexpected error while loading history.";
    }
});
