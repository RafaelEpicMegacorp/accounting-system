import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { 
  sanitizeInput,
  handleValidationErrors 
} from '../middleware/validation';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/users
 * List all users
 */
router.get('/', 
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true
          // Exclude password for security
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        users,
        total: users.length
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        message: 'Failed to fetch users',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', 
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id: id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true
          // Exclude password for security
        }
      });

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ 
        message: 'Failed to fetch user',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id',
  authenticateToken,
  sanitizeInput,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { email, name } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: id }
      });

      if (!existingUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      // Check if email is already taken by another user
      if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email }
        });

        if (emailExists) {
          res.status(400).json({ message: 'Email already exists' });
          return;
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: id },
        data: {
          ...(email && { email }),
          ...(name && { name })
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ 
        message: 'Failed to update user',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: id }
      });

      if (!existingUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      await prisma.user.delete({
        where: { id: id }
      });

      res.json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        message: 'Failed to delete user',
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      });
    }
  }
);

export default router;