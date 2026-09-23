import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { connectDatabase } from './config/db.js';
import apiRouter from './routes/api.js';

const app = express();

// Middleware
// Allow origins configured via env (comma-separated), default to wildcard for local dev.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['*'];

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errorMsg = err instanceof Error ? err.message : String(err);
  console.error('[Server] Unhandled exception:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: errorMsg || 'An unexpected internal error occurred',
    },
  });
});

// Start Server
export async function startServer() {
  await connectDatabase();

  const server = app.listen(config.port, () => {
    console.log(`==================================================`);
    console.log(`  AI Interview Prep Kit Backend Server`);
    console.log(`  Listening on: http://localhost:${config.port}`);
    console.log(`  Environment:  ${config.nodeEnv}`);
    console.log(`==================================================`);
  });

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
