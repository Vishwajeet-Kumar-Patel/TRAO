import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase, isDbConnected } from './config/db.js';
import apiRouter from './routes/api.js';

const app = express();

// Trust reverse proxy (Vercel, Render, AWS ALB, etc.)
app.set('trust proxy', 1);

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, health checks, server-to-server)
      if (!origin) return callback(null, true);

      if (config.frontendUrls.length === 0 || config.frontendUrls.includes('*')) {
        return callback(null, true);
      }

      // Allow configured frontend URLs or local dev environments
      const isAllowed =
        config.frontendUrls.some((allowed) => {
          if (allowed === origin) return true;
          try {
            const allowedHost = new URL(allowed).host;
            const originHost = new URL(origin).host;
            return allowedHost === originHost;
          } catch {
            return false;
          }
        }) ||
        (!config.isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1')));

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Primary lightweight health check (Render / Load Balancer)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-interview-prep-backend',
  });
});

// Database health diagnostics
app.get('/health/db', (_req: Request, res: Response) => {
  const connected = isDbConnected();
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'disconnected',
    database: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Backward compatible API health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'ai-interview-prep-backend',
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
export async function startServer(): Promise<Server> {
  await connectDatabase();

  const PORT = Number(process.env.PORT || config.port || 5000);
  const HOST = '0.0.0.0';

  const server = app.listen(PORT, HOST, () => {
    console.log(`==================================================`);
    console.log(`  AI Interview Prep Kit Backend Server`);
    console.log(`  Listening on: http://${HOST}:${PORT}`);
    console.log(`  Environment:  ${config.nodeEnv}`);
    console.log(`==================================================`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server stopped accepting connections.');
      await disconnectDatabase();
      console.log('[Server] Graceful shutdown complete. Exiting.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[Server] Forceful shutdown initiated after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;

