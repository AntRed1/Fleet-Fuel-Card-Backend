import { CardConfig, GasStation, FuelExpense } from "../models/index.js";
import { deleteFile } from "../middleware/upload.js";

// Card Configuration Controllers
export const cardConfigController = {
  get: (req, res) => {
    try {
      const config = CardConfig.get();
      res.json(config);
    } catch (error) {
      console.error("Error getting config:", error);
      res.status(500).json({ error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const config = CardConfig.update(req.body);
      res.json(config);
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(400).json({ error: error.message });
    }
  },
};

// Gas Station Controllers
export const gasStationController = {
  getAll: (req, res) => {
    try {
      const { zone } = req.query;
      const stations = zone ? GasStation.getByZone(zone) : GasStation.getAll();
      res.json(stations);
    } catch (error) {
      console.error("Error getting stations:", error);
      res.status(500).json({ error: error.message });
    }
  },

  getById: (req, res) => {
    try {
      const station = GasStation.getById(req.params.id);
      if (!station) {
        return res.status(404).json({ error: "Estación no encontrada" });
      }
      res.json(station);
    } catch (error) {
      console.error("Error getting station:", error);
      res.status(500).json({ error: error.message });
    }
  },

  create: (req, res) => {
    try {
      console.log("Creating station with data:", req.body);
      const station = GasStation.create(req.body);
      res.status(201).json(station);
    } catch (error) {
      console.error("Error creating station:", error);
      res.status(400).json({ error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const station = GasStation.update(req.params.id, req.body);
      res.json(station);
    } catch (error) {
      console.error("Error updating station:", error);
      res.status(400).json({ error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      const station = GasStation.delete(req.params.id);
      res.json({ message: "Estación eliminada correctamente", station });
    } catch (error) {
      console.error("Error deleting station:", error);
      res.status(400).json({ error: error.message });
    }
  },

  bulkCreate: (req, res) => {
    try {
      const stations = GasStation.bulkCreate(req.body);
      res.status(201).json(stations);
    } catch (error) {
      console.error("Error bulk creating stations:", error);
      res.status(400).json({ error: error.message });
    }
  },
};

// Fuel Expense Controllers
export const fuelExpenseController = {
  getAll: (req, res) => {
    try {
      const { cycle_id, start_date, end_date } = req.query;

      let expenses;
      if (cycle_id) {
        expenses = FuelExpense.getByCycle(cycle_id);
      } else if (start_date && end_date) {
        expenses = FuelExpense.getByDateRange(start_date, end_date);
      } else {
        expenses = FuelExpense.getAll();
      }

      res.json(expenses);
    } catch (error) {
      console.error("Error getting expenses:", error);
      res.status(500).json({ error: error.message });
    }
  },

  getById: (req, res) => {
    try {
      const expense = FuelExpense.getById(req.params.id);
      if (!expense) {
        return res.status(404).json({ error: "Gasto no encontrado" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error getting expense:", error);
      res.status(500).json({ error: error.message });
    }
  },

  create: (req, res) => {
    try {
      const data = {
        ...req.body,
        receipt_image: req.file ? req.file.filename : null,
      };

      console.log("Creating expense with data:", data);
      const expense = FuelExpense.create(data);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      // Delete uploaded file if expense creation fails
      if (req.file) {
        deleteFile(req.file.filename);
      }
      res.status(400).json({ error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const oldExpense = FuelExpense.getById(req.params.id);
      if (!oldExpense) {
        if (req.file) deleteFile(req.file.filename);
        return res.status(404).json({ error: "Gasto no encontrado" });
      }

      const data = { ...req.body };

      // Handle image update
      if (req.file) {
        data.receipt_image = req.file.filename;
        // Delete old image if exists
        if (oldExpense.receipt_image) {
          deleteFile(oldExpense.receipt_image);
        }
      }

      const expense = FuelExpense.update(req.params.id, data);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      if (req.file) deleteFile(req.file.filename);
      res.status(400).json({ error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      const expense = FuelExpense.delete(req.params.id);

      // Delete associated image
      if (expense.receipt_image) {
        deleteFile(expense.receipt_image);
      }

      res.json({ message: "Gasto eliminado correctamente", expense });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: error.message });
    }
  },

  getStats: (req, res) => {
    try {
      const { cycle_id } = req.params;
      const stats = FuelExpense.getStats(cycle_id);
      res.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ error: error.message });
    }
  },
};
