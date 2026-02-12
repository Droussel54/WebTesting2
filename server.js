// server.js
import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";

const PORT = process.env.PORT || 3000;
const DEV_MODE = process.env.DEV_MODE === "true";

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`DEV_MODE=${DEV_MODE}`);
});
