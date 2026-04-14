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
const PORT = parseInt(process.env.PORT ?? '8000', 10);
const allowedOrigins = [
    'http://localhost:4000',
    'http://localhost:3000'
];
Sentry.init({
    dsn: process.env.SENTRY_DSN || 'https://b39d02628dd77cfbc2a9313e77aa1ee4@o4509581439533056.ingest.de.sentry.io/4509581498450000',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 1.0,
    profileSessionSampleRate: 1.0,
    profileLifecycle: 'trace',
    environment: process.env.NODE_ENV || 'development',
    sendDefaultPii: true,
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use(cors({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
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
    res.send('Hello World!');
});
app.get('/debug-sentry', function mainHandler(req, res) {
    Sentry.startSpan({ name: 'Test Span' }, () => {
        throw new Error('This is a test error for Sentry integration!');
    });
});
app.use(function onError(err, req, res, next) {
    const sentryId = Sentry.captureException(err);
    res.statusCode = 500;
    res.end(JSON.stringify({
        error: err.message,
        sentryId: sentryId,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }));
});
async function startServer() {
    try {
        const server = app.listen(PORT, '0.0.0.0', async () => {
            console.clear();
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
            console.log(`Listening on port ${PORT}`);
            try {
                await connectDB();
                if (isDBConnected()) {
                    console.log('✅ MongoDB connection successful');
                }
                else {
                    console.error('❌ MongoDB connection not established');
                    process.exit(1);
                }
            }
            catch (dbErr) {
                console.error('❌ Failed to connect to MongoDB:', dbErr);
                process.exit(1);
            }
        });
    }
    catch (err) {
        console.error('Server startup failed:', err);
        Sentry.captureException(err);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map