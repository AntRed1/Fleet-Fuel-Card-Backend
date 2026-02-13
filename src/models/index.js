import db from "../config/database.js";

export class CardConfig {
  static get() {
    return db
      .prepare("SELECT * FROM card_config ORDER BY id DESC LIMIT 1")
      .get();
  }

  static update(data) {
    const stmt = db.prepare(`
      UPDATE card_config 
      SET monthly_limit = ?, 
          cutoff_start_day = ?, 
          cutoff_end_day = ?, 
          recharge_day = ?,
          updated_at = datetime('now')
      WHERE id = (SELECT id FROM card_config ORDER BY id DESC LIMIT 1)
    `);

    stmt.run(
      data.monthly_limit,
      data.cutoff_start_day,
      data.cutoff_end_day,
      data.recharge_day,
    );

    return this.get();
  }
}

export class GasStation {
  static getAll() {
    return db.prepare("SELECT * FROM gas_stations ORDER BY zone, name").all();
  }

  static getById(id) {
    return db.prepare("SELECT * FROM gas_stations WHERE id = ?").get(id);
  }

  static getByZone(zone) {
    return db
      .prepare("SELECT * FROM gas_stations WHERE zone = ? ORDER BY name")
      .all(zone);
  }

  static create(data) {
    // Validate required fields
    if (!data.name || !data.name.trim()) {
      throw new Error("El nombre de la estación es requerido");
    }
    if (!data.address || !data.address.trim()) {
      throw new Error("La dirección de la estación es requerida");
    }

    const stmt = db.prepare(`
      INSERT INTO gas_stations (name, address, zone, province, lat, lng)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name.trim(),
      data.address.trim(),
      data.zone?.trim() || "Zona General", // Default value if not provided
      data.province?.trim() || null,
      data.lat || null,
      data.lng || null,
    );

    return this.getById(result.lastInsertRowid);
  }

  static update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error("El nombre de la estación no puede estar vacío");
      }
      fields.push("name = ?");
      values.push(data.name.trim());
    }

    if (data.address !== undefined) {
      fields.push("address = ?");
      values.push(data.address.trim());
    }

    if (data.zone !== undefined) {
      fields.push("zone = ?");
      values.push(data.zone.trim() || "Zona General");
    }

    if (data.province !== undefined) {
      fields.push("province = ?");
      values.push(data.province?.trim() || null);
    }

    if (data.lat !== undefined) {
      fields.push("lat = ?");
      values.push(data.lat);
    }

    if (data.lng !== undefined) {
      fields.push("lng = ?");
      values.push(data.lng);
    }

    if (fields.length === 0) {
      throw new Error("No hay campos para actualizar");
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE gas_stations 
      SET ${fields.join(", ")}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  }

  static delete(id) {
    const station = this.getById(id);
    if (!station) {
      throw new Error("Estación no encontrada");
    }
    db.prepare("DELETE FROM gas_stations WHERE id = ?").run(id);
    return station;
  }

  static bulkCreate(stations) {
    const stmt = db.prepare(`
      INSERT INTO gas_stations (name, address, zone, province, lat, lng)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
      for (const station of items) {
        stmt.run(
          station.name,
          station.address,
          station.zone || "Zona General",
          station.province || null,
          station.lat || null,
          station.lng || null,
        );
      }
    });

    insertMany(stations);
    return this.getAll();
  }
}

export class FuelExpense {
  static getAll() {
    return db
      .prepare(
        `
      SELECT e.*, s.name as station_name, s.address as station_address
      FROM fuel_expenses e
      LEFT JOIN gas_stations s ON e.station_id = s.id
      ORDER BY e.date DESC, e.created_at DESC
    `,
      )
      .all();
  }

  static getById(id) {
    return db
      .prepare(
        `
      SELECT e.*, s.name as station_name, s.address as station_address
      FROM fuel_expenses e
      LEFT JOIN gas_stations s ON e.station_id = s.id
      WHERE e.id = ?
    `,
      )
      .get(id);
  }

  static getByCycle(cycleId) {
    return db
      .prepare(
        `
      SELECT e.*, s.name as station_name, s.address as station_address
      FROM fuel_expenses e
      LEFT JOIN gas_stations s ON e.station_id = s.id
      WHERE e.cycle_id = ?
      ORDER BY e.date DESC, e.created_at DESC
    `,
      )
      .all(cycleId);
  }

  static create(data) {
    // Validate required fields
    if (!data.amount || data.amount <= 0) {
      throw new Error("El monto debe ser mayor a 0");
    }
    if (!data.date) {
      throw new Error("La fecha es requerida");
    }
    if (!data.cycle_id) {
      throw new Error("El ID de ciclo es requerido");
    }

    const stmt = db.prepare(`
      INSERT INTO fuel_expenses (amount, date, station_id, cycle_id, notes, receipt_image)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.amount,
      data.date,
      data.station_id || null,
      data.cycle_id,
      data.notes || null,
      data.receipt_image || null,
    );

    return this.getById(result.lastInsertRowid);
  }

  static update(id, data) {
    const fields = [];
    const values = [];

    if (data.amount !== undefined) {
      if (data.amount <= 0) {
        throw new Error("El monto debe ser mayor a 0");
      }
      fields.push("amount = ?");
      values.push(data.amount);
    }
    if (data.date !== undefined) {
      fields.push("date = ?");
      values.push(data.date);
    }
    if (data.station_id !== undefined) {
      fields.push("station_id = ?");
      values.push(data.station_id);
    }
    if (data.notes !== undefined) {
      fields.push("notes = ?");
      values.push(data.notes);
    }
    if (data.receipt_image !== undefined) {
      fields.push("receipt_image = ?");
      values.push(data.receipt_image);
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const stmt = db.prepare(`
      UPDATE fuel_expenses 
      SET ${fields.join(", ")}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  }

  static delete(id) {
    const expense = this.getById(id);
    if (!expense) {
      throw new Error("Gasto no encontrado");
    }
    db.prepare("DELETE FROM fuel_expenses WHERE id = ?").run(id);
    return expense;
  }

  static getStats(cycleId) {
    return db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_spent,
        COALESCE(AVG(amount), 0) as average_amount,
        COALESCE(MIN(amount), 0) as min_amount,
        COALESCE(MAX(amount), 0) as max_amount
      FROM fuel_expenses
      WHERE cycle_id = ?
    `,
      )
      .get(cycleId);
  }

  static getByDateRange(startDate, endDate) {
    return db
      .prepare(
        `
      SELECT e.*, s.name as station_name, s.address as station_address
      FROM fuel_expenses e
      LEFT JOIN gas_stations s ON e.station_id = s.id
      WHERE e.date BETWEEN ? AND ?
      ORDER BY e.date DESC, e.created_at DESC
    `,
      )
      .all(startDate, endDate);
  }
}
