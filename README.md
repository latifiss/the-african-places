<div align="center">
  <img src="./public/the_african_places.svg" alt="The African Places API" width="180" />
  <h1>The African Places API</h1>
  <p>Search, discover and query places across Africa.</p>
</div>

The African Places API is a Node.js, Express, TypeScript and MongoDB service powering [theafricanplaces.com](https://theafricanplaces.com).

## Features

- Full-text place search with a bounded regex fallback.
- Prefix autocomplete.
- Nearby place discovery using MongoDB geospatial indexes.
- Single and bulk place imports.
- Optional Upstash Redis caching for public GET requests.
- JWT authentication and persistent, hashed API keys for write operations.
- Health/readiness endpoints, structured request IDs, security headers, rate limits and graceful shutdown.

## Stack

- Node.js 22+
- Express 4
- TypeScript
- MongoDB / Mongoose
- Upstash Redis REST (optional)
- Sentry (optional)

## Local development

1. Install Node.js 22 or later.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env` and configure the required values.
4. Start the development server: `npm run dev`.

Required environment variables:

```env
NODE_ENV=development
PORT=8000
DB_URI=mongodb+srv://...
DB_NAME=data
JWT_SECRET=<at-least-32-random-characters>
```

Generate a secret with `openssl rand -base64 48`. Never commit real credentials.

Optional configuration:

```env
CORS_ORIGINS=https://theafricanplaces.com,https://www.theafricanplaces.com
TRUST_PROXY=1
SENTRY_DSN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Set `TRUST_PROXY` to the exact number of trusted proxy hops for your hosting platform. Do not blindly enable trust for arbitrary proxies. Set `CORS_ORIGINS` to the exact browser origins that should call the API. With no origins configured, browser cross-origin access is disabled.

## Production build

```bash
npm install
npm run typecheck
npm run build
npm start
```

The compiled application starts from `dist/index.js`. The application requires `DB_URI` and a strong `JWT_SECRET` at startup.

## Docker

```bash
docker build -t african-places-api .
docker run --env-file .env -p 8000:8000 african-places-api
```

The container runs as the unprivileged Node user and includes a liveness health check.

## Health endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health/live` | Process liveness |
| `GET /health/ready` | Readiness; returns 503 when MongoDB is disconnected |

Use `/health/live` for container liveness and `/health/ready` for load-balancer readiness.

## API routes

| Method | Endpoint | Description | Authentication |
| --- | --- | --- | --- |
| GET | `/api/places` | List up to 100 places | Public |
| GET | `/api/places/search?q=...` | Search places | Public |
| GET | `/api/places/autocomplete?q=...` | Autocomplete | Public |
| GET | `/api/places/nearby?lat=...&lon=...&radius=5` | Nearby places | Public |
| GET | `/api/places/:id` | Get one place | Public |
| POST | `/api/auth/register` | Register | Public, rate limited |
| POST | `/api/auth/login` | Login | Public, rate limited |
| GET | `/api/auth/profile` | Current profile | Bearer token |
| POST | `/api/auth/api-key` | Generate API key | Bearer token |
| POST | `/api/places` | Create place | Bearer token or API key |
| POST | `/api/places/bulk` | Bulk import (max 5,000 records) | Bearer token or API key |

New accounts require a valid email, a name between 2 and 100 characters, and a password between 12 and 128 characters. API keys are returned once at creation and stored as SHA-256 hashes; keep the plaintext key secure.

Example authenticated write:

```bash
curl -X POST https://api.theafricanplaces.com/api/places \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"lat":5.6037,"lon":-0.1870,"name":"Accra"}'
```

Or use `X-API-Key: YOUR_API_KEY` instead of the bearer header.

## Upstash Redis caching

Caching is an optimization, never a dependency. Configure both variables to enable it:

```env
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

| Public GET endpoint | TTL |
| --- | ---: |
| `/api/places` | 10 minutes |
| `/api/places/search` | 5 minutes |
| `/api/places/autocomplete` | 5 minutes |
| `/api/places/nearby` | 3 minutes |
| `/api/places/:id` | 15 minutes |

The cache bypasses requests with authentication headers. Successful create and bulk-import operations advance the cache namespace so stale place results are not reused.

Redis operations have a short timeout. Missing credentials, timeouts, connection errors, malformed cache entries and read/write failures fall back to MongoDB. Cache status is exposed through `X-Cache: HIT`, `MISS` or `BYPASS`. Redis failure must not make an otherwise valid API request fail.

## MongoDB indexes

The place model defines a 2dsphere index for nearby queries, a weighted text index for search, and supporting coordinate/name indexes. Ensure indexes are built in the production database before relying on geospatial and full-text search. Review index builds on large collections during a planned maintenance window.

## Operations and security

- Helmet security headers and gzip compression are enabled.
- JSON bodies are limited to 2 MB; URL-encoded bodies to 256 KB.
- Place search terms are bounded and regex metacharacters are escaped.
- Nearby queries validate coordinate ranges and cap radius at 100 km.
- Database queries have execution time limits and bounded result counts.
- Authentication endpoints and the places API have rate limits.
- Errors return a request ID and generic production messages; internal exceptions are sent to Sentry when configured.
- SIGTERM and SIGINT trigger graceful HTTP, MongoDB and Sentry shutdown.
- Configure MongoDB network access, database users and least-privilege permissions in the database provider.

The in-memory rate-limit store is process-local. For multi-instance deployments, configure a shared rate-limit store before relying on rate limits as a global abuse-control boundary.

## CI

GitHub Actions runs TypeScript typechecking and the production build for pushes and pull requests.

## Contributing

1. Create a feature branch.
2. Make focused changes.
3. Run `npm run typecheck` and `npm run build`.
4. Open a pull request.

## License

MIT
