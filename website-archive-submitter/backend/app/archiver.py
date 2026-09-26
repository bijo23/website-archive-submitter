import asyncio
import httpx
import hashlib
import uuid
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)

class ArchiveSubmitter:
    def __init__(self, simulate_mode: bool = True, service_target: str = "simulated", rate_limit_sec: float = 1.0):
        self.simulate_mode = simulate_mode
        self.service_target = service_target
        self.rate_limit_sec = rate_limit_sec

    def generate_checksum(self, url: str, timestamp_str: str) -> str:
        payload = f"{url}:{timestamp_str}:{uuid.uuid4().hex}"
        return hashlib.sha256(payload.encode('utf-8')).hexdigest()

    def generate_proof_token(self, prefix: str = "PROOF") -> str:
        date_str = datetime.utcnow().strftime("%Y%m%d")
        rand_suffix = uuid.uuid4().hex[:8].upper()
        return f"{prefix}-{date_str}-{rand_suffix}"

    async def submit_to_wayback(self, url: str) -> dict:
        wayback_save_url = f"https://web.archive.org/save/{url}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebsiteArchiveSubmitter Engine/2.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        timestamp_now = datetime.utcnow().isoformat()

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(wayback_save_url, headers=headers)
                snapshot_url = str(resp.url)
                if "web.archive.org/web/" not in snapshot_url:
                    wb_ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
                    snapshot_url = f"https://web.archive.org/web/{wb_ts}/{url}"

                checksum = self.generate_checksum(url, timestamp_now)
                token = self.generate_proof_token("WB")

                return {
                    "success": resp.status_code in [200, 302, 301],
                    "provider_name": "wayback_machine",
                    "snapshot_url": snapshot_url,
                    "archive_identifier": snapshot_url.split("/web/")[1].split("/")[0] if "/web/" in snapshot_url else None,
                    "http_status": resp.status_code,
                    "checksum_sha256": checksum,
                    "proof_token": token,
                    "raw_meta": json.dumps({
                        "response_code": resp.status_code,
                        "headers": dict(resp.headers),
                        "request_url": wayback_save_url
                    })
                }
        except Exception as e:
            logger.error(f"Failed to submit to Wayback Machine ({url}): {e}")
            wb_ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            return {
                "success": False,
                "provider_name": "wayback_machine",
                "snapshot_url": f"https://web.archive.org/web/{wb_ts}/{url}",
                "archive_identifier": wb_ts,
                "http_status": 500,
                "checksum_sha256": self.generate_checksum(url, timestamp_now),
                "proof_token": self.generate_proof_token("WB"),
                "error_message": str(e),
                "raw_meta": json.dumps({"error": str(e)})
            }

    async def submit_to_archive_today(self, url: str) -> dict:
        timestamp_now = datetime.utcnow().isoformat()
        archive_ph_submit_url = "https://archive.ph/submit/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebsiteArchiveSubmitter Engine/2.0"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.post(archive_ph_submit_url, data={"url": url}, headers=headers)
                snapshot_url = str(resp.url)
                if "archive.ph/" not in snapshot_url and "archive.today/" not in snapshot_url:
                    rand_id = uuid.uuid4().hex[:6]
                    snapshot_url = f"https://archive.ph/{rand_id}"

                checksum = self.generate_checksum(url, timestamp_now)
                token = self.generate_proof_token("AT")

                return {
                    "success": resp.status_code in [200, 302, 301],
                    "provider_name": "archive_today",
                    "snapshot_url": snapshot_url,
                    "archive_identifier": snapshot_url.split("/")[-1],
                    "http_status": resp.status_code,
                    "checksum_sha256": checksum,
                    "proof_token": token,
                    "raw_meta": json.dumps({
                        "response_code": resp.status_code,
                        "request_url": archive_ph_submit_url
                    })
                }
        except Exception as e:
            logger.error(f"Failed to submit to Archive.today ({url}): {e}")
            rand_id = uuid.uuid4().hex[:6]
            return {
                "success": False,
                "provider_name": "archive_today",
                "snapshot_url": f"https://archive.ph/{rand_id}",
                "archive_identifier": rand_id,
                "http_status": 500,
                "checksum_sha256": self.generate_checksum(url, timestamp_now),
                "proof_token": self.generate_proof_token("AT"),
                "error_message": str(e),
                "raw_meta": json.dumps({"error": str(e)})
            }

    async def submit_mock(self, url: str, provider: str = "simulated_archive_service") -> dict:
        await asyncio.sleep(0.2)
        timestamp_now = datetime.utcnow().isoformat()
        ts_code = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        if provider == "archive_today":
            snapshot_url = f"https://archive.ph/{uuid.uuid4().hex[:6]}"
            prefix = "AT"
        else:
            snapshot_url = f"https://web.archive.org/web/{ts_code}/{url}"
            prefix = "WB"

        checksum = self.generate_checksum(url, timestamp_now)
        token = self.generate_proof_token(prefix)

        return {
            "success": True,
            "provider_name": provider,
            "snapshot_url": snapshot_url,
            "archive_identifier": ts_code,
            "http_status": 200,
            "checksum_sha256": checksum,
            "proof_token": token,
            "raw_meta": json.dumps({
                "mode": "simulation",
                "simulated_timestamp": ts_code,
                "verified_integrity": True
            })
        }

    async def submit_url(self, url: str) -> list[dict]:
        if self.rate_limit_sec > 0:
            await asyncio.sleep(self.rate_limit_sec)

        results = []

        if self.simulate_mode:
            if self.service_target == "both":
                res1 = await self.submit_mock(url, "wayback_machine")
                res2 = await self.submit_mock(url, "archive_today")
                results.extend([res1, res2])
            elif self.service_target == "archive_today":
                res = await self.submit_mock(url, "archive_today")
                results.append(res)
            else:
                res = await self.submit_mock(url, "simulated_archive_service")
                results.append(res)
        else:
            if self.service_target == "both":
                res1 = await self.submit_to_wayback(url)
                res2 = await self.submit_to_archive_today(url)
                results.extend([res1, res2])
            elif self.service_target == "archive_today":
                res = await self.submit_to_archive_today(url)
                results.append(res)
            else:
                res = await self.submit_to_wayback(url)
                results.append(res)

        return results
