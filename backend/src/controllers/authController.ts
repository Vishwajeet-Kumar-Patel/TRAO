import { Request, Response } from 'express';
import { z } from 'zod';
import { datastore } from '../models/datastore.js';
import { hashPassword, comparePassword, generateToken, AuthenticatedRequest } from '../middleware/auth.js';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parse = RegisterSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: parse.error.issues[0].message,
      },
    });
    return;
  }

  const { email, password } = parse.data;

  const existing = await datastore.findUserByEmail(email);
  if (existing) {
    res.status(409).json({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists',
      },
    });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await datastore.createUser(email, passwordHash);
  const token = generateToken({ userId: user.id, email: user.email });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: parse.error.issues[0].message,
      },
    });
    return;
  }

  const { email, password } = parse.data;
  const user = await datastore.findUserByEmail(email);

  if (!user) {
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const matches = await comparePassword(password, user.passwordHash);
  if (!matches) {
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const token = generateToken({ userId: user.id, email: user.email });

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  const user = await datastore.findUserById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    return;
  }

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'Logged out successfully' });
}
