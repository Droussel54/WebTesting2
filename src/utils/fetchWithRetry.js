// src/utils/fetchWithRetry.js
import fetch from "node-fetch";

export async function fetchWithRetry(url, options = {}, retries = 3, delayMs = 300) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok && res.status >= 500 && i < retries - 1) {
                await new Promise(r => setTimeout(r, delayMs));
                continue;
            }
            return res;
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
}
