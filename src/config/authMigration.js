/**
 * Database Migration: Users and Authentication Tables
 * Creates tables for user management and authentication
 */

export const createAuthTables = (db) => {
  console.log("📋 Creating authentication tables...");

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'viewer')),
      is_active INTEGER NOT NULL DEFAULT 1,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )
  `);

  // Refresh tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
  `);

  console.log("✅ Authentication tables created successfully");
};

/**
 * Create default admin user if none exists
 */
export const createDefaultAdmin = async (db, authService) => {
  try {
    // Check if any admin exists
    const adminExists = db
      .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
      .get();

    if (adminExists) {
      console.log("ℹ️  Admin user already exists");
      return;
    }

    console.log("📋 Creating default admin user...");

    // Create default admin
    const result = await authService.register({
      email: process.env.DEFAULT_ADMIN_EMAIL || "arojas@gmail.com",
      password: process.env.DEFAULT_ADMIN_PASSWORD || "@Emulador25",
      name: "Administrador",
      role: "admin",
    });

    if (result.success) {
      console.log("✅ Default admin user created successfully");
      console.log(
        `   Email: ${process.env.DEFAULT_ADMIN_EMAIL || "arojas@gmail.com"}`,
      );
      console.log(
        `   Password: ${process.env.DEFAULT_ADMIN_PASSWORD || "@Emulador25"}`,
      );
      console.log("   ⚠️  IMPORTANT: Change this password immediately!");
    } else {
      console.error("❌ Failed to create default admin:", result.error);
    }
  } catch (error) {
    console.error("❌ Error creating default admin:", error.message);
  }
};
