"""
Recon Browser - High-Performance Shields Rule Matcher (v0.2.0-beta)
Inspects outbound network requests and blocks trackers, ads, and telemetry.
"""

import re
from typing import Dict, List, Optional, Set
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

class FilterEngine:
    def __init__(self):
        self.domain_suffixes: Set[str] = set()
        self.url_regexes: List[re.Pattern] = []
        self.whitelisted_domains: Set[str] = set()
        self.tracking_params = {
            "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
            "fbclid", "gclid", "_ga", "msclkid", "mc_eid"
        }

    def load_rules(self, rules_text: str):
        """Loads rules in Adblock Plus / EasyList format."""
        for raw_line in rules_text.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("!") or line.startswith("["):
                continue

            # Whitelist rule
            if line.startswith("@@"):
                pattern = line[2:]
                if pattern.startswith("||"):
                    domain = pattern[2:].rstrip("^").split("$")[0]
                    self.whitelisted_domains.add(domain.lower())
                continue

            # Domain anchor (||example.com^)
            if line.startswith("||"):
                clean = line[2:].split("$")[0].rstrip("^")
                if "/" in clean:
                    domain, path = clean.split("/", 1)
                    regex_str = r"^https?:\/\/(?:[a-z0-9-]+\.)*" + re.escape(domain) + r"\/" + re.escape(path).replace(r"\*", ".*")
                    self.url_regexes.append(re.compile(regex_str, re.IGNORECASE))
                else:
                    self.domain_suffixes.add(clean.lower())
                continue

            # Wildcard or regex pattern
            if "*" in line:
                regex_str = re.escape(line).replace(r"\*", ".*")
                self.url_regexes.append(re.compile(regex_str, re.IGNORECASE))
            else:
                self.domain_suffixes.add(line.lower())

    def should_block(self, url: str) -> bool:
        """Evaluates whether an outbound request URL should be blocked by Recon Shields."""
        parsed = urlparse(url)
        hostname = (parsed.hostname or "").lower()

        # Check whitelist first
        for w_domain in self.whitelisted_domains:
            if hostname == w_domain or hostname.endswith("." + w_domain):
                return False

        # Suffix matching
        for s_domain in self.domain_suffixes:
            if hostname == s_domain or hostname.endswith("." + s_domain):
                return True

        # Regex matching
        for pattern in self.url_regexes:
            if pattern.search(url):
                return True

        return False

    def strip_tracking_params(self, url: str) -> str:
        """Removes known invasive query parameters (e.g., fbclid, gclid, utm_*)."""
        parsed = urlparse(url)
        if not parsed.query:
            return url

        query_dict = parse_qs(parsed.query, keep_blank_values=True)
        filtered = {k: v for k, v in query_dict.items() if k.lower() not in self.tracking_params}

        clean_query = urlencode(filtered, doseq=True)
        return urlunparse(parsed._replace(query=clean_query))
