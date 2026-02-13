import express from "express";
import {
  cardConfigController,
  gasStationController,
  fuelExpenseController,
} from "../controllers/index.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Card Configuration Routes
router.get("/config", cardConfigController.get);
router.put("/config", cardConfigController.update);

// Gas Station Routes (Full CRUD)
router.get("/stations", gasStationController.getAll);
router.get("/stations/:id", gasStationController.getById);
router.post("/stations", gasStationController.create);
router.put("/stations/:id", gasStationController.update);
router.delete("/stations/:id", gasStationController.delete);
router.post("/stations/bulk", gasStationController.bulkCreate);

// Fuel Expense Routes
router.get("/expenses", fuelExpenseController.getAll);
router.get("/expenses/:id", fuelExpenseController.getById);
router.post(
  "/expenses",
  upload.single("receipt"),
  fuelExpenseController.create,
);
router.put(
  "/expenses/:id",
  upload.single("receipt"),
  fuelExpenseController.update,
);
router.delete("/expenses/:id", fuelExpenseController.delete);
router.get("/expenses/stats/:cycle_id", fuelExpenseController.getStats);

export default router;
