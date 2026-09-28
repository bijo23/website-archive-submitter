import asyncio
import logging
import os
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from .database import engine, Base, get_db
from .models import Domain, CrawlJob, DiscoveredURL, ArchiveProof
from .schemas import JobCreateRequest, JobStatusSchema, ArchiveProofSchema, DiscoveredURLSchema, DomainSchema
from .crawler import DomainCrawler, normalize_domain, normalize_url
from .archiver import ArchiveSubmitter
from .exporter import export_proofs_csv, export_proofs_json, generate_proof_certificate_html

# Initialize DB tables
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Website Archive Submitter API",
    description="Automated multi-domain web-crawling, archive submission engine & permanent proof repository.",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def process_archiving_job(job_id: int):
    from .database import SessionLocal
    db = SessionLocal()
    try:
        job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
        if not job or job.status == "paused":
            return

        job.status = "crawling"
        db.commit()

        # Step 1: Crawl & discover accessible URLs
        logger.info(f"Starting crawl for job {job.id} ({job.target_domain})")
        crawler = DomainCrawler(target=job.target_domain, max_depth=job.max_depth, max_pages=job.max_pages)
        discovered_list = await crawler.crawl()

        # Find existing URLs for incremental scan mode
        existing_norm_urls = set()
        if job.domain_id:
            existing_records = db.query(DiscoveredURL.normalized_url).filter(DiscoveredURL.domain_id == job.domain_id).all()
            existing_norm_urls = {r[0] for r in existing_records}

        new_urls_count = 0
        url_objects = []

        for item in discovered_list:
            norm_u = item["normalized_url"]
            is_new = norm_u not in existing_norm_urls

            if is_new:
                new_urls_count += 1

            disc_url = DiscoveredURL(
                domain_id=job.domain_id,
                job_id=job.id,
                original_url=item["original_url"],
                normalized_url=norm_u,
                canonical_url=item.get("canonical_url"),
                page_title=item["title"],
                status_code=item["status_code"],
                is_redirect=item.get("is_redirect", False),
                redirect_url=item.get("redirect_url"),
                discovery_source=item["source"],
                is_new_url=is_new,
                status="accessible" if item["accessible"] else "inaccessible"
            )
            db.add(disc_url)
            url_objects.append(disc_url)

        job.total_urls_found = len(discovered_list)
        job.new_urls_found = new_urls_count
        job.status = "archiving"
        db.commit()

        # Update Domain stats
        if job.domain_id:
            domain_obj = db.query(Domain).filter(Domain.id == job.domain_id).first()
            if domain_obj:
                domain_obj.last_scanned_at = datetime.utcnow()
                domain_obj.total_urls_discovered += new_urls_count
                db.commit()

        # Step 2: Automated Submission Queue
        archiver = ArchiveSubmitter(
            simulate_mode=job.simulate_mode,
            service_target=job.service_target,
            rate_limit_sec=job.rate_limit_sec
        )

        archived_count = 0
        failed_count = 0

        for disc_url in url_objects:
            # Check pause status
            db.refresh(job)
            if job.status == "paused":
                logger.info(f"Job {job.id} was paused by user.")
                return

            # If incremental mode requested, skip URLs that were already archived unless forced
            if job.is_incremental and not disc_url.is_new_url:
                disc_url.status = "skipped_already_archived"
                db.commit()
                continue

            if disc_url.status != "accessible":
                continue

            disc_url.status = "submitting"
            disc_url.last_attempted_at = datetime.utcnow()
            db.commit()

            results = await archiver.submit_url(disc_url.original_url)

            all_success = True
            for res in results:
                if res["success"]:
                    proof = ArchiveProof(
                        domain_id=job.domain_id,
                        job_id=job.id,
                        discovered_url_id=disc_url.id,
                        proof_token=res["proof_token"],
                        original_url=disc_url.original_url,
                        normalized_url=disc_url.normalized_url,
                        provider_name=res["provider_name"],
                        snapshot_url=res["snapshot_url"],
                        archive_identifier=res.get("archive_identifier"),
                        http_status=res["http_status"],
                        checksum_sha256=res["checksum_sha256"],
                        verified=True,
                        raw_response_meta=res.get("raw_meta")
                    )
                    db.add(proof)
                else:
                    all_success = False

            if all_success and len(results) > 0:
                disc_url.status = "archived"
                archived_count += 1
            else:
                disc_url.status = "failed"
                disc_url.error_message = "Archival submission failed or timed out"
                failed_count += 1

            db.commit()

        job.total_archived = archived_count
        job.total_failed = failed_count
        job.status = "completed"
        job.completed_at = datetime.utcnow()

        if job.domain_id:
            domain_obj = db.query(Domain).filter(Domain.id == job.domain_id).first()
            if domain_obj:
                domain_obj.total_urls_archived += archived_count
                db.commit()

        db.commit()
        logger.info(f"Job {job.id} completed. Archived: {archived_count}, Failed: {failed_count}")

    except Exception as e:
        logger.error(f"Error executing job {job_id}: {e}")
        job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
        if job:
            job.status = "failed"
            db.commit()
    finally:
        db.close()

# API Endpoints
@app.get("/api/domains", response_model=List[DomainSchema])
def list_domains(db: Session = Depends(get_db)):
    return db.query(Domain).order_by(Domain.id.desc()).all()

@app.post("/api/jobs", response_model=JobStatusSchema)
def create_job(req: JobCreateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    dom_name, base_url = normalize_domain(req.target_domain)

    # Get or create domain record
    domain_obj = db.query(Domain).filter(Domain.name == dom_name).first()
    if not domain_obj:
        domain_obj = Domain(name=dom_name, base_url=base_url)
        db.add(domain_obj)
        db.commit()
        db.refresh(domain_obj)

    job = CrawlJob(
        domain_id=domain_obj.id,
        target_domain=req.target_domain,
        max_depth=req.max_depth,
        max_pages=req.max_pages,
        simulate_mode=req.simulate_mode,
        service_target=req.service_target,
        rate_limit_sec=req.rate_limit_sec,
        is_incremental=req.is_incremental,
        status="queued"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(process_archiving_job, job.id)
    return job

@app.get("/api/jobs", response_model=List[JobStatusSchema])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(CrawlJob).order_by(CrawlJob.id.desc()).all()

@app.get("/api/jobs/{job_id}", response_model=JobStatusSchema)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.post("/api/jobs/{job_id}/pause")
def pause_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "paused"
    db.commit()
    return {"message": f"Job #{job_id} paused", "status": job.status}

@app.post("/api/jobs/{job_id}/resume")
def resume_job(job_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "queued"
    db.commit()
    background_tasks.add_task(process_archiving_job, job.id)
    return {"message": f"Job #{job_id} resumed", "status": job.status}

@app.post("/api/jobs/{job_id}/retry")
def retry_failed_urls(job_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    failed_urls = db.query(DiscoveredURL).filter(
        DiscoveredURL.job_id == job_id,
        DiscoveredURL.status == "failed"
    ).all()

    for u in failed_urls:
        u.status = "accessible"
        u.retry_count += 1

    job.status = "queued"
    db.commit()

    background_tasks.add_task(process_archiving_job, job.id)
    return {"message": f"Retrying {len(failed_urls)} failed URLs for Job #{job_id}", "status": job.status}

@app.get("/api/proofs", response_model=List[ArchiveProofSchema])
def list_proofs(
    job_id: Optional[int] = None,
    domain_id: Optional[int] = None,
    provider: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ArchiveProof)
    if job_id:
        query = query.filter(ArchiveProof.job_id == job_id)
    if domain_id:
        query = query.filter(ArchiveProof.domain_id == domain_id)
    if provider:
        query = query.filter(ArchiveProof.provider_name == provider)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (ArchiveProof.original_url.like(s)) |
            (ArchiveProof.proof_token.like(s)) |
            (ArchiveProof.checksum_sha256.like(s))
        )
    return query.order_by(ArchiveProof.id.desc()).all()

@app.get("/api/proofs/{proof_token}", response_model=ArchiveProofSchema)
def get_proof(proof_token: str, db: Session = Depends(get_db)):
    proof = db.query(ArchiveProof).filter(ArchiveProof.proof_token == proof_token).first()
    if not proof:
        raise HTTPException(status_code=404, detail="Proof token not found")
    return proof

@app.get("/api/proofs/{proof_token}/certificate", response_class=Response)
def get_proof_certificate(proof_token: str, db: Session = Depends(get_db)):
    proof = db.query(ArchiveProof).filter(ArchiveProof.proof_token == proof_token).first()
    if not proof:
        raise HTTPException(status_code=404, detail="Proof record not found")
    html_content = generate_proof_certificate_html(proof)
    return Response(content=html_content, media_type="text/html")

@app.get("/api/proofs/export/csv", response_class=Response)
def export_csv(job_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ArchiveProof)
    if job_id:
        query = query.filter(ArchiveProof.job_id == job_id)
    proofs = query.all()
    csv_data = export_proofs_csv(proofs)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=archive_proofs.csv"}
    )

@app.get("/api/proofs/export/json", response_class=Response)
def export_json(job_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ArchiveProof)
    if job_id:
        query = query.filter(ArchiveProof.job_id == job_id)
    proofs = query.all()
    json_data = export_proofs_json(proofs)
    return Response(
        content=json_data,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=archive_proofs.json"}
    )

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_domains = db.query(Domain).count()
    total_jobs = db.query(CrawlJob).count()
    total_discovered = db.query(DiscoveredURL).count()
    total_proofs = db.query(ArchiveProof).count()
    completed_jobs = db.query(CrawlJob).filter(CrawlJob.status == "completed").count()

    success_rate = (total_proofs / total_discovered * 100) if total_discovered > 0 else 100.0

    return {
        "total_domains": total_domains,
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "total_discovered_urls": total_discovered,
        "total_archive_proofs": total_proofs,
        "success_rate_pct": round(success_rate, 1)
    }

# Serve compiled Frontend static assets with Single Page Application (SPA) catch-all handler
FRONTEND_DIST_CANDIDATES = [
    os.path.abspath("website-archive-submitter/frontend/dist"),
    os.path.abspath("frontend/dist"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist"),
    os.path.abspath("../frontend/dist"),
    os.path.abspath("../../frontend/dist"),
]

FRONTEND_DIST = None
for candidate in FRONTEND_DIST_CANDIDATES:
    if os.path.exists(candidate) and os.path.exists(os.path.join(candidate, "index.html")):
        FRONTEND_DIST = candidate
        break

if FRONTEND_DIST:
    class SPAStaticFiles(StaticFiles):
        async def get_response(self, path: str, scope):
            try:
                response = await super().get_response(path, scope)
                if response.status_code == 404 and not path.startswith("api/"):
                    response = await super().get_response("index.html", scope)
                return response
            except Exception:
                return await super().get_response("index.html", scope)

    app.mount("/", SPAStaticFiles(directory=FRONTEND_DIST, html=True), name="frontend_spa")
else:
    @app.get("/")
    def read_root():
        return {
            "service": "Website Archive Submitter API",
            "version": "2.0.0",
            "status": "online",
            "swagger_docs": "/docs",
            "notice": "Frontend dist not found. Please run npm run build in frontend directory."
        }
