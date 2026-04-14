import 'dotenv/config';
import express from 'express';
import { connectDB, isDBConnected } from './db/index.js';
import morgan from 'morgan';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import authRouter from './routes/auth.js';
import placesRouter from './routes/places.js';

const app = express();
const PORT: number = parseInt(process.env.PORT ?? '8000', 10);

const allowedOrigins = [
  'http://localhost:4000',
  'http://localhost:3000'
];

Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://your-sentry-dsn',
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  environment: process.env.NODE_ENV || 'development',
});

// INCREASED LIMITS FOR BULK UPLOAD
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 100000 }));

app.use(morgan('dev'));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// FIXED LOGGING MIDDLEWARE
app.use((req, res, next) => {
  console.log(`Received a ${req.method} request for ${req.url}`);
  // Only log the body if it's small to prevent crash on bulk upload
  if (req.body && !Array.isArray(req.body) && Object.keys(req.body).length > 0) {
    // console.log('Request Body:', JSON.stringify(req.body, null, 2)); 
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

    // SET TIMEOUT TO 5 MINUTES FOR THE SERVER
    server.timeout = 300000;

  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
}

startServer();