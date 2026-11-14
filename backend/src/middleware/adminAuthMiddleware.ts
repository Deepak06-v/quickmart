import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Admin, IAdmin } from '../models/Admin';

export interface AuthenticatedAdminRequest extends Request {
  admin?: IAdmin;
  adminId?: string;
}

export async function requireAdminAuth(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Admin authorization required. Please sign in to the Admin Dashboard.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      adminId?: string;
      email?: string;
      role?: string;
    };

    if (!decoded.adminId || decoded.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Admin privileges required.',
      });
      return;
    }

    const admin = await Admin.findOne({ _id: decoded.adminId, isActive: true });
    if (!admin) {
      res.status(401).json({
        success: false,
        message: 'Admin account not found or has been disabled.',
      });
      return;
    }

    req.admin = admin;
    req.adminId = admin._id.toString();
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Admin session expired. Please log in again.',
        code: 'SESSION_EXPIRED',
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid or corrupted admin authorization token.',
    });
  }
}
