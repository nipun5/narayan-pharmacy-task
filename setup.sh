#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up narayan-pharmacy-task..."

if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo "Created .env from .env.example"
fi

echo "Installing backend dependencies..."
cd "$ROOT_DIR/backend"
python -m venv .venv

if [ -f ".venv/Scripts/activate" ]; then
  # shellcheck disable=SC1091
  source ".venv/Scripts/activate"
else
  # shellcheck disable=SC1091
  source ".venv/bin/activate"
fi

python -m pip install --upgrade pip
pip install -r requirements.txt

if [ -f "manage.py" ]; then
  python manage.py migrate
fi

echo "Installing frontend dependencies..."
cd "$ROOT_DIR/frontend"
npm install

echo "Setup complete."
echo "Backend:  cd backend && source .venv/bin/activate && python manage.py runserver"
echo "Frontend: cd frontend && npm run dev"
