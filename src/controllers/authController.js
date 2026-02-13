/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */

import { AuthService } from '../services/authService.js';
import { z } from 'zod';

// Request validation schemas
const registerSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Token de actualización requerido'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

export class AuthController {
  constructor(db) {
    this.authService = new AuthService(db);
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
  register = async (req, res) => {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body);

      // Call auth service
      const result = await this.authService.register(validatedData);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        data: {
          user: result.data.user,
          accessToken: result.data.accessToken,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de registro inválidos',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };

  /**
   * Login user
   * POST /api/auth/login
   */
  login = async (req, res) => {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);

      // Call auth service
      const result = await this.authService.login(validatedData);

      if (!result.success) {
        const statusCode = result.code === 'ACCOUNT_LOCKED' ? 423 : 401;
        return res.status(statusCode).json(result);
      }

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        success: true,
        data: {
          user: result.data.user,
          accessToken: result.data.accessToken,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de inicio de sesión inválidos',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refresh = async (req, res) => {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Token de actualización no proporcionado',
          code: 'NO_REFRESH_TOKEN',
        });
      }

      // Call auth service
      const result = await this.authService.refreshAccessToken(refreshToken);

      if (!result.success) {
        // Clear invalid refresh token
        res.clearCookie('refreshToken');
        return res.status(401).json(result);
      }

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.data.accessToken,
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = async (req, res) => {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  getProfile = async (req, res) => {
    try {
      // User is already attached to req by authenticate middleware
      res.status(200).json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };

  /**
   * Change password
   * POST /api/auth/change-password
   */
  changePassword = async (req, res) => {
    try {
      // Validate request body
      const validatedData = changePasswordSchema.parse(req.body);

      // Call auth service
      const result = await this.authService.changePassword(
        req.user.id,
        validatedData.currentPassword,
        validatedData.newPassword
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Clear refresh token cookie (user will need to login again)
      res.clearCookie('refreshToken');

      res.status(200).json({
        success: true,
        message: 'Contraseña cambiada exitosamente. Por favor, inicia sesión nuevamente.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de cambio de contraseña inválidos',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}
