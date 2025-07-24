import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { verifyToken, extractTokenFromHeader, JwtPayload } from '../utils/jwt';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({ 
        message: 'Access denied. No token provided.',
        error: 'MISSING_TOKEN' 
      });
      return;
    }

    // Verify the token
    const decoded: JwtPayload = verifyToken(token);

    // Get user from database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      res.status(401).json({ 
        message: 'Access denied. User not found.',
        error: 'USER_NOT_FOUND' 
      });
      return;
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
    
    res.status(401).json({ 
      message: 'Access denied. Invalid token.',
      error: errorMessage 
    });
  }
};

/**
 * Middleware to require authentication (alias for authenticateToken)
 */
export const requireAuth = authenticateToken;

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, but that's okay for optional auth
      next();
      return;
    }

    // Try to verify the token
    const decoded: JwtPayload = verifyToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    next();
  }
};