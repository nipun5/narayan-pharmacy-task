# narayan-pharmacy-task

## Project Overview

`narayan-pharmacy-task` is a focused pharmacy SaaS feature for prescription entry and drug-drug interaction review. The application has exactly two user-facing screens: a prescription entry form and a saved prescriptions list/detail experience.

## Tech Stack

- Backend: Django, Django REST Framework, SQLite by default
- Frontend: Next.js App Router, TypeScript, Tailwind CSS
- AI Provider: Anthropic Claude API via `ANTHROPIC_API_KEY`
- Local configuration: root `.env`, copied from `.env.example`

## Directory Architecture

```text
narayan-pharmacy-task/
  backend/
    README.md
    requirements.txt
    manage.py
    config/
      __init__.py
      settings.py
      urls.py
      wsgi.py
      asgi.py
    prescriptions/
      __init__.py
      apps.py
      migrations/
        __init__.py
  frontend/
    README.md
    package.json
    next.config.js
    tsconfig.json
    postcss.config.js
    tailwind.config.ts
    app/
      globals.css
      layout.tsx
      page.tsx
  .env.example
  .gitignore
  MEMORY.md
  setup.sh
```

## Required Screens Only

### Screen 1: Prescription Entry Form

Required fields:

- Patient name
- Doctor name
- Date
- Dynamic drug rows with Drug Name and Dosage

Required behavior:

- Submit prescription data to the backend.
- If the prescription contains only one drug, skip the Claude API call.
- For multiple drugs, call Claude to check drug-drug interactions.
- Save the prescription and AI interaction result to the database.
- Show the interaction result inline in a human-readable, polished format.
- Never display raw JSON to the user.
- API failures must produce visible, graceful error states.

### Screen 2: Prescriptions List and Detail

Required fields and behavior:

- Table of saved prescriptions showing patient, date, and drug count.
- Clicking a row opens a full prescription detail view.
- Detail view clearly shows the AI interaction warning/result.
- Detail view includes a highly visible severity badge: Mild, Moderate, or Severe.

## Explicit Scope Constraints

Do not add:

- Authentication or login
- User accounts or roles
- Inventory management
- Billing, payments, or invoices
- OCR, image upload, or prescription scanning
- Pharmacy dashboard analytics
- Doctor/patient master records beyond fields required for the prescription
- Any screens beyond the two required screens

## Backend Conventions

- Follow PEP8 and idiomatic Django naming.
- Use clear model names such as `Prescription`, `PrescriptionDrug`, and `InteractionCache`.
- Keep Claude interaction logic in a dedicated service module, not inside views.
- Read `ANTHROPIC_API_KEY` only from environment variables.
- Never hardcode secrets, demo keys, or provider credentials.
- Cache identical drug combinations using normalized drug names and dosages.
- Use migrations for all schema changes.
- Ensure prompts use specific clinical pharmacy terminology, including interaction severity, mechanism, clinical significance, monitoring recommendations, and counseling notes.

## Frontend Conventions

- Use the Next.js App Router under `frontend/app`.
- Prefer small, focused components with clear prop names.
- Use Tailwind utility classes consistently.
- Keep client-side state local unless shared state becomes necessary.
- Render user-facing AI output as formatted content, never as raw API payloads.
- Keep the UI limited to the two required workflows.

## Local Development

From the repository root:

```bash
cp .env.example .env
./setup.sh
```

Backend:

```bash
cd backend
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm run dev
```

Expected local URLs:

- Backend API: `http://127.0.0.1:8000`
- Frontend: `http://localhost:3000`

## First Implementation Milestones

1. Create backend models and migrations for prescriptions, drugs, and interaction cache.
2. Add backend API endpoints for create prescription, list prescriptions, and prescription detail.
3. Implement Claude service with single-drug skip, graceful errors, clinical prompt, and cache lookup.
4. Build the prescription entry screen.
5. Build the prescriptions list/detail screen.
6. Add focused tests for edge cases, API failures, and cache behavior.
