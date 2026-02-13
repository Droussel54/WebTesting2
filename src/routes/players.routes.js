// src/routes/players.routes.js
import { Router } from "express";
import { postPlayers } from "../controllers/players.controller.js";

const router = Router();
router.post("/", postPlayers);

export default router;
