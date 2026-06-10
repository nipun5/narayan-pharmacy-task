# Narayan Pharmacy Task

A focused prescription entry and drug interaction checker built for a pharmacy workflow. The app has exactly two user-facing pages: a prescription entry page and a prescription history/detail page.

## What It Does

- Captures patient name, doctor name, prescription date, and dynamic drug rows.
- Uses Claude to assess drug-drug interactions for multi-drug prescriptions.
- Skips Claude for zero or one drug to save API credits.
- Caches normalized drug + dosage combinations to avoid repeated Claude calls.
- Displays severity clearly: `None`, `Mild`, `Moderate`, or `Severe`.
- Saves prescriptions even when Claude fails, with a visible `Error` status for review.
- Shows formatted clinical guidance in the UI, never raw Claude JSON.
- Supports deleting saved prescriptions.

## Screens

### Screen 1: Prescription Entry Form

Route:

```text
/
```

Includes:

- Patient name
- Doctor name
- Date
- Dynamic drug list with drug name and dosage
- Loading state while Claude is being called
- Inline formatted interaction result after save
- Link to prescription history

### Screen 2: Prescriptions List & Detail

Route:

```text
/prescriptions
```

Includes:

- Table of saved prescriptions
- Patient, date, drug count, severity, and status
- Row click opens a modal detail view
- Full drug list and AI interaction warning in the modal
- Delete option with confirmation

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Django, Django REST Framework |
| AI | Anthropic Python SDK |
| Database | SQLite by default |
| Frontend | Next.js App Router, TypeScript, Tailwind CSS |
| Backend Deployment | Render-ready Django config with Gunicorn |
| Frontend Deployment | Vercel-ready Next.js config |

## AI Interaction Design

Claude prompting is intentionally pharmacy-specific.

The backend uses a senior clinical pharmacist system instruction and requests deterministic JSON with:

- `severity`
- `interacting_pairs`
- `clinical_mechanisms`
- `clinical_risks`
- `recommended_pharmacist_actions`

The Claude request uses `temperature=0.0` for stable output. The backend parses the JSON, formats it into display-ready clinical text, and stores the result with the prescription.

## Caching Strategy

Before calling Claude, the backend normalizes each drug as:

```text
drug_name(dosage)
```

Then it sorts the entries alphabetically and joins them with `+`.

Example:

```text
aspirin(75mg)+warfarin(5mg)
```

This means:

- Same drug combination and dosage returns cached output.
- Changing a dosage creates a new cache key and triggers a fresh Claude call.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/prescriptions/` | List saved prescriptions |
| POST | `/api/prescriptions/` | Save prescription and run/cache interaction check |
| GET | `/api/prescriptions/<id>/` | Fetch full prescription detail |
| DELETE | `/api/prescriptions/<id>/` | Delete prescription and related drug rows |

## Environment Variables

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Required keys:

```env
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-5
DJANGO_SECRET_KEY=replace_with_local_development_secret
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Never commit `.env`.

## Local Setup In Under 5 Commands

```powershell
git clone <your-repo-url>
cd narayan-pharmacy-task
Copy-Item .env.example .env
./setup.sh
```

Then run the two apps in separate terminals.

Backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Frontend:

```powershell
cd frontend
npm run dev
```

Open:

```text
http://localhost:3000
```

Django API:

```text
http://127.0.0.1:8000/api/prescriptions/
```

The Django root URL intentionally returns 404 because the backend only exposes API endpoints.

## Deployment Notes

### Render Backend

Use the `backend` folder for the Django service.

Recommended start command:

```bash
gunicorn config.wsgi:application
```

Set environment variables in Render:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=False`
- `RENDER_EXTERNAL_HOSTNAME`

### Vercel Frontend

The frontend lives in:

```text
frontend
```

Set Vercel Root Directory to `frontend`.

Set:

```env
NEXT_PUBLIC_API_URL=https://your-render-backend-url
```

## Scope Constraints

This project intentionally does not include:

- Authentication
- Inventory
- Billing
- OCR
- Dashboards
- Patient or doctor master records
- Any extra screens beyond entry and history/detail

## AI Workflow Evidence

- `CLAUDE.md` documents project instructions for AI assistants.
- `MEMORY.md` documents prompting history, architecture decisions, and course corrections.