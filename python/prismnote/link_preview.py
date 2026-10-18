"""SSRF-safe link previews (unfurling) powered by MudFish.

PrismNote renders link cards for URLs dropped into notebooks. Fetching an
arbitrary user-supplied URL from the server is a textbook SSRF sink: a
malicious ``http://169.254.169.254/...`` or ``http://localhost:9200`` link
would otherwise let a notebook reach the cloud metadata service or an
internal admin port.

This module delegates the fetch to MudFish, which applies the same
hardening as its crawler -- scheme allow-list, private/loopback/link-local
address blocking, response-size and timeout caps, and a bounded budget --
so a preview request can never be turned into an SSRF primitive.

Requires the optional ``mudfish`` dependency::

    pip install "prismnote[preview]"

Example::

    from prismnote.link_preview import fetch_link_preview

    card = fetch_link_preview("https://example.com/article")
    print(card.title, card.description)
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any
from urllib.parse import urlparse

__all__ = ["LinkPreview", "LinkPreviewError", "fetch_link_preview"]


class LinkPreviewError(RuntimeError):
    """Raised when a link preview cannot be produced."""


@dataclass
class LinkPreview:
    """The metadata needed to render a link card."""

    url: str
    final_url: str
    ok: bool
    status_code: int
    content_type: str | None
    title: str | None
    description: str | None
    canonical: str | None
    fetched_via: str | None

    def to_dict(self) -> dict[str, Any]:
        """Return the preview as a plain JSON-serializable dict."""
        return asdict(self)


def _import_mudfish():
    try:
        import mudfish
    except ImportError as exc:  # pragma: no cover - depends on environment
        raise LinkPreviewError(
            "link previews require the optional 'mudfish' dependency; "
            "install it with: pip install \"prismnote[preview]\""
        ) from exc
    return mudfish


def _validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise LinkPreviewError(
            f"unsupported URL scheme {parsed.scheme!r} (expected 'http' or 'https')"
        )
    if not parsed.netloc:
        raise LinkPreviewError("URL must include a host")
    return url


def fetch_link_preview(
    url: str,
    *,
    render_js: bool = False,
    timeout_secs: int = 15,
) -> LinkPreview:
    """Fetch metadata for ``url`` with MudFish's SSRF-safe fetcher.

    Args:
        url: The absolute ``http(s)`` URL to preview.
        render_js: Render the page with a headless browser first (needed for
            client-rendered sites that set ``<head>`` metadata via JS).
        timeout_secs: Per-request timeout, capped by MudFish.

    Returns:
        A :class:`LinkPreview` describing the page.

    Raises:
        LinkPreviewError: If the URL is invalid, MudFish is not installed, or
            the fetch fails.

    Note:
        ``allow_private_networks`` is intentionally left at MudFish's default
        (``False``) so that private/loopback/link-local targets -- including
        the cloud metadata endpoint -- are rejected.
    """
    _validate_url(url)
    mudfish = _import_mudfish()

    try:
        result = mudfish.crawl(
            url,
            depth=0,
            max_urls=1,
            same_domain=True,
            render_js=render_js,
            timeout_secs=timeout_secs,
            # An explicit, user-triggered single-URL preview is not a crawl
            # subject to robots.txt path exclusions; the SSRF guards above are
            # what matter for a server-side fetch of user input.
            respect_robots=False,
        )
    except Exception as exc:  # surface a domain-specific error
        raise LinkPreviewError(f"failed to fetch {url}: {exc}") from exc

    pages = list(result.pages)
    if not pages:
        reason = result.errors[0].message if result.errors else "no page returned"
        raise LinkPreviewError(f"could not fetch {url}: {reason}")

    page = pages[0]
    meta = page.metadata
    return LinkPreview(
        url=url,
        final_url=page.final_url,
        ok=page.is_ok,
        status_code=page.status_code,
        content_type=page.content_type,
        title=meta.title,
        description=meta.meta_description,
        canonical=meta.canonical,
        fetched_via=str(page.fetched_via),
    )
