from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Domain(Base):
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    base_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_scanned_at = Column(DateTime, nullable=True)
    total_urls_discovered = Column(Integer, default=0)
    total_urls_archived = Column(Integer, default=0)

    jobs = relationship("CrawlJob", back_populates="domain_rel", cascade="all, delete-orphan")
    urls = relationship("DiscoveredURL", back_populates="domain_rel", cascade="all, delete-orphan")
    proofs = relationship("ArchiveProof", back_populates="domain_rel", cascade="all, delete-orphan")

class CrawlJob(Base):
    __tablename__ = "crawl_jobs"

    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=True)
    target_domain = Column(String, index=True)
    max_depth = Column(Integer, default=2)
    max_pages = Column(Integer, default=50)
    simulate_mode = Column(Boolean, default=True)
    service_target = Column(String, default="simulated") # wayback_machine, archive_today, both, simulated
    rate_limit_sec = Column(Float, default=1.0)
    is_incremental = Column(Boolean, default=False)
    status = Column(String, default="queued") # queued, crawling, archiving, paused, completed, failed
    total_urls_found = Column(Integer, default=0)
    new_urls_found = Column(Integer, default=0)
    total_archived = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    domain_rel = relationship("Domain", back_populates="jobs")
    urls = relationship("DiscoveredURL", back_populates="job", cascade="all, delete-orphan")
    proofs = relationship("ArchiveProof", back_populates="job", cascade="all, delete-orphan")

class DiscoveredURL(Base):
    __tablename__ = "discovered_urls"

    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=True)
    job_id = Column(Integer, ForeignKey("crawl_jobs.id"))
    original_url = Column(String, index=True)
    normalized_url = Column(String, index=True)
    canonical_url = Column(String, nullable=True)
    page_title = Column(String, nullable=True)
    status_code = Column(Integer, nullable=True)
    is_redirect = Column(Boolean, default=False)
    redirect_url = Column(String, nullable=True)
    discovery_source = Column(String, default="crawler") # sitemap, crawler, canonical, feed, robots
    is_new_url = Column(Boolean, default=True)
    status = Column(String, default="discovered") # discovered, accessible, queued, submitting, archived, failed
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    discovered_at = Column(DateTime, default=datetime.utcnow)
    last_attempted_at = Column(DateTime, nullable=True)

    domain_rel = relationship("Domain", back_populates="urls")
    job = relationship("CrawlJob", back_populates="urls")
    proofs = relationship("ArchiveProof", back_populates="discovered_url", cascade="all, delete-orphan")

class ArchiveProof(Base):
    __tablename__ = "archive_proofs"

    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=True)
    job_id = Column(Integer, ForeignKey("crawl_jobs.id"))
    discovered_url_id = Column(Integer, ForeignKey("discovered_urls.id"))
    proof_token = Column(String, unique=True, index=True)
    original_url = Column(String, index=True)
    normalized_url = Column(String, index=True)
    provider_name = Column(String) # wayback_machine, archive_today, simulated_archive_service
    snapshot_url = Column(String)
    archive_identifier = Column(String, nullable=True)
    http_status = Column(Integer)
    checksum_sha256 = Column(String)
    submit_timestamp = Column(DateTime, default=datetime.utcnow)
    verified = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    raw_response_meta = Column(Text, nullable=True)

    domain_rel = relationship("Domain", back_populates="proofs")
    job = relationship("CrawlJob", back_populates="proofs")
    discovered_url = relationship("DiscoveredURL", back_populates="proofs")
