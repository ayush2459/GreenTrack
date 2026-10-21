# GreenTrack — ESG Data & Emissions Review Workspace

A redesigned full-stack web application based on the existing `esg-data-platform` repository. The product identity and frontend are reworked into GreenTrack; the original Django REST backend and its workflow/API structure are retained as far as possible.

## Product workflow

- **Overview** — summary cards for data records, review status, source categories, scope distribution, and recent ingestion runs.
- **Emission records** — searchable/filterable review queue, expanded record details, review notes, single-record and bulk approve/reject/flag actions, and CSV export.
- **Data ingestion** — drag-and-drop CSV/TXT upload, source selection and setup, format guidance, upload feedback, and recent ingestion-run history.
- **Audit trail** — filterable timeline for source, record, and review events with CSV export.
- **Access** — Django token authentication preserved from the base repository.

## Stack

- Frontend: React, Vite, React Router, Recharts, Lucide, Axios
- Backend: Django, Django REST Framework, token auth, SQLite for local development or PostgreSQL using `DATABASE_URL`
- Source formats: SAP flat-file TSV, utility CSV, corporate travel CSV

## Run locally

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Backend API: `http://127.0.0.1:8000/api/`

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
# Copy .env.example to .env.local and adjust VITE_API_URL if needed
npm run dev
```

Frontend: `http://localhost:5173`

### Demo login

- Username: `analyst`
- Password: `demo1234`

Run `python manage.py seed_demo` after migration to create demo records and data sources.

## Environment variables

Backend (`backend/.env`, optional):

```env
DEBUG=True
SECRET_KEY=replace-with-a-long-random-secret
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CSRF_TRUSTED_ORIGINS=
```

Frontend (`frontend/.env.local`):

```env
VITE_API_URL=http://localhost:8000/api
```

For production, set `DEBUG=False`, use a strong secret, configure `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, and use a managed database. Do not deploy with the demo password.

## Notes on data and feature scope

This redesign intentionally keeps the present backend's scope and API behavior. The existing backend tracks activity data, scope/category classification, review status and audit events. It **does not currently implement versioned emission factors or verified tCO₂e calculation**, so the redesigned UI focuses on traceable activity records and workflow counts rather than inventing carbon totals. Emission-factor management, reporting exports for regulatory submission, and deeper RBAC are not represented as completed capabilities.

The provided demo dataset is illustrative; do not treat demo values as measured emissions or audit evidence.

## Deployment

- Frontend: Vercel using `frontend/vercel.json` SPA rewrite. Set `VITE_API_URL` to your deployed backend API URL.
- Backend: Render or another Python host. Set the environment variables above, install `backend/requirements.txt`, and run migrations before starting `gunicorn core.wsgi:application` from the `backend` directory.

## Repository layout

```text
GreenTrack/
├── backend/   # Django REST API, parsers, models, migrations, demo seed
├── frontend/  # GreenTrack React UI
├── README.md
├── MODEL.md
├── DECISIONS.md
├── SOURCES.md
└── TRADEOFFS.md
```
