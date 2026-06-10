# narayan-pharmacy-task

Prescription Entry & Drug Interaction Checker built with Django, Django REST Framework, Next.js App Router, and Tailwind CSS.

The app is intentionally scoped to two screens only:

1. Prescription Entry Form
2. Prescriptions List and Detail View

No auth, inventory, billing, OCR, dashboards, or unrelated pharmacy workflows are included.

## Features

- Save prescriptions with patient name, doctor name, date, and drug rows.
- Skip Claude API calls when only one drug is entered.
- Use Anthropic Claude for multi-drug interaction review.
- Cache identical normalized drug combinations in SQLite.
- Show Mild, Moderate, Severe, or None severity in the UI.
- Display graceful API error messages instead of crashing the form.
- Never display raw Claude JSON in the frontend.
- Delete saved prescriptions from the list/detail workflow.

## Setup In Under 5 Commands

```powershell
git clone <your-repo-url>
cd narayan-pharmacy-task
Copy-Item .env.example .env
# Add your ANTHROPIC_API_KEY to .env
./setup.sh
```

Then run the apps in two terminals:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py runserver 127.0.0.1:8000
```

```powershell
cd frontend
npm run dev
```

Open the frontend:

```text
http://localhost:3000
```

Backend API root for prescriptions:

```text
http://127.0.0.1:8000/api/prescriptions/
```

The Django root URL `http://127.0.0.1:8000/` intentionally returns 404 because the backend only exposes API endpoints.

## Environment

Copy `.env.example` to `.env` and fill in your local key:

```env
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-5
DJANGO_SECRET_KEY=replace_with_local_development_secret
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Never commit `.env`.

## API Endpoints

- `GET /api/prescriptions/` - list saved prescriptions with patient, date, drug count, and severity.
- `POST /api/prescriptions/` - create a prescription, run/cache interaction analysis, and return the saved detail.
- `GET /api/prescriptions/<id>/` - get full prescription detail, drugs, interaction result, and severity.
- `DELETE /api/prescriptions/<id>/` - delete a prescription and its drug items.

## Project Structure

```text
backend/      Django API, models, migrations, Claude service
frontend/     Next.js App Router UI
CLAUDE.md     AI assistant project instructions
MEMORY.md     AI workflow and decision history
setup.sh      Local install and migration helper
```