#!/usr/bin/env python3
"""Minimal S3-compatible startup stub for the backend container smoke test."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import sys


class StartupStorageHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def respond(self, body: bytes = b"") -> None:
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        if body:
            self.send_header("Content-Type", "application/xml")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self) -> None:
        if "location" in self.path:
            self.respond(
                b'<LocationConstraint xmlns="http://s3.amazonaws.com/doc/2006-03-01/">'
                b"us-east-1</LocationConstraint>"
            )
            return
        self.respond()

    def do_HEAD(self) -> None:
        self.respond()

    def do_PUT(self) -> None:
        self.respond()

    def log_message(self, format: str, *args: object) -> None:
        return


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 19000
    bind_address = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    ThreadingHTTPServer((bind_address, port), StartupStorageHandler).serve_forever()
