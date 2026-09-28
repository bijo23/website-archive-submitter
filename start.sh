#!/usr/bin/env bash
if [ -d "website-archive-submitter/backend" ]; then
  cd website-archive-submitter/backend
elif [ -d "backend" ]; then
  cd backend
fi

python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
