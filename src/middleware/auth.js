/**
 * Authentication Middleware
 * Handles JWT validation and user authentication
 */

import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Token payload schema
const tokenPayloadSchema = z.object({
  userId: z.number(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'viewer']),
  iat: z.number(),
  exp: z.number(),
});

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No se proporcionó token de autenticación',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate payload structure
    const validatedPayload = tokenPayloadSchema.parse(decoded);

    // Attach user info to request
    req.user = {
      id: validatedPayload.userId,
      email: validatedPayload.email,
      role: validatedPayload.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido',
        code: 'INVALID_TOKEN',
      });
    }

    if (error instanceof z.ZodError) {
      return res.status(401).json({
        success: false,
        error: 'Estructura de token inválida',
        code: 'INVALID_TOKEN_STRUCTURE',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error al verificar autenticación',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const validatedPayload = tokenPayloadSchema.parse(decoded);
      
      req.user = {
        id: validatedPayload.userId,
        email: validatedPayload.email,
        role: validatedPayload.role,
      };
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para realizar esta acción',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Resource ownership validation
 */
export const validateOwnership = (resourceIdParam = 'id', allowAdmin = true) => {
  return (req, res, next) => {
    const resourceOwnerId = parseInt(req.params[resourceIdParam]);
    
    if (isNaN(resourceOwnerId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de recurso inválido',
        code: 'INVALID_RESOURCE_ID',
      });
    }

    // Admins can access all resources
    if (allowAdmin && req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    if (req.user.id !== resourceOwnerId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para acceder a este recurso',
        code: 'RESOURCE_ACCESS_DENIED',
      });
    }

    next();
  };
};
