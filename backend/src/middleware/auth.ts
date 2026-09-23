import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { datastore } from '../models/datastore.js';
import { AuthSession } from '@prep-kit/shared';

export interface AuthenticatedRequest extends Request {
  user?: AuthSession;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(payload: AuthSession): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthSession | null {
  try {
    return jwt.verify(token, config.jwtSecret) as AuthSession;
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing or malformed',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const session = verifyToken(token);

  if (!session || !session.userId) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication session',
      },
    });
    return;
  }

  const user = await datastore.findUserById(session.userId);
  if (!user) {
    res.status(401).json({
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Authenticated user no longer exists',
      },
    });
    return;
  }

  req.user = session;
  next();
}
