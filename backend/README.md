# GreenTrack API

Django REST API backend for the GreenTrack user interface.

```bash
python -m venv .venv
# activate the environment
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

The local SQLite database is the default. Set `DATABASE_URL` to use PostgreSQL. Auth endpoints are `/api/auth/login/`, `/api/auth/me/`, and `/api/auth/logout/`. The backend continues the repository's existing data-source, ingestion-run, emission-record review and audit-event workflow.

**Scope:** the current system records activity data and review status; a versioned emission-factor database and verified tCO₂e reporting are not yet implemented. Configure production secrets, hosts, CORS and CSRF origins before deployment.

## AI recommendations (Groq + Ollama)

The authenticated `POST /api/ai/recommendations/` endpoint builds organization-scoped evidence from emission records, recent audit events, ingestion runs, and ingestion error counts. The `provider` request field accepts `auto`, `groq`, or `ollama`. `auto` tries Groq first when `GROQ_API_KEY` is configured, then local Ollama; if neither provider is reachable, it returns transparent rule-based baseline recommendations rather than fabricating model output.

Configure these backend environment variables (never put provider keys in the React `.env`):

- `GROQ_API_KEY` — optional Groq API key
- `GROQ_MODEL` — defaults to `llama-3.3-70b-versatile`
- `OLLAMA_BASE_URL` — defaults to `http://localhost:11434`
- `OLLAMA_MODEL` — defaults to `llama3.1:8b`; pull it with `ollama pull llama3.1:8b`

The AI view and PDF report explicitly distinguish activity record counts from emissions calculations. Activity values with unlike units are not summed, and recommendations should be validated by a human reviewer.
