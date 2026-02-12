// server.js
import dotenv from "dotenv";
dotenv.config(); // MUST be first, before ANY other imports

import app from "./src/app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`DEV_MODE=${process.env.DEV_MODE}`);
});
