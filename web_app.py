#!/usr/bin/env python3
"""Web server for company-based file renaming."""

from __future__ import annotations

import argparse
import json
import mimetypes
import re
import threading
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

BASE_DIR = Path(__file__).parent
CONFIG_PATH = BASE_DIR / "company_schemes.json"
WEB_DIR = BASE_DIR / "web"

INVALID_FILENAME_CHARS = re.compile(r'[\\/:*?"<>|]+')
SCHEME_LOCK = threading.Lock()

DEFAULT_SCHEMES = {
    "Acme Design": {
        "pattern": "{client}_{project_code}_{deliverable}_{date}_{seq}",
        "fields": ["client", "project_code", "deliverable", "date"],
        "sequence_start": 1,
        "sequence_padding": 3,
    },
    "BluePeak Engineering": {
        "pattern": "{project_code}-{phase}-{drawing_type}-{seq}-{ext}",
        "fields": ["project_code", "phase", "drawing_type"],
        "sequence_start": 100,
        "sequence_padding": 4,
    },
}


class APIError(Exception):
    """API-level error with an HTTP status code."""

    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def sanitize_filename(filename: str) -> str:
    """Remove unsupported path characters and normalize whitespace."""
    cleaned = INVALID_FILENAME_CHARS.sub("-", filename).strip()
    cleaned = re.sub(r"\s+", "_", cleaned)
    cleaned = cleaned.strip(".")
    return cleaned or "untitled"


def normalize_field_name(value: str) -> str:
    """Normalize custom field names to safe placeholder identifiers."""
    normalized = value.strip().lower()
    normalized = re.sub(r"[^a-z0-9_]+", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized


def ensure_valid_schemes(raw_data: object) -> dict[str, dict[str, object]]:
    """Validate loaded config and return clean schemes."""
    if not isinstance(raw_data, dict):
        return DEFAULT_SCHEMES.copy()

    clean: dict[str, dict[str, object]] = {}
    for company_name, scheme in raw_data.items():
        if not isinstance(company_name, str) or not company_name.strip():
            continue
        if not isinstance(scheme, dict):
            continue

        pattern = str(scheme.get("pattern", "")).strip()
        if not pattern:
            continue

        raw_fields = scheme.get("fields", [])
        if isinstance(raw_fields, str):
            raw_fields = [field.strip() for field in raw_fields.split(",")]
        if not isinstance(raw_fields, list):
            raw_fields = []

        fields = []
        for field in raw_fields:
            if not isinstance(field, str):
                continue
            normalized = normalize_field_name(field)
            if normalized and normalized not in fields:
                fields.append(normalized)

        try:
            sequence_start = int(scheme.get("sequence_start", 1))
        except (TypeError, ValueError):
            sequence_start = 1
        try:
            sequence_padding = int(scheme.get("sequence_padding", 3))
        except (TypeError, ValueError):
            sequence_padding = 3

        clean[company_name.strip()] = {
            "pattern": pattern,
            "fields": fields,
            "sequence_start": max(0, sequence_start),
            "sequence_padding": max(1, sequence_padding),
        }

    return clean or DEFAULT_SCHEMES.copy()


def load_schemes() -> dict[str, dict[str, object]]:
    """Load company naming schemes from disk."""
    if not CONFIG_PATH.exists():
        save_schemes(DEFAULT_SCHEMES.copy())
        return DEFAULT_SCHEMES.copy()

    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as config_file:
            data = json.load(config_file)
    except (json.JSONDecodeError, OSError):
        data = DEFAULT_SCHEMES.copy()
        save_schemes(data)

    return ensure_valid_schemes(data)


def save_schemes(schemes: dict[str, dict[str, object]]) -> None:
    """Persist schemes to JSON config."""
    normalized = ensure_valid_schemes(schemes)
    with CONFIG_PATH.open("w", encoding="utf-8") as config_file:
        json.dump(normalized, config_file, indent=2, sort_keys=True)


def build_preview_plan(
    schemes: dict[str, dict[str, object]],
    company: str,
    folder_path: str,
    details: dict[str, str],
) -> tuple[list[dict[str, Path]], list[str]]:
    """Build rename plan and return validation errors."""
    scheme = schemes.get(company)
    if not scheme:
        return [], ["Please select a valid company scheme."]
    if not folder_path:
        return [], ["Please provide a project folder path."]

    folder = Path(folder_path)
    if not folder.exists() or not folder.is_dir():
        return [], ["Selected project folder does not exist or is not a directory."]

    files = sorted(path for path in folder.iterdir() if path.is_file())
    if not files:
        return [], ["No files found in selected folder."]

    fields = scheme.get("fields", [])
    if not isinstance(fields, list):
        fields = []
    for field_name in fields:
        field_value = details.get(str(field_name), "")
        if not str(field_value).strip():
            return [], [f"Project field '{field_name}' is required."]

    pattern = str(scheme.get("pattern", "")).strip()
    if not pattern:
        return [], ["Current company scheme has an empty pattern."]

    try:
        sequence_start = int(scheme.get("sequence_start", 1))
        sequence_padding = int(scheme.get("sequence_padding", 3))
    except (TypeError, ValueError):
        return [], ["Current company scheme has invalid sequence settings."]

    sequence_start = max(0, sequence_start)
    sequence_padding = max(1, sequence_padding)

    uses_extension_token = "{ext}" in pattern or "{ext_with_dot}" in pattern
    plan: list[dict[str, Path]] = []
    errors: list[str] = []
    seen_targets: set[str] = set()
    source_paths = set(files)

    for offset, file_path in enumerate(files):
        sequence_value = str(sequence_start + offset).zfill(sequence_padding)
        context = {
            **details,
            "seq": sequence_value,
            "company": company,
            "index": sequence_value,
            "original_name": file_path.stem,
            "original_filename": file_path.name,
            "ext": file_path.suffix.lstrip("."),
            "ext_with_dot": file_path.suffix,
        }

        try:
            proposed_name = pattern.format_map(context)
        except KeyError as exc:
            errors.append(f"Pattern references unknown field {exc}.")
            break
        except ValueError as exc:
            errors.append(f"Pattern format is invalid: {exc}")
            break

        proposed_name = sanitize_filename(proposed_name)

        if not uses_extension_token and file_path.suffix:
            has_extension = bool(Path(proposed_name).suffix)
            if not has_extension:
                proposed_name = f"{proposed_name}{file_path.suffix}"

        destination = folder / proposed_name

        if proposed_name in seen_targets:
            errors.append(f"Duplicate target filename generated: '{proposed_name}'")
            continue
        seen_targets.add(proposed_name)

        if destination.exists() and destination not in source_paths and destination != file_path:
            errors.append(f"Target '{proposed_name}' already exists and is not in the rename set.")
            continue

        plan.append({"source": file_path, "destination": destination})

    return plan, errors


def apply_rename_plan(plan: list[dict[str, Path]]) -> int:
    """Apply rename plan using temp names to avoid collisions."""
    if not plan:
        return 0

    temp_records: list[dict[str, Path]] = []
    finalized_records: list[dict[str, Path]] = []
    batch_id = uuid.uuid4().hex[:10]

    try:
        for index, item in enumerate(plan):
            source = item["source"]
            destination = item["destination"]
            if source == destination:
                finalized_records.append(
                    {
                        "original": source,
                        "temp": source,
                        "destination": destination,
                    }
                )
                continue

            temp_path = source.with_name(f".rename_tmp_{batch_id}_{index}")
            source.rename(temp_path)
            temp_records.append(
                {
                    "original": source,
                    "temp": temp_path,
                    "destination": destination,
                }
            )

        for record in temp_records:
            record["temp"].rename(record["destination"])
            finalized_records.append(record)
    except OSError:
        for record in reversed(temp_records):
            temp_path = record["temp"]
            original_path = record["original"]
            destination_path = record["destination"]

            if temp_path.exists():
                try:
                    temp_path.rename(original_path)
                except OSError:
                    pass
            elif destination_path.exists() and not original_path.exists():
                try:
                    destination_path.rename(original_path)
                except OSError:
                    pass
        raise

    return len(finalized_records)


def serialize_plan(plan: list[dict[str, Path]]) -> list[dict[str, str]]:
    """Convert path objects into JSON-safe response data."""
    return [
        {
            "source_path": str(item["source"]),
            "destination_path": str(item["destination"]),
            "source_name": item["source"].name,
            "destination_name": item["destination"].name,
        }
        for item in plan
    ]


class FileRenamerRequestHandler(BaseHTTPRequestHandler):
    """Simple API + static file handler."""

    server_version = "FileRenamerWeb/1.0"

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            if path == "/api/health":
                self._send_json(HTTPStatus.OK, {"ok": True})
                return
            if path == "/api/schemes":
                with SCHEME_LOCK:
                    schemes = load_schemes()
                self._send_json(HTTPStatus.OK, {"schemes": schemes})
                return
            self._serve_static(path)
        except APIError as exc:
            self._send_json(exc.status_code, {"error": exc.message})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            payload = self._read_json_payload()
            if path == "/api/preview":
                self._handle_preview(payload)
                return
            if path == "/api/rename":
                self._handle_rename(payload)
                return
            if path == "/api/schemes":
                self._handle_save_scheme(payload)
                return
            raise APIError(HTTPStatus.NOT_FOUND, "Route not found.")
        except APIError as exc:
            self._send_json(exc.status_code, {"error": exc.message})

    def do_DELETE(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            if not path.startswith("/api/schemes/"):
                raise APIError(HTTPStatus.NOT_FOUND, "Route not found.")

            company_name = unquote(path[len("/api/schemes/") :]).strip()
            if not company_name:
                raise APIError(HTTPStatus.BAD_REQUEST, "Company name is required.")

            with SCHEME_LOCK:
                schemes = load_schemes()
                if company_name not in schemes:
                    raise APIError(HTTPStatus.NOT_FOUND, f"No saved scheme found for '{company_name}'.")
                del schemes[company_name]
                if not schemes:
                    schemes = DEFAULT_SCHEMES.copy()
                save_schemes(schemes)

            self._send_json(
                HTTPStatus.OK,
                {
                    "message": f"Deleted scheme for '{company_name}'.",
                    "schemes": schemes,
                },
            )
        except APIError as exc:
            self._send_json(exc.status_code, {"error": exc.message})

    def log_message(self, fmt: str, *args: object) -> None:
        """Keep logs concise while still showing request activity."""
        super().log_message(fmt, *args)

    def _send_json(self, status_code: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_payload(self) -> dict[str, object]:
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            raise APIError(HTTPStatus.BAD_REQUEST, "Request body is required.")
        raw = self.rfile.read(content_length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise APIError(HTTPStatus.BAD_REQUEST, f"Invalid JSON body: {exc}") from exc
        if not isinstance(payload, dict):
            raise APIError(HTTPStatus.BAD_REQUEST, "JSON body must be an object.")
        return payload

    def _serve_static(self, request_path: str) -> None:
        relative = "index.html" if request_path in {"", "/"} else request_path.lstrip("/")
        target = (WEB_DIR / relative).resolve()
        web_root = WEB_DIR.resolve()
        try:
            target.relative_to(web_root)
        except ValueError:
            raise APIError(HTTPStatus.FORBIDDEN, "Invalid static path.")
        if target.is_dir():
            target = target / "index.html"
        if not target.exists() or not target.is_file():
            raise APIError(HTTPStatus.NOT_FOUND, "Not found.")

        mime_type, _ = mimetypes.guess_type(str(target))
        data = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{mime_type or 'application/octet-stream'}; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _handle_preview(self, payload: dict[str, object]) -> None:
        company = str(payload.get("company", "")).strip()
        folder_path = str(payload.get("folder_path", "")).strip()
        details = payload.get("details", {})
        if not isinstance(details, dict):
            raise APIError(HTTPStatus.BAD_REQUEST, "'details' must be an object.")

        cleaned_details = {str(key): str(value).strip() for key, value in details.items()}

        with SCHEME_LOCK:
            schemes = load_schemes()
        plan, errors = build_preview_plan(schemes, company, folder_path, cleaned_details)
        self._send_json(
            HTTPStatus.OK,
            {
                "plan": serialize_plan(plan),
                "errors": errors,
            },
        )

    def _handle_rename(self, payload: dict[str, object]) -> None:
        company = str(payload.get("company", "")).strip()
        folder_path = str(payload.get("folder_path", "")).strip()
        details = payload.get("details", {})
        if not isinstance(details, dict):
            raise APIError(HTTPStatus.BAD_REQUEST, "'details' must be an object.")

        cleaned_details = {str(key): str(value).strip() for key, value in details.items()}

        with SCHEME_LOCK:
            schemes = load_schemes()
        plan, errors = build_preview_plan(schemes, company, folder_path, cleaned_details)
        if errors:
            self._send_json(
                HTTPStatus.BAD_REQUEST,
                {
                    "errors": errors,
                    "plan": serialize_plan(plan),
                },
            )
            return

        try:
            renamed_count = apply_rename_plan(plan)
        except OSError as exc:
            raise APIError(HTTPStatus.INTERNAL_SERVER_ERROR, f"Error while renaming files: {exc}") from exc

        self._send_json(
            HTTPStatus.OK,
            {
                "renamed_count": renamed_count,
                "plan": serialize_plan(plan),
            },
        )

    def _handle_save_scheme(self, payload: dict[str, object]) -> None:
        company_name = str(payload.get("company", "")).strip()
        pattern = str(payload.get("pattern", "")).strip()
        fields_raw = payload.get("fields", [])
        sequence_start_raw = payload.get("sequence_start", 1)
        sequence_padding_raw = payload.get("sequence_padding", 3)

        if not company_name:
            raise APIError(HTTPStatus.BAD_REQUEST, "Company name is required.")
        if not pattern:
            raise APIError(HTTPStatus.BAD_REQUEST, "Naming pattern is required.")

        if isinstance(fields_raw, str):
            fields_parts = [part.strip() for part in fields_raw.split(",")]
        elif isinstance(fields_raw, list):
            fields_parts = [str(part).strip() for part in fields_raw]
        else:
            raise APIError(HTTPStatus.BAD_REQUEST, "'fields' must be a list or comma-separated string.")

        fields: list[str] = []
        for raw_field in fields_parts:
            normalized = normalize_field_name(raw_field)
            if normalized and normalized not in fields:
                fields.append(normalized)

        try:
            sequence_start = int(sequence_start_raw)
            sequence_padding = int(sequence_padding_raw)
        except (TypeError, ValueError) as exc:
            raise APIError(
                HTTPStatus.BAD_REQUEST,
                "Sequence start and sequence padding must be integers.",
            ) from exc

        if sequence_start < 0 or sequence_padding < 1:
            raise APIError(
                HTTPStatus.BAD_REQUEST,
                "Sequence start must be >= 0 and sequence padding must be >= 1.",
            )

        with SCHEME_LOCK:
            schemes = load_schemes()
            schemes[company_name] = {
                "pattern": pattern,
                "fields": fields,
                "sequence_start": sequence_start,
                "sequence_padding": sequence_padding,
            }
            save_schemes(schemes)

        self._send_json(
            HTTPStatus.OK,
            {
                "message": f"Saved scheme for '{company_name}'.",
                "schemes": schemes,
            },
        )


def run_server(host: str, port: int) -> None:
    """Start web server."""
    if not WEB_DIR.exists():
        raise SystemExit("Missing web directory. Ensure /web assets are present.")

    server = ThreadingHTTPServer((host, port), FileRenamerRequestHandler)
    print(f"File Renamer web server running at http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run File Renamer web app server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind (default: 127.0.0.1)")
    parser.add_argument("--port", default=8000, type=int, help="Port to bind (default: 8000)")
    args = parser.parse_args()
    run_server(args.host, args.port)


if __name__ == "__main__":
    main()
