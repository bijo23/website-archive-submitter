# Website Archive Submitter & Automated Backup Repository

**Examination Assignment Implementation** | *Domain Discovery • URL Normalization • Multi-Service Archive Submission • Incremental Backups • Persistent Queues • Cryptographic Proof Repository*

---

## Examination Assignment Requirements Mapping

| Section | Requirement | Implementation Details |
| :--- | :--- | :--- |
| **1 & 2** | Python-based archiving pipeline & workflow | Async FastAPI backend + SQLite queue engine + React dashboard. |
| **3 & 4** | Single-domain & Multi-domain support | Persistent `Domain` model tracking per-domain scan history, URL queues, and global queues. |
| **5** | Advanced URL Discovery | Discovers HTML internal links, `sitemap.xml`, `robots.txt` sitemaps, canonical links (`<link rel="canonical">`), and RSS/Atom feeds. |
| **6** | URL Processing & Normalization | Strips URL fragments (`#`), lowercases hostname, strips tracking parameters (`utm_*`, `fbclid`), tracks HTTP status, and records redirects. |
| **7** | Multi-Archive Service Submissions | Integrates with **Wayback Machine** (`web.archive.org`), **Archive.today** (`archive.ph`), and a high-speed Simulated Provider with multi-target selection (`both`). |
| **8 & 18** | Automated Submission Queue & Failure Recovery | SQLite-backed persistent queue. Includes **Pause**, **Resume**, and **Retry Failed URLs** controls that survive server restarts. |
| **9** | Permanent Repository DB | SQLite schema storing original URL, normalized URL, discovery source, submission service, timestamp, snapshot URL, HTTP status, and SHA-256 hash. |
| **10 & 11**| Incremental Backup & Website Changes | Distinguishes newly discovered URLs vs previously archived URLs (`is_new_url`). Allows incremental rescanning without duplicating work. |
| **12 & 13**| Dashboard & Search Repository | Interactive React dashboard with live progress, pause/resume, search by domain/URL/hash, and provider filters. |
| **20 & 21**| Required Deliverables & Bonus Features | Includes CSV/JSON exports, printable HTML Proof Certificates, multi-service support, and full VS Code launch configurations. |

---

## Quick Start & VS Code Launch Guide

### 1. Open Workspace in VS Code
```bash
code C:\Users\Admin\.gemini\antigravity\scratch\website-archive-submitter
```

### 2. Launch Application (Press F5 in VS Code)
Press **F5** in VS Code (or select **"Full Stack (Backend + Frontend)"** under *Run & Debug*). This launches:
- **FastAPI Backend & UI**: `http://127.0.0.1:8000`
- **Vite React Frontend**: `http://localhost:3000`

---

## Project Structure

```
website-archive-submitter/
├── .vscode/
│   ├── launch.json       # Debugger configurations for VS Code (F5)
│   ├── tasks.json        # Build & launch tasks
│   └── settings.json     # Workspace settings
├── backend/
│   ├── app/
│   │   ├── main.py       # FastAPI application, Domain routes & Queue handlers
│   │   ├── crawler.py    # Sitemap, Robots.txt, Canonical & Feed URL extractor
│   │   ├── archiver.py   # Wayback Machine & Archive.today submitter
│   │   ├── database.py   # SQLAlchemy SQLite engine
│   │   ├── models.py     # Domain, Job, URL & Proof DB models
│   │   ├── schemas.py    # Pydantic schemas
│   │   └── exporter.py   # CSV, JSON & HTML Certificate generator
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React Dashboard UI Components
│   │   │   ├── Navbar.jsx
│   │   │   ├── DomainForm.jsx
│   │   │   ├── LiveMonitor.jsx
│   │   │   ├── ProofRepository.jsx
│   │   │   ├── ProofModal.jsx
│   │   │   └── Analytics.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```
