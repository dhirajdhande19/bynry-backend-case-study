import { Router } from "express";
import { getLowStockAlerts } from "./alerts.controller.js";

const router = Router();

router.get("/companies/:companyId/alerts/low-stock", getLowStockAlerts);

export default router;
