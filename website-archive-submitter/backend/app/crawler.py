import asyncio
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin, parse_qs, urlencode, urlunparse
import xml.etree.ElementTree as ET
import logging
import re

logger = logging.getLogger(__name__)

TRACKING_PARAMS = {'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid'}

def normalize_url(url: str) -> str:
    """
    Normalizes a URL by lowercasing host, removing fragments,
    sorting and removing tracking query parameters, and stripping trailing slashes.
    """
    url = url.strip()
    # Strip fragment
    url = url.split("#")[0]
    parsed = urlparse(url)

    scheme = parsed.scheme.lower() if parsed.scheme else 'https'
    netloc = parsed.netloc.lower()

    # Query params handling
    if parsed.query:
        query_dict = parse_qs(parsed.query, keep_blank_values=False)
        # Filter tracking params
        filtered_query = {k: v for k, v in query_dict.items() if k.lower() not in TRACKING_PARAMS}
        sorted_query = urlencode(sorted(filtered_query.items()), doseq=True)
    else:
        sorted_query = ''

    # Path handling
    path = parsed.path
    if path != '/' and path.endswith('/'):
        path = path.rstrip('/')

    normalized = urlunparse((scheme, netloc, path, parsed.params, sorted_query, ''))
    return normalized

def normalize_domain(target: str) -> tuple[str, str]:
    target = target.strip()
    if not target.startswith("http://") and not target.startswith("https://"):
        url = f"https://{target}"
    else:
        url = target
    parsed = urlparse(url)
    domain = parsed.netloc or parsed.path
    base_url = f"{parsed.scheme or 'https'}://{domain}"
    return domain.lower(), base_url.lower()

class DomainCrawler:
    def __init__(self, target: str, max_depth: int = 2, max_pages: int = 50):
        self.domain, self.base_url = normalize_domain(target)
        self.max_depth = max_depth
        self.max_pages = max_pages
        self.visited = set()
        self.discovered = []

    def is_in_domain(self, url: str) -> bool:
        try:
            parsed = urlparse(url)
            netloc = parsed.netloc.lower()
            return netloc == self.domain or netloc.endswith(f".{self.domain}") or not netloc
        except Exception:
            return False

    def is_valid_html_path(self, url: str) -> bool:
        parsed = urlparse(url)
        path = parsed.path.lower()
        ignored_exts = ('.pdf', '.jpg', '.png', '.jpeg', '.gif', '.css', '.js', '.zip', '.exe', '.svg', '.mp4', '.json', '.xml', '.ico')
        return not any(path.endswith(ext) for ext in ignored_exts)

    async def fetch_robots_txt(self, client: httpx.AsyncClient) -> list[str]:
        robots_url = f"{self.base_url}/robots.txt"
        sitemaps_found = []
        try:
            resp = await client.get(robots_url, timeout=5.0, follow_redirects=True)
            if resp.status_code == 200:
                for line in resp.text.splitlines():
                    if line.strip().lower().startswith("sitemap:"):
                        sm = line.split(":", 1)[1].strip()
                        sitemaps_found.append(sm)
        except Exception as e:
            logger.debug(f"robots.txt fetch error: {e}")
        return sitemaps_found

    async def fetch_sitemap(self, client: httpx.AsyncClient, extra_sitemaps: list[str]) -> list[str]:
        sitemap_urls = list(set([
            f"{self.base_url}/sitemap.xml",
            f"{self.base_url}/sitemap_index.xml"
        ] + extra_sitemaps))

        found_urls = []
        for sm_url in sitemap_urls:
            try:
                resp = await client.get(sm_url, timeout=6.0, follow_redirects=True)
                if resp.status_code == 200 and ("xml" in resp.headers.get("content-type", "").lower() or sm_url.endswith(".xml")):
                    root = ET.fromstring(resp.text)
                    for elem in root.iter():
                        if elem.tag.endswith("loc") and elem.text:
                            loc = elem.text.strip()
                            if self.is_in_domain(loc):
                                found_urls.append(normalize_url(loc))
            except Exception as e:
                logger.debug(f"Sitemap parse error for {sm_url}: {e}")
        return list(set(found_urls))

    async def check_and_extract(self, client: httpx.AsyncClient, url: str) -> tuple[dict, list[str]]:
        extracted_links = []
        norm_url = normalize_url(url)
        info = {
            "original_url": url,
            "normalized_url": norm_url,
            "canonical_url": None,
            "status_code": None,
            "title": "Unknown Title",
            "accessible": False,
            "is_redirect": False,
            "redirect_url": None,
            "source": "crawler"
        }
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebsiteArchiveSubmitter Engine/2.0"}
            resp = await client.get(url, headers=headers, timeout=8.0, follow_redirects=True)
            info["status_code"] = resp.status_code

            # Check redirect
            if len(resp.history) > 0:
                info["is_redirect"] = True
                info["redirect_url"] = str(resp.url)

            if resp.status_code == 200:
                info["accessible"] = True
                content_type = resp.headers.get("content-type", "").lower()
                if "text/html" in content_type:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    if soup.title and soup.title.string:
                        info["title"] = soup.title.string.strip()
                    else:
                        info["title"] = f"Page on {self.domain}"

                    # Canonical Link
                    canonical_tag = soup.find("link", rel=lambda r: r and "canonical" in r.lower())
                    if canonical_tag and canonical_tag.get("href"):
                        info["canonical_url"] = normalize_url(urljoin(url, canonical_tag["href"]))

                    # RSS/Feed Links
                    for feed in soup.find_all("link", type=re.compile(r"application/(rss|atom)\+xml")):
                        if feed.get("href"):
                            extracted_links.append(urljoin(url, feed["href"]))

                    # Internal Links
                    for a in soup.find_all("a", href=True):
                        href = a["href"].strip()
                        full_url = urljoin(url, href)
                        if self.is_in_domain(full_url) and self.is_valid_html_path(full_url):
                            extracted_links.append(normalize_url(full_url))
        except Exception as e:
            logger.debug(f"Error checking {url}: {e}")
            info["accessible"] = False

        return info, extracted_links

    async def crawl(self) -> list[dict]:
        async with httpx.AsyncClient(verify=False) as client:
            # 1. robots.txt
            extra_sitemaps = await self.fetch_robots_txt(client)

            # 2. Sitemaps
            sitemap_links = await self.fetch_sitemap(client, extra_sitemaps)
            for sm_url in sitemap_links:
                if len(self.discovered) >= self.max_pages:
                    break
                norm_sm = normalize_url(sm_url)
                if norm_sm not in self.visited:
                    self.visited.add(norm_sm)
                    info, _ = await self.check_and_extract(client, sm_url)
                    info["source"] = "sitemap"
                    if info["accessible"] and not any(d["normalized_url"] == norm_sm for d in self.discovered):
                        self.discovered.append(info)

            # 3. Recursive crawling starting at base_url
            norm_base = normalize_url(self.base_url)
            queue = [(self.base_url, 0)]
            if norm_base not in self.visited:
                self.visited.add(norm_base)

            while queue and len(self.discovered) < self.max_pages:
                curr_url, depth = queue.pop(0)
                norm_curr = normalize_url(curr_url)
                info, child_links = await self.check_and_extract(client, curr_url)

                if info["accessible"] and not any(d["normalized_url"] == norm_curr for d in self.discovered):
                    self.discovered.append(info)

                if depth < self.max_depth:
                    for child in child_links:
                        norm_child = normalize_url(child)
                        if norm_child not in self.visited and len(self.visited) < self.max_pages * 2:
                            self.visited.add(norm_child)
                            queue.append((child, depth + 1))

        return self.discovered
