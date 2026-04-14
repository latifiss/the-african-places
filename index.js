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
const PORT = parseInt(process.env.PORT ?? '8000', 10);

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profileSessionSampleRate: 1.0,
  profileLifecycle: 'trace',
  environment: process.env.NODE_ENV || 'development',
  sendDefaultPii: true,
});

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use(
  cors({
    origin: function (origin, callback) {
      callback(null, true);
    },
    credentials: true,
  }),
);

app.use((req, res, next) => {
  console.log(`Received a ${req.method} request for ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/places', placesRouter);

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <title>The African Places API</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
          }
          h1 { color: #2c3e50; }
          .info { background: #f0f0f0; padding: 20px; margin-top: 20px; }
          code { background: #e0e0e0; padding: 2px 6px; }
        </style>
      </head>
      <body>
        <h1>🌍 The African Places API</h1>
        <div class="info">
          <p>Server is running successfully!</p>
          <p>📡 API Endpoint: <code>/api/places</code></p>
          <p>🔍 Search: <code>/api/places/search?q=lagos</code></p>
          <p>📍 Nearby: <code>/api/places/nearby?lat=6.5244&lon=3.3792&radius=5</code></p>
        </div>
      </body>
    </html>
  `);
});

app.get('/debug-sentry', function mainHandler(req, res) {
  Sentry.startSpan({ name: 'Test Span' }, () => {
    throw new Error('This is a test error for Sentry integration!');
  });
});

app.use(function onError(err, req, res, next) {
  const sentryId = Sentry.captureException(err);
  res.statusCode = 500;
  res.end(
    JSON.stringify({
      error: err.message,
      sentryId: sentryId,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }),
  );
});

async function startServer() {
  try {
    const server = app.listen(PORT, '0.0.0.0', async () => {
      console.clear();
      console.log(
        `Server running in ${process.env.NODE_ENV || 'development'} mode`,
      );
      console.log(`Listening on port ${PORT}`);
      try {
        await connectDB();
        if (isDBConnected()) {
          console.log('✅ MongoDB connection successful');
        } else {
          console.error('❌ MongoDB connection not established');
          process.exit(1);
        }
      } catch (dbErr) {
        console.error('❌ Failed to connect to MongoDB:', dbErr);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('Server startup failed:', err);
    Sentry.captureException(err);
    process.exit(1);
  }
}

startServer();
