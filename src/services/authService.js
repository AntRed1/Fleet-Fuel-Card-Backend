/**
 * Authentication Service
 * Handles user authentication, token generation, and password management
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

export class AuthService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    if (password.length < PASSWORD_MIN_LENGTH) {
      return {
        valid: false,
        error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
      };
    }

    if (!PASSWORD_REGEX.test(password)) {
      return {
        valid: false,
        error:
          "La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales (@$!%*?&)",
      };
    }

    return { valid: true };
  }

  /**
   * Generate access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        type: "refresh",
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY },
    );
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      if (decoded.type !== "refresh") {
        throw new Error("Invalid token type");
      }
      return { valid: true, userId: decoded.userId };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Register new user
   */
  async register({ email, password, name, role = "user" }) {
    try {
      // Validate email format
      const emailSchema = z.string().email();
      emailSchema.parse(email);

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.error,
          code: "WEAK_PASSWORD",
        };
      }

      // Check if user already exists
      const existingUser = this.db
        .prepare("SELECT id FROM users WHERE email = ?")
        .get(email);

      if (existingUser) {
        return {
          success: false,
          error: "El correo electrónico ya está registrado",
          code: "EMAIL_EXISTS",
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Insert user
      const result = this.db
        .prepare(
          `INSERT INTO users (email, password_hash, name, role, created_at) 
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(email, passwordHash, name, role, new Date().toISOString());

      const user = {
        id: result.lastInsertRowid,
        email,
        name,
        role,
      };

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Store refresh token
      this.db
        .prepare(
          `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(
          user.id,
          refreshToken,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          new Date().toISOString(),
        );

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: "Formato de correo electrónico inválido",
          code: "INVALID_EMAIL",
        };
      }

      return {
        success: false,
        error: "Error al registrar usuario",
        code: "REGISTRATION_ERROR",
        details: error.message,
      };
    }
  }

  /**
   * Login user
   */
  async login({ email, password }) {
    try {
      // Find user
      const user = this.db
        .prepare(
          `SELECT id, email, password_hash, name, role, is_active, failed_login_attempts, locked_until
           FROM users WHERE email = ?`,
        )
        .get(email);

      if (!user) {
        return {
          success: false,
          error: "Credenciales inválidas",
          code: "INVALID_CREDENTIALS",
        };
      }

      // Check if account is active
      if (!user.is_active) {
        return {
          success: false,
          error: "Cuenta desactivada",
          code: "ACCOUNT_DISABLED",
        };
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return {
          success: false,
          error:
            "Cuenta bloqueada temporalmente debido a múltiples intentos fallidos",
          code: "ACCOUNT_LOCKED",
          lockedUntil: user.locked_until,
        };
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(
        password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        // Increment failed attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        let updateQuery = "UPDATE users SET failed_login_attempts = ?";
        const params = [failedAttempts];

        // Lock account after 5 failed attempts
        if (failedAttempts >= 5) {
          const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          updateQuery += ", locked_until = ?";
          params.push(lockUntil.toISOString());
        }

        updateQuery += " WHERE id = ?";
        params.push(user.id);

        this.db.prepare(updateQuery).run(...params);

        return {
          success: false,
          error: "Credenciales inválidas",
          code: "INVALID_CREDENTIALS",
          attemptsRemaining: Math.max(0, 5 - failedAttempts),
        };
      }

      // Reset failed attempts and unlock account
      this.db
        .prepare(
          `UPDATE users 
           SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ?
           WHERE id = ?`,
        )
        .run(new Date().toISOString(), user.id);

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Store refresh token
      this.db
        .prepare(
          `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(
          user.id,
          refreshToken,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          new Date().toISOString(),
        );

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al iniciar sesión",
        code: "LOGIN_ERROR",
        details: error.message,
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const verification = this.verifyRefreshToken(refreshToken);
      if (!verification.valid) {
        return {
          success: false,
          error: "Token de actualización inválido",
          code: "INVALID_REFRESH_TOKEN",
        };
      }

      // Check if token exists and is not revoked
      const tokenRecord = this.db
        .prepare(
          `SELECT user_id, revoked_at FROM refresh_tokens 
           WHERE token = ? AND expires_at > ?`,
        )
        .get(refreshToken, new Date().toISOString());

      if (!tokenRecord) {
        return {
          success: false,
          error: "Token de actualización no encontrado o expirado",
          code: "TOKEN_NOT_FOUND",
        };
      }

      if (tokenRecord.revoked_at) {
        return {
          success: false,
          error: "Token de actualización revocado",
          code: "TOKEN_REVOKED",
        };
      }

      // Get user
      const user = this.db
        .prepare(
          "SELECT id, email, name, role FROM users WHERE id = ? AND is_active = 1",
        )
        .get(tokenRecord.user_id);

      if (!user) {
        return {
          success: false,
          error: "Usuario no encontrado o inactivo",
          code: "USER_NOT_FOUND",
        };
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      return {
        success: true,
        data: {
          accessToken,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al actualizar token",
        code: "REFRESH_ERROR",
        details: error.message,
      };
    }
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken) {
    try {
      this.db
        .prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE token = ?")
        .run(new Date().toISOString(), refreshToken);

      return {
        success: true,
        message: "Sesión cerrada exitosamente",
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al cerrar sesión",
        code: "LOGOUT_ERROR",
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get current password hash
      const user = this.db
        .prepare("SELECT password_hash FROM users WHERE id = ?")
        .get(userId);

      if (!user) {
        return {
          success: false,
          error: "Usuario no encontrado",
          code: "USER_NOT_FOUND",
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(
        currentPassword,
        user.password_hash,
      );

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: "Contraseña actual incorrecta",
          code: "INVALID_CURRENT_PASSWORD",
        };
      }

      // Validate new password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.error,
          code: "WEAK_PASSWORD",
        };
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      this.db
        .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
        .run(newPasswordHash, userId);

      // Revoke all refresh tokens for security
      this.db
        .prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ?")
        .run(new Date().toISOString(), userId);

      return {
        success: true,
        message: "Contraseña actualizada exitosamente",
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al cambiar contraseña",
        code: "PASSWORD_CHANGE_ERROR",
        details: error.message,
      };
    }
  }
}
