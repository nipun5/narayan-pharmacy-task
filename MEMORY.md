# Development Memory

This file documents the collaborative development trail for `narayan-pharmacy-task`. Keep entries concise, dated, and focused on decisions that affect grading, maintainability, or future debugging.

## Deliberate Prompting History

### 2026-06-10 - Initial Scaffold Request

- Goal: scaffold the repository for a focused prescription entry and drug interaction checker.
- Key constraints captured:
  - Only two screens: prescription entry and prescriptions list/detail.
  - No auth, inventory, billing, OCR, dashboard, or unrelated pharmacy features.
  - Claude API key must come from `ANTHROPIC_API_KEY` in `.env`.
  - Single-drug prescriptions must skip the Claude API call.
  - Identical drug combinations must use cached interaction results.
  - AI output must be formatted for users, not shown as raw JSON.

## Architectural Decisions & Database Schema Trade-Offs

### 2026-06-10 - Backend Schema

- Chose SQLite for take-home setup simplicity and fast local review.
- Implemented `Prescription` for patient, doctor, date, interaction result, severity, cache flag, and API error text.
- Implemented `PrescriptionItem` instead of an inventory-style drug master table to avoid scope creep.
- Implemented `DrugInteractionCache` with a normalized sorted key so identical drug/dosage combinations do not re-call Claude.
- Persisted severity on both cache and prescription rows so list/detail screens can render badges without reparsing AI output.
- Added `interaction_status` so API failures can save as `Error` while preserving a `None` severity fallback.

### 2026-06-10 - API Shape

- Kept REST endpoints minimal:
  - `GET /api/prescriptions/`
  - `POST /api/prescriptions/`
  - `GET /api/prescriptions/<id>/`
  - `DELETE /api/prescriptions/<id>/`
- Kept Claude integration in `services.py` rather than views to preserve separation of concerns.
- Frontend receives formatted interaction text and never renders raw Claude JSON.

## Course Corrections and Bug Resolution Trails

### 2026-06-10 - Dependency Compatibility

- Initial frontend scaffold used an incompatible Next/React pair. Adjusted to Next 14.2.35 with React 18.2.0 and ESLint 8 so `npm install` resolves cleanly.
- Replaced unsupported `next.config.ts` with `next.config.js` for Next 14 compatibility.

### 2026-06-10 - Windows Encoding Issue

- `package.json` and `.env` encountered UTF-8 BOM issues on Windows.
- Rewrote affected files without BOM.
- Added a defensive `.env` fallback loader in `backend/prescriptions/services.py` to handle environment loading consistently.

### 2026-06-10 - UI Iteration

- Replaced scaffold placeholder with the two required workflows only.
- Added visible loading state, API error cards, formatted interaction cards, severity badges, collapsible detail behavior, and delete confirmation.
- Changed Screen 1 count badge from completed drugs to visible rows to avoid confusion when the blank initial row is present.
- Split the frontend into two actual pages after clarification: `/` for entry and `/prescriptions` for history/detail.
- Replaced inline collapsible detail with a modal detail view for prescription history.

### 2026-06-10 - Claude Output Tightening

- Updated the prompt to use a senior clinical pharmacist system instruction.
- Set Claude temperature to `0.0` for deterministic behavior.
- Required structured JSON from Claude, then parsed and formatted it before display so raw JSON is never shown in the UI.
- Updated the cache key format to `drug(dosage)+drug(dosage)` so dosage changes correctly trigger cache misses.

### 2026-06-10 - Backend Testing Path

- Verified one-drug submissions skip Claude and save successfully.
- Verified Django can load `ANTHROPIC_API_KEY` from `.env` without printing the secret.
- Recommended backend-first testing with PowerShell `Invoke-RestMethod` before final frontend testing.
