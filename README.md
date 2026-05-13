# English Noting

> Never forget a word you've learned — and only review what actually matters.

An AI-powered English vocabulary app. Capture words while reading or watching, get AI-generated memory cards instantly, and review only what your brain actually needs using a smart priority score.

## What it does

- **Capture words** in one tap from any context (reading, video, conversation)
- **AI memory cards** — definition, example sentences, part of speech, CEFR level, generated asynchronously
- **Smart review queue** — Memory Priority Score (MPS) ranks words by time since last review, accuracy, confidence, failure patterns, and word frequency
- **Adaptive quiz formats** — new words get multiple choice; well-known words get fill-in-the-blank
- **Calendar view** — track daily vocabulary streaks and stats

## Project structure

```
English-noting/
├── engnoting-frontend/     # Single-page app (HTML + React via CDN, no build step)
│   ├── Eng-noting.html     # Entry point
│   ├── app.jsx             # Root component, screen routing
│   ├── screens/            # Dashboard, Library, Review, Word Detail, MPS, Settings, Auth
│   ├── sidebar.jsx         # Navigation sidebar
│   ├── capture.jsx         # Floating capture button
│   └── styles.css
│
└── engnoting-backend/      # Go REST API
    ├── cmd/api/main.go     # Entry point
    ├── internal/
    │   ├── domain/         # Core types and business rules
    │   ├── usecase/        # Application logic
    │   ├── http/           # HTTP handlers and middleware
    │   └── infrastructure/ # Database repos, AI clients, JWT
    └── migrations/         # PostgreSQL migrations
```

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, React (via CDN), plain JSX |
| Backend | Go 1.25, chi router |
| Database | PostgreSQL |
| Auth | JWT |
| AI | OpenAI GPT-4o-mini, Google Gemini, DeepSeek |

## Quick start

### Backend

**Prerequisites:** Go 1.25+, PostgreSQL 12+, [migrate CLI](https://github.com/golang-migrate/migrate)

```bash
cd engnoting-backend

# Copy and fill in env vars
cp .env.example .env

# Run database migrations
make migrate-up  # requires DATABASE_URL set in env

# Start the server (with live reload via air)
air
# or without live reload:
go run cmd/api/main.go
```

Environment variables (`.env`):

```
DATABASE_URL=postgres://user:password@localhost:5432/engnoting?sslmode=disable
AI_API_KEY=sk-your-openai-api-key
AI_PROVIDER=openai          # openai | gemini
PORT=8080
JWT_SECRET=your-secret
JWT_EXPIRE_MINUTES=60
```

Start PostgreSQL with Docker:

```bash
docker-compose up -d
```

### Frontend

No build step required. Open `engnoting-frontend/Eng-noting.html` directly in a browser, or serve it with any static file server:

```bash
cd engnoting-frontend
npx serve .
# or
python3 -m http.server 3000
```

Point the frontend API base URL to your running backend (`http://localhost:8080`).

## API overview

All endpoints require `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in, receive JWT |
| `POST` | `/api/words` | Add a new word (AI explanation is async) |
| `GET` | `/api/words` | List all words |
| `GET` | `/api/words/{id}` | Get word detail |
| `POST` | `/api/v1/reviews/session` | Start a review session |
| `GET` | `/api/v1/reviews/session/current` | Get current session item |
| `POST` | `/api/v1/reviews/submit` | Submit a review result |
| `POST` | `/api/v1/reviews/session/advance` | Skip current item |
| `GET` | `/health` | Health check |

Full API docs with request/response examples: [engnoting-backend/README.md](engnoting-backend/README.md)

## How MPS works

The Memory Priority Score (0–100) is calculated deterministically:

```
MPS = (time_factor × 30) + (accuracy_factor × 30) +
      (confidence_factor × 15) + (failure_factor × 15) +
      (frequency_factor × 10)
```

Same inputs always produce the same score — no black-box ML. Users can see exactly why each word is queued for review.

## Running tests

```bash
cd engnoting-backend
go test ./...
```

## License

MIT
