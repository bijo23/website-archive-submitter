from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class JobCreateRequest(BaseModel):
    target_domain: str
    max_depth: int = 2
    max_pages: int = 50
    simulate_mode: bool = True
    service_target: str = "simulated" # wayback_machine, archive_today, both, simulated
    rate_limit_sec: float = 1.0
    is_incremental: bool = False

class DomainSchema(BaseModel):
    id: int
    name: str
    base_url: str
    created_at: datetime
    last_scanned_at: Optional[datetime] = None
    total_urls_discovered: int
    total_urls_archived: int

    class Config:
        from_attributes = True

class DiscoveredURLSchema(BaseModel):
    id: int
    domain_id: Optional[int] = None
    job_id: int
    original_url: str
    normalized_url: str
    canonical_url: Optional[str] = None
    page_title: Optional[str] = None
    status_code: Optional[int] = None
    is_redirect: bool = False
    redirect_url: Optional[str] = None
    discovery_source: str
    is_new_url: bool = True
    status: str
    error_message: Optional[str] = None
    retry_count: int = 0
    discovered_at: datetime
    last_attempted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ArchiveProofSchema(BaseModel):
    id: int
    domain_id: Optional[int] = None
    job_id: int
    discovered_url_id: int
    proof_token: str
    original_url: str
    normalized_url: str
    provider_name: str
    snapshot_url: str
    archive_identifier: Optional[str] = None
    http_status: int
    checksum_sha256: str
    submit_timestamp: datetime
    verified: bool
    error_message: Optional[str] = None
    retry_count: int = 0
    raw_response_meta: Optional[str] = None

    class Config:
        from_attributes = True

class JobStatusSchema(BaseModel):
    id: int
    domain_id: Optional[int] = None
    target_domain: str
    max_depth: int
    max_pages: int
    simulate_mode: bool
    service_target: str
    rate_limit_sec: float
    is_incremental: bool
    status: str
    total_urls_found: int
    new_urls_found: int
    total_archived: int
    total_failed: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    urls: List[DiscoveredURLSchema] = []

    class Config:
        from_attributes = True
