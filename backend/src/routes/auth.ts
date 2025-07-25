import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';
import { 
  validateUserRegistration, 
  validateUserLogin, 
  handleValidationErrors,
  sanitizeInput 
} from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', 
  sanitizeInput,
  validateUserRegistration,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({
          message: 'User already exists with this email address',
          error: 'USER_EXISTS',
        });
        return;
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Create the user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const token = generateToken(user);

      res.status(201).json({
        message: 'User registered successfully',
        user,
        token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        message: 'Registration failed',
        error: 'REGISTRATION_ERROR',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login',
  sanitizeInput,
  validateUserLogin,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(401).json({
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Check password
      const isValidPassword = await comparePassword(password, user.password);

      if (!isValidPassword) {
        res.status(401).json({
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Generate JWT token
      const token = generateToken(user);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        message: 'Login failed',
        error: 'LOGIN_ERROR',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', 
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // User is available from authenticateToken middleware
      if (!req.user) {
        res.status(401).json({
          message: 'User not authenticated',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      // Get full user details
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({
        message: 'User profile retrieved successfully',
        user,
      });
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({
        message: 'Failed to retrieve user profile',
        error: 'PROFILE_ERROR',
      });
    }
  }
);

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile',
  authenticateToken,
  sanitizeInput,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          message: 'User not authenticated',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const { name } = req.body;

      // Validate name if provided
      if (name && (typeof name !== 'string' || name.trim().length < 2)) {
        res.status(400).json({
          message: 'Name must be at least 2 characters long',
          error: 'INVALID_NAME',
        });
        return;
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(name && { name: name.trim() }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          updatedAt: true,
        },
      });

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        message: 'Failed to update profile',
        error: 'UPDATE_PROFILE_ERROR',
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    // For JWT tokens, logout is primarily handled client-side
    // This endpoint exists for consistency and future token blacklisting
    res.json({
      message: 'Logout successful',
    });
  }
);

export default router;