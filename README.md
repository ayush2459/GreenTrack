# GreenTrack — ESG Data & Emissions Review Platform

**A traceable workspace for ESG activity data, emissions records, and sustainability review workflows.**

GreenTrack is a full-stack ESG data management application built around the collection, organization, validation, and review of environmental activity records. It combines a React-based dashboard with a Django REST API to help teams manage emissions-related data, review incoming records, monitor ingestion activity, and maintain an audit trail.

The project redesigns the existing `esg-data-platform` application with a dedicated GreenTrack identity while retaining its core backend architecture and API workflows.

## Overview

GreenTrack brings ESG activity data and review operations into one workspace. Users can inspect records, track review status, review data ingestion activity, and access audit events through a unified interface.

### Key capabilities

- **ESG overview dashboard** — summary statistics, review-status counts, emission scope distribution, record categories, and recent ingestion activity.
- **Emission record management** — searchable and filterable records, detailed record inspection, review notes, and status-based workflows.
- **Review workflows** — individual and bulk approve, reject, and flag actions.
- **Data ingestion** — CSV and TXT uploads, data-source selection, format guidance, upload feedback, and ingestion history.
- **Audit trail** — a timeline of relevant source, record, and review events, with CSV export.
- **AI-assisted recommendations** — a dedicated recommendations workflow that can use configured AI providers and local rule-based fallbacks.
- **Data export** — CSV exports for supported records and audit views.
- **API-based architecture** — a Django REST backend with token authentication and organization-scoped data access.

> **Implementation note:** AI-provider availability depends on configuration and service access. Recommendations and emissions calculations should be treated according to the capabilities actually implemented and the evidence available in the application.

## Application modules

| Module | Purpose |
|---|---|
| Overview | Monitor record totals, review status, scope distribution, and ingestion activity. |
| Emission Records | Search, filter, inspect, review, and export activity records. |
| Data Ingestion | Upload supported source files and inspect ingestion results. |
| Audit Trail | Review recorded operational and workflow events. |
| AI Recommendations | Generate recommendations using configured AI services or available fallback rules. |
| Authentication | Access the application through the Django authentication workflow. |

## Technology stack

### Frontend
- React
- Vite
- React Router
- Axios
- Recharts
- Lucide icons

### Backend
- Python
- Django
- Django REST Framework
- Django REST Framework token authentication
- SQLite for local development
- PostgreSQL support through `DATABASE_URL`

### Data ingestion
- SAP-style flat-file TSV
- Utility CSV
- Corporate travel CSV

### AI integration
- Configurable AI provider integration
- Groq API support, where configured
- Optional local Ollama integration
- Rule-based fallback recommendations

The availability of a provider depends on its configuration, model availability, and network connectivity.

## Architecture

```text
┌───────────────────────────────────┐
│       React + Vite Frontend        │
│ Dashboard · Records · Ingestion    │
│ Audit Trail · AI Recommendations  │
└─────────────────┬─────────────────┘
                  │ HTTP / JSON
                  ▼
┌───────────────────────────────────┐
│          Django REST API           │
│ Authentication · Business Logic   │
│ Review Workflows · Data Ingestion  │
│ AI Recommendation Endpoint         │
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│          Data Persistence          │
│ SQLite (Local) / PostgreSQL        │
│ Organizations · Records · Audits   │
└───────────────────────────────────┘
```

The frontend communicates with the backend through HTTP API requests. The backend manages application data, organization-scoped access, review workflows, and supported ingestion operations.

## Getting started

### Prerequisites

Install the following before running the application:

- Python 3.11 or a compatible version supported by the project dependencies
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/ayush2459/GreenTrack.git
cd GreenTrack
```

### 2. Configure the backend

From the project root:

**Windows PowerShell**

```powershell
cd backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install -r requirements.txt
```

Create a `backend/.env` file using the environment variables below. Then initialize the database:

```powershell
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 8000
```

The backend API will be available at:

`http://127.0.0.1:8000/api/`

Django administration is available at:

`http://127.0.0.1:8000/admin/`

### 3. Configure the frontend

Open a second terminal:

```powershell
cd frontend

npm install
```

Create a `frontend/.env` file containing:

```env
VITE_API_URL=http://localhost:8000/api
```

Start the frontend:

```powershell
npm run dev
```

If PowerShell blocks the `npm.ps1` script, use:

```powershell
npm.cmd install
npm.cmd run dev
```

The Vite development server will print its local URL, normally:

`http://localhost:5173/`

Keep both the backend and frontend terminals running while using the application.

### 4. Demo account

The seed command is intended to create illustrative demo data and associated application setup.

- **Username:** `analyst`
- **Password:** `demo1234` — only if this credential is configured by the seed command or explicitly set in your local environment.

If the account or password differs, use the credentials configured in your database. Never rely on a demo password for a production deployment.

> **Data warning:** Demo records are illustrative. They are not independently verified emissions measurements, compliance evidence, or official sustainability disclosures.

## Environment configuration

### Backend — `backend/.env`

```env
DEBUG=True
SECRET_KEY=replace-with-a-long-random-secret
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=
```

Add the AI provider settings required by your implementation when enabling AI recommendations. Keep API keys in environment variables and never commit real credentials.

**Database configuration:** `DATABASE_URL` determines which database the backend uses. If you connect GreenTrack to an existing database, verify that its schema, migrations, organizations, users, and records are compatible before changing the database URL.

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:8000/api
```

Restart the Vite development server after changing environment variables.

## API overview

The backend exposes REST endpoints for the application's main workflows.

| Endpoint | Purpose |
|---|---|
| `/api/auth/login/` | Authentication |
| `/api/auth/me/` | Current-user information |
| `/api/auth/logout/` | Logout |
| `/api/emission-records/` | List and manage emission activity records |
| `/api/emission-records/stats/` | Aggregate record and review statistics |
| `/api/data-sources/` | Manage data sources |
| `/api/ingestion-runs/` | Inspect ingestion runs |
| `/api/review-decisions/` | Access review decisions |
| `/api/audit-events/` | Access audit events |
| `/api/ai/recommendations/` | Request AI-assisted recommendations |

The exact permissions, filters, response formats, and supported HTTP methods are determined by the backend implementation.

## Data model and ESG calculation scope

GreenTrack manages activity data, including emission scopes, categories, activity values, units, reporting periods, review statuses, and associated source information.

The current implementation focuses on **activity-data management and review traceability**.

It does not currently provide a fully implemented, versioned emissions-factor registry or verified tCO₂e calculation pipeline. Accordingly, the presence of activity values should not be interpreted as a verified carbon footprint.

Potential future extensions include:

- Versioned emissions-factor management
- Unit normalization and conversion
- Calculation of emissions in tCO₂e
- Calculation provenance and reproducibility
- Reporting-period comparisons
- Regulatory reporting exports
- Expanded role-based access control

These are proposed extensions, not claims about completed functionality.

## Security and deployment considerations

Before deploying GreenTrack to a production environment:

- Set `DEBUG=False`.
- Configure a strong, unique Django `SECRET_KEY`.
- Store database credentials and AI API keys in the hosting provider's secret manager or environment settings.
- Configure `ALLOWED_HOSTS`, CORS, and CSRF trusted origins for the actual deployment domains.
- Use a persistent database appropriate for the deployment.
- Run migrations before starting the application.
- Replace demo credentials and restrict administrative access.
- Use HTTPS for public deployments.
- Review authentication, authorization, and organization-level access controls.
- Configure logging, backups, and monitoring.
- Avoid publishing local databases, backups, secrets, or environment files to source control.

### Deployment options

**Frontend — Vercel**

The frontend includes a Vercel configuration for single-page application routing. Set `VITE_API_URL` to the deployed backend API URL before building.

**Backend — Render or another Python host**

Install dependencies from `backend/requirements.txt`, configure the required environment variables, run migrations, and start the Django application using a production WSGI server, for example:

```bash
gunicorn core.wsgi:application
```

Run the command from the `backend` directory and configure the host's persistent database and storage requirements.

## Project structure

```text
GreenTrack/
├── backend/
│   ├── accounts/
│   ├── core/
│   ├── ingestion/
│   ├── records/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
├── DECISIONS.md
├── MODEL.md
├── SOURCES.md
├── TRADEOFFS.md
├── .gitignore
└── README.md
```

## Development principles

GreenTrack is designed around a few practical principles:

- **Traceability:** preserve source context and review history where supported.
- **Data integrity:** keep activity records distinct from calculated emissions.
- **Organization isolation:** scope data access to the appropriate organization.
- **Transparency:** distinguish implemented features from planned capabilities.
- **Extensibility:** keep the frontend, API, ingestion workflows, and AI integrations modular.

## Contributing

1. Fork the repository or create a feature branch.
2. Make a focused change.
3. Test the relevant backend endpoint or frontend workflow.
4. Review the diff for secrets, local database files, and generated artifacts.
5. Submit a pull request describing the change and validation performed.

## License

A license has not yet been specified. Add a `LICENSE` file before distributing the project under an open-source license.

---

**GreenTrack** — organizing ESG activity data into traceable, reviewable workflows.
