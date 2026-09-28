#!/usr/bin/env bash
set -o errexit

# Auto-detect directory nesting if Render clones into subdirectory
if [ -d "website-archive-submitter" ]; then
  cd website-archive-submitter
fi

if [ -f "backend/requirements.txt" ]; then
  pip install -r backend/requirements.txt
elif [ -f "requirements.txt" ]; then
  pip install -r requirements.txt
fi

if [ -d "frontend" ]; then
  cd frontend
  npm install
  npm run build
fi
