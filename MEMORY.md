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

### Pending

- Decide final database engine for submission: SQLite for setup simplicity or PostgreSQL for production realism.
- Define model fields for:
  - `Prescription`
  - `PrescriptionDrug`
  - `InteractionCache`
- Decide how normalized drug combinations should be stored for stable cache keys.
- Decide whether severity should be persisted directly on prescriptions, derived from cached AI output, or both.

## Course Corrections and Bug Resolution Trails

### Pending

- Record implementation bugs, failed assumptions, and fixes here as they happen.
- Include links or filenames when a correction affects a specific area of the codebase.
