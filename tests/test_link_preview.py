"""Tests for prismnote.link_preview (SSRF-safe link unfurling via MudFish)."""

import sys
import types

import pytest

from prismnote.link_preview import LinkPreviewError, fetch_link_preview


class _Meta:
    def __init__(self, title=None, meta_description=None, canonical=None):
        self.title = title
        self.meta_description = meta_description
        self.canonical = canonical


class _Page:
    def __init__(self, **kwargs):
        self.url = kwargs["url"]
        self.final_url = kwargs.get("final_url", kwargs["url"])
        self.status_code = kwargs.get("status_code", 200)
        self.content_type = kwargs.get("content_type", "text/html")
        self.metadata = kwargs.get("metadata", _Meta())
        self.fetched_via = kwargs.get("fetched_via", "http")
        self.body_bytes = kwargs.get("body_bytes", 1234)

    @property
    def is_ok(self):
        return 200 <= self.status_code < 300


class _Result:
    def __init__(self, pages, errors=None):
        self.pages = pages
        self.errors = errors or []


class _Error:
    def __init__(self, url, message):
        self.url = url
        self.message = message


def _install_fake_mudfish(monkeypatch, result):
    """Install a stub `mudfish` module whose crawl() returns `result`."""

    def crawl(url, **options):
        crawl.calls.append((url, options))
        if isinstance(result, Exception):
            raise result
        return result

    crawl.calls = []
    module = types.ModuleType("mudfish")
    module.crawl = crawl
    monkeypatch.setitem(sys.modules, "mudfish", module)
    return crawl


def test_rejects_non_http_scheme():
    with pytest.raises(LinkPreviewError, match="unsupported URL scheme"):
        fetch_link_preview("file:///etc/passwd")


def test_rejects_missing_host():
    with pytest.raises(LinkPreviewError, match="must include a host"):
        fetch_link_preview("http://")


def test_missing_mudfish_raises_actionable_error(monkeypatch):
    monkeypatch.setitem(sys.modules, "mudfish", None)
    with pytest.raises(LinkPreviewError, match="prismnote\\[preview\\]"):
        fetch_link_preview("https://example.com")


def test_builds_preview_from_metadata(monkeypatch):
    page = _Page(
        url="https://example.com",
        final_url="https://example.com/home",
        metadata=_Meta(title="Example", meta_description="An example", canonical="https://example.com/"),
    )
    crawl = _install_fake_mudfish(monkeypatch, _Result([page]))

    preview = fetch_link_preview("https://example.com")

    assert preview.title == "Example"
    assert preview.description == "An example"
    assert preview.canonical == "https://example.com/"
    assert preview.final_url == "https://example.com/home"
    assert preview.ok is True
    # A preview must stay a single-URL, same-domain fetch with a bounded budget.
    _, options = crawl.calls[0]
    assert options["depth"] == 0
    assert options["max_urls"] == 1
    assert options["same_domain"] is True
    assert "allow_private_networks" not in options


def test_preview_to_dict_is_serializable(monkeypatch):
    _install_fake_mudfish(monkeypatch, _Result([_Page(url="https://example.com")]))
    preview = fetch_link_preview("https://example.com")
    as_dict = preview.to_dict()
    assert as_dict["url"] == "https://example.com"
    assert as_dict["status_code"] == 200


def test_crawl_exception_is_wrapped(monkeypatch):
    _install_fake_mudfish(monkeypatch, RuntimeError("boom"))
    with pytest.raises(LinkPreviewError, match="failed to fetch"):
        fetch_link_preview("https://example.com")


def test_no_pages_surfaces_crawl_error(monkeypatch):
    err = _Error("https://example.com", "connection refused")
    _install_fake_mudfish(monkeypatch, _Result([], errors=[err]))
    with pytest.raises(LinkPreviewError, match="connection refused"):
        fetch_link_preview("https://example.com")


def test_private_network_url_is_not_unblocked(monkeypatch):
    """The metadata host must never be fetched with private networks allowed."""
    crawl = _install_fake_mudfish(
        monkeypatch, _Result([_Page(url="http://169.254.169.254/latest/meta-data/")])
    )
    fetch_link_preview("http://169.254.169.254/latest/meta-data/")
    _, options = crawl.calls[0]
    assert options.get("allow_private_networks") is None


def _flask_client():
    pytest.importorskip("flask")
    from prismnote.server_workflow import create_flask_app

    return create_flask_app().test_client()


def test_preview_route_requires_url():
    client = _flask_client()
    resp = client.post("/preview", json={})
    assert resp.status_code == 400
    assert "url required" in resp.get_json()["message"]


def test_preview_route_returns_card(monkeypatch):
    _install_fake_mudfish(
        monkeypatch, _Result([_Page(url="https://example.com", metadata=_Meta(title="Ex"))])
    )
    client = _flask_client()
    resp = client.post("/preview", json={"url": "https://example.com"})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "ok"
    assert body["preview"]["title"] == "Ex"


def test_preview_route_reports_error(monkeypatch):
    monkeypatch.setitem(sys.modules, "mudfish", None)
    client = _flask_client()
    resp = client.post("/preview", json={"url": "https://example.com"})
    assert resp.status_code == 400
    assert "prismnote[preview]" in resp.get_json()["message"]

