import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; mobile: string };
    const user = await User.findOne({ _id: decoded.userId, isDeleted: false });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Account not found or has been deactivated.',
      });
      return;
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        code: 'SESSION_EXPIRED',
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; mobile: string };
    const user = await User.findOne({ _id: decoded.userId, isDeleted: false });
    if (user) {
      req.user = user;
      req.userId = user._id.toString();
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }

  next();
}
