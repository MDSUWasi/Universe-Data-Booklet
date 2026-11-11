"""Bridge that exposes the merged-in **Project Base** (Planetary Explorer) as a
feature of the Universe Data Booklet server.

Project Base ships its own backend package (``backend.api`` + ``backend.server``)
rooted at ``Project Base/``.  Rather than duplicating that logic, this module
loads it once and reuses its ``AppHandler`` as a *sub-handler*: the Universe
Data Booklet server forwards any ``/pb/*`` request to the Project Base handler,
which keeps the two codebases independent while presenting one unified app.

The sub-handler is *not* bound to a new socket.  Instead, a fresh Project Base
handler instance is constructed from the already-parsed request state of the
current Universe Data Booklet handler (command, path, headers, rfile/wfile) and
its ``do_GET`` is invoked directly.  This is safe because:

* GET requests carry no request body, so ``rfile`` is still at the right offset.
* Project Base's ``AppHandler`` only reads ``self.path`` / ``self.headers`` and
  writes to ``self.wfile`` -- all of which are shared with the parent handler.

Modules are loaded by *file path* (``importlib``) rather than by package name so
there is no collision with Universe Data Booklet's own ``backend`` package.

Import is guarded so the server still starts if Project Base is ever removed;
the feature simply becomes unavailable rather than breaking the whole app.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

# Repo root: this file lives at src/backend/pb_gateway.py -> parents[2]
ROOT = Path(__file__).resolve().parents[2]

# Project Base backend directory (the merged-in feature).
PB_BACKEND_DIR = ROOT / "Project Base" / "backend"
PB_FRONTEND_DIR = ROOT / "Project Base" / "frontend"
PB_PREFIX = "/pb"


def _load_module(name: str, file_path: Path):
    """Import a single Python file as ``name`` without polluting package namespaces."""
    spec = importlib.util.spec_from_file_location(name, str(file_path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {file_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def _load_project_base():
    """Import Project Base's backend stack by file path.  Returns the
    ``AppHandler`` class or raises on failure."""
    # Register the ``backend`` and ``backend.api`` packages so Project Base's
    # relative imports (``from .api import ...``) resolve correctly.
    import types

    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(PB_BACKEND_DIR)]  # type: ignore[attr-defined]
    backend_pkg.__file__ = str(PB_BACKEND_DIR / "__init__.py")
    sys.modules["backend"] = backend_pkg

    api_pkg = types.ModuleType("backend.api")
    api_pkg.__path__ = [str(PB_BACKEND_DIR / "api")]  # type: ignore[attr-defined]
    api_pkg.__file__ = str(PB_BACKEND_DIR / "api" / "__init__.py")
    sys.modules["backend.api"] = api_pkg
    backend_pkg.api = api_pkg  # type: ignore[attr-defined]

    api_dir = PB_BACKEND_DIR / "api"
    for sub in ("cache", "elevation", "weather", "tiles", "routes",
                "encyclopedia", "nasa", "opennotify", "earth_events"):
        _load_module(f"backend.api.{sub}", api_dir / f"{sub}.py")

    # Load the package __init__ last so it can re-export the submodule names.
    _load_module("backend.api", api_dir / "__init__.py")
    return _load_module("backend.server", PB_BACKEND_DIR / "server.py")


try:  # pragma: no cover - import side effects only
    _pb_server_module = _load_project_base()
    _PBAppHandler = _pb_server_module.AppHandler
    PB_AVAILABLE = True
except Exception as _exc:  # noqa: BLE001 - keep server alive on any import error
    _PB_IMPORT_ERROR = _exc
    _PBAppHandler = None  # type: ignore[assignment]
    PB_AVAILABLE = False


def _strip_pb_prefix(path: str) -> str:
    """Map a Universe Data Booklet ``/pb/...`` path onto Project Base's root."""
    if path == PB_PREFIX or path == PB_PREFIX + "/":
        return "/"
    if path.startswith(PB_PREFIX + "/"):
        return path[len(PB_PREFIX):]
    return path


def pb_handler_factory(parent_handler):
    """Build a Project Base handler that reuses ``parent_handler``'s parsed
    request state (path, headers, rfile/wfile, command).  Returns ``None`` if
    the Project Base backend could not be imported."""
    if not PB_AVAILABLE or _PBAppHandler is None:
        return None

    class PBHandler(_PBAppHandler):
        """Sub-handler that routes through Project Base's ``do_GET``.

        It does not open a new socket; it borrows the parent's already-parsed
        request attributes and writes the response back through the parent's
        ``wfile``.
        """

        server_version = "UniverseDataBooklet-PB/1.0"

        def __init__(self, parent):
            # Bypass AppHandler.__init__ (which expects a socket).  Copy the
            # parsed request state from the parent instead so Project Base's
            # do_GET can route and write the response through the same socket.
            self.request = parent.request
            self.client_address = parent.client_address
            self.server = parent.server
            self.rfile = parent.rfile
            self.wfile = parent.wfile
            self.close_connection = parent.close_connection
            self.command = parent.command
            self.path = _strip_pb_prefix(parent.path)
            self.headers = parent.headers
            # requestline / raw_requestline are normally set by
            # handle_one_request when it parses the raw request line.  Replicate
            # that so log_request() works in the sub-handler.
            self.requestline = f"{self.command} {self.path} HTTP/1.1"
            self.raw_requestline = self.requestline.encode("latin-1", "replace")
            self.headers_buffer = getattr(parent, "headers_buffer", b"")
            # Version + protocol
            self.protocol_version = getattr(parent, "protocol_version", "HTTP/1.1")
            self.request_version = self.protocol_version
            # Project Base's AppHandler sets self.directory in __init__; set it
            # here so static file resolution points at its own frontend dir.
            self.directory = str(PB_FRONTEND_DIR)

    return PBHandler(parent_handler)


__all__ = ["PB_PREFIX", "PB_FRONTEND_DIR", "PB_AVAILABLE", "pb_handler_factory"]