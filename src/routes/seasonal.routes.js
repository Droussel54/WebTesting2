// src/routes/seasonal.routes.js
import { Router } from "express";
import { getSeasonal } from "../controllers/seasonal.controller.js";

const router = Router();

router.get("/", getSeasonal);

export default router;
