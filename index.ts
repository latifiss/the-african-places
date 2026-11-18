import 'dotenv/config';
import express from 'express';
import favicon from 'serve-favicon';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { connectDB, isDBConnected, mongoose } from './db/index.js';
import { generalRateLimit, authRateLimit } from './middleware/rateLimit.js';
import authRouter from './routes/auth.js';
import placesRouter from './routes/places.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number.parseInt(process.env.PORT ?? '8000', 10);
const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: isProduction ? 0.1 : 1,
  profilesSampleRate: isProduction ? 0.1 : 1,
  environment: process.env.NODE_ENV || 'development',
});

function configureTrustProxy(): void {
  const setting = process.env.TRUST_PROXY;
  if (!setting) return;
  if (setting === 'true') app.set('trust proxy', true);
  else if (setting === 'false') app.set('trust proxy', false);
  else if (/^\d+$/.test(setting)) app.set('trust proxy', Number(setting));
  else throw new Error('TRUST_PROXY must be true, false, or a non-negative integer');
}

configureTrustProxy();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use((req, res, next) => {
  const requestId = req.header('x-request-id')?.slice(0, 128) || randomUUID();
  res.setHeader('X-Request-ID', requestId);
  next();
});

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  maxAge: 86_400,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb', parameterLimit: 1000 }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

app.get('/health/live', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health/ready', (_req, res) => {
  const ready = isDBConnected();
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks: { database: ready ? 'connected' : 'disconnected' },
  });
});

app.use('/api/auth', authRateLimit, authRouter);
app.use('/api/places', generalRateLimit, placesRouter);

app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'The African Places API',
    status: 'ok',
    documentation: 'https://theafricanplaces.com',
    health: '/health/live',
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const err = error instanceof Error ? error : new Error('Unknown server error');
  const statusCode = (error as { status?: number })?.status;
  const status = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 ? statusCode : 500;
  const eventId = status >= 500 ? Sentry.captureException(err, { extra: { requestId: res.getHeader('X-Request-ID') } }) : undefined;

  if (status >= 500) console.error('[http] Unhandled request error', { requestId: res.getHeader('X-Request-ID'), error: err });
  else console.warn('[http] Request rejected', { status, message: err.message });

  if (res.headersSent) return;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
    requestId: res.getHeader('X-Request-ID'),
    ...(eventId ? { eventId } : {}),
  });
});

async function startServer(): Promise<void> {
  if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters in production');
  }

  await connectDB();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.info(`[server] Listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  server.keepAliveTimeout = 60_000;
  server.headersTimeout = 65_000;
  server.requestTimeout = 30_000;

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`[server] ${signal} received; shutting down gracefully`);

    const forceExit = setTimeout(() => {
      console.error('[server] Graceful shutdown timed out');
      process.exit(1);
    }, 15_000);
    forceExit.unref();

    server.close(async (error) => {
      try {
        await mongoose.disconnect();
        await Sentry.close(2_000);
        clearTimeout(forceExit);
        if (error) throw error;
        process.exit(0);
      } catch (shutdownError) {
        console.error('[server] Shutdown failed', shutdownError);
        process.exit(1);
      }
    });
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('[server] Startup failed', error);
  Sentry.captureException(error);
  void Sentry.close(2_000).finally(() => process.exit(1));
});
