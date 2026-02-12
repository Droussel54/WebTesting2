// src/routes/player.routes.js
import { Router } from "express";
import { getPlayer } from "../controllers/player.controller.js";

const router = Router();

router.get("/", getPlayer);

export default router;
