# TicketBoss

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12%2B-blue)

Event ticketing with a web UI and an API that never oversells. Partners book seats in real time, and **optimistic concurrency control** guarantees the seat count stays exact even when hundreds of bookings land at the same instant.

## Features

- **Web UI** at `/`: browse events, book and cancel seats, create events, and run a "rush test" that fires many bookings at once to show the seat count stays exact.
- **Optimistic locking**: each event row has a `version`. A booking only succeeds if the version hasn't changed since it was read and enough seats remain; on a version conflict the server waits a few random milliseconds, re-reads, and retries.
- **Atomic bookings**: the seat decrement and the reservation insert happen in one transaction.
- **Cancellation**: releases seats exactly once.
- **Zero-setup schema**: tables are created automatically on startup.
- **Ready to deploy**: Render blueprint, Dockerfile, and docker-compose included.

## Tech stack

Node.js 18+ · Express · PostgreSQL · Joi · Jest + Supertest · plain HTML/CSS/JS frontend (no build step)

## Run locally

**Prerequisites:** Node.js 18+ and PostgreSQL 12+ (or Docker).

### Option 1: Docker (easiest)

```bash
docker compose up --build
```

Open http://localhost:3000.

### Option 2: Node + local Postgres

```bash
npm install
cp .env.example .env                  # then edit DB_* values
createdb ticketboss                   # or: psql -U postgres -f setup.sql
npm run dev
```

Open http://localhost:3000. The server creates the tables and seeds a demo event (`node-meetup-2025`, 500 seats) on first start.

### Tests

The tests need a running database (same `.env` settings):

```bash
npm test
```

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Server and database status |
| `GET` | `/api/events` | List events (with booking counts) |
| `POST` | `/api/events` | Create an event `{ name, totalSeats, eventId? }` |
| `GET` | `/api/events/:eventId` | Event summary |
| `GET` | `/api/events/bootstrap` | Reset the demo event (restores 500 seats, clears its bookings) |
| `POST` | `/api/reservations` | Book seats `{ partnerId, seats (1–10), eventId? }` |
| `GET` | `/api/reservations` | All reservations |
| `GET` | `/api/reservations/event/:eventId` | Reservations for one event |
| `DELETE` | `/api/reservations/:reservationId` | Cancel a booking and release its seats |

`eventId` defaults to `node-meetup-2025` when omitted from a booking.

**Responses:** `201` booked · `400` invalid input · `404` unknown event · `409` not enough seats (or still contended after retries) · `410` already cancelled.

```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"acme","seats":3}'
```

## How the concurrency control works

```sql
UPDATE events
SET available_seats = available_seats - $seats,
    version = version + 1
WHERE event_id = $id
  AND version = $versionWeRead      -- nobody changed it since we looked
  AND available_seats >= $seats     -- still enough seats
RETURNING *;
```

If no row comes back, another booking won the race. The server re-reads the event and tries again, or returns `409` if seats ran out. Because the check and the decrement are one statement, seats can never go negative.

## Deploy

### Render (free tier, one click)

1. Push this repo to GitHub.
2. In the [Render dashboard](https://dashboard.render.com): **New → Blueprint**, then pick the repo.
3. Render reads `render.yaml`, creates a Postgres database and the web service, and wires `DATABASE_URL` for you. Click **Apply**.
4. When the deploy finishes, open the `.onrender.com` URL.

The free web service sleeps after inactivity (first request takes ~30 s), and Render's free Postgres expires after 30 days unless upgraded.

### Railway

1. **New Project → Deploy from GitHub repo**, pick this repo.
2. In the project, **+ New → Database → PostgreSQL**.
3. In the web service's **Variables**, add `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` and `NODE_ENV` = `production`.
4. Under **Settings → Networking**, click **Generate Domain**.

### Any Docker host (Fly.io, a VPS, etc.)

```bash
docker build -t ticketboss .
docker run -p 3000:3000 -e DATABASE_URL=postgres://... ticketboss
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (takes priority over `DB_*`) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Individual settings for local use |
| `DB_SSL` | `true`/`false`. Defaults to on when `NODE_ENV=production` and `DATABASE_URL` is set |
| `DB_POOL_MAX` | Max DB connections (default 20; keep ≤ 10 on free database plans) |
| `PORT` | HTTP port (hosts set this automatically) |

## Project structure

```
public/            Web UI (index.html, styles.css, app.js)
src/
  app.js           Express app: API, health check, static UI
  config/          Postgres pool
  controllers/     Request handlers
  db/              schema.sql + init (auto-run on startup)
  middleware/      Validation and error handling
  models/          SQL queries
  routes/          Route table
tests/             Unit, integration, and concurrency tests
render.yaml        Render blueprint
Dockerfile         Production image
```

## License

MIT
