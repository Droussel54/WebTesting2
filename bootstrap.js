// bootstrap.js
import dotenv from "dotenv";
dotenv.config();

// Ensure env vars exist
const requiredVars = ["R6_EMAIL", "R6_PASSWORD", "UBI_APP_ID"];
const missing = requiredVars.filter(k => !process.env[k]?.trim());

if (missing.length) {
    console.warn(
        `[ENV] Missing required variables: ${missing.join(
            ", "
        )}. The app will still start, but external API calls may fail.`
    );
}

// Load the server AFTER env vars are applied
await import("./server.js");
