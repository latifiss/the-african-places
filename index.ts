import 'dotenv/config';
import express from 'express';
import favicon from 'serve-favicon';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, isDBConnected } from './db/index.js';
import morgan from 'morgan';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import authRouter from './routes/auth.js';
import placesRouter from './routes/places.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT: number = parseInt(process.env.PORT ?? '8000', 10);

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  environment: process.env.NODE_ENV || 'development',
});

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 100000 }));

app.use(morgan('dev'));
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
}));

app.use((req, res, next) => {
  console.log(`Received a ${req.method} request for ${req.url}`);
  if (req.body && !Array.isArray(req.body) && Object.keys(req.body).length > 0) {
  } else if (Array.isArray(req.body)) {
    console.log(`Request Body: Array with ${req.body.length} items (Body logging skipped for performance)`);
  }
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/places', placesRouter);

app.get('/', (req, res) => res.send('Hello World!'));

app.use(function onError(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  const sentryId = Sentry.captureException(err);
  res.status(500).json({
    error: err.message,
    sentryId: sentryId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

async function startServer() {
  try {
    const server = app.listen(PORT, '0.0.0.0', async () => {
      console.log(`Server running on port ${PORT}`);
      await connectDB();
    });

    server.timeout = 300000;

  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
}

startServer();