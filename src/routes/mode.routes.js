// src/routes/mode.routes.js
import { Router } from "express";
import { getMode, setMode } from "../controllers/mode.controller.js";

const router = Router();
router.get("/", getMode);
router.post("/", setMode);

export default router;
