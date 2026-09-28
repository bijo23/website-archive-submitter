#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r backend/requirements.txt
cd frontend
npm install
npm run build
