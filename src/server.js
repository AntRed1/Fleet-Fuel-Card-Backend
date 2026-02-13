/**
 * Main Server File
 * Express server with authentication and fleet management
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/index.js";
import db, { initializeDatabase } from "./config/database.js";
import { createAuthRoutes } from "./routes/authRoutes.js";
import {
  createAuthTables,
  createDefaultAdmin,
} from "./config/authMigration.js";
import { AuthService } from "./services/authService.js";

// Environment variables validation
const requiredEnvVars = ["JWT_SECRET", "JWT_REFRESH_SECRET", "PORT"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach((envVar) => console.error(`   - ${envVar}`));
  process.exit(1);
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT;

// 🔥 Inicializar TODAS las tablas de la app
initializeDatabase();

// 🔥 Crear tablas de autenticación
createAuthTables(db);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `El origen ${origin} no está permitido por la política de CORS`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message:
    "Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message:
    "Demasiados intentos de autenticación, por favor intenta de nuevo más tarde",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

app.use("/api/", limiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Compression
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`,
    );
  });
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Routes
app.use("/api/auth", createAuthRoutes(db));
app.use("/api", apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint no encontrado",
    code: "NOT_FOUND",
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);

  // CORS errors
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      error: "Origen no permitido por CORS",
      code: "CORS_ERROR",
    });
  }

  // Rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: "Demasiadas solicitudes",
      code: "RATE_LIMIT_EXCEEDED",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Error interno del servidor",
    code: err.code || "INTERNAL_ERROR",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("💤 HTTP server closed");
    db.close();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n🛑 SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("💤 HTTP server closed");
    db.close();
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, async () => {
  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║   🚗 Fleet Fuel Card API Server                 ║");
  console.log(`║   ✅ Server running on port ${PORT}             ║`);
  console.log(`║   🌐 Environment: ${process.env.NODE_ENV || "development"}║`);
  console.log("║   📁 Database initialized                     ║");
  console.log("║   🔒 Security enabled                         ║");
  console.log("╚═══════════════════════════════════════════════╝\n");

  // Create default admin user
  const authService = new AuthService(db);
  await createDefaultAdmin(db, authService);
});

export { app, db };
