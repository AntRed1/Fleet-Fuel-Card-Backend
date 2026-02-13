/**
 * Authentication Routes
 * Defines endpoints for authentication
 */

import express from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

export const createAuthRoutes = (db) => {
  const router = express.Router();
  const authController = new AuthController(db);

  /**
   * @route   POST /api/auth/register
   * @desc    Register new user
   * @access  Public
   */
  router.post('/register', authController.register);

  /**
   * @route   POST /api/auth/login
   * @desc    Login user
   * @access  Public
   */
  router.post('/login', authController.login);

  /**
   * @route   POST /api/auth/refresh
   * @desc    Refresh access token
   * @access  Public (requires refresh token)
   */
  router.post('/refresh', authController.refresh);

  /**
   * @route   POST /api/auth/logout
   * @desc    Logout user
   * @access  Public
   */
  router.post('/logout', authController.logout);

  /**
   * @route   GET /api/auth/me
   * @desc    Get current user profile
   * @access  Protected
   */
  router.get('/me', authenticate, authController.getProfile);

  /**
   * @route   POST /api/auth/change-password
   * @desc    Change user password
   * @access  Protected
   */
  router.post('/change-password', authenticate, authController.changePassword);

  return router;
};
