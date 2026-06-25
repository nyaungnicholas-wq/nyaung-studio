#!/usr/bin/env python3
"""Tiny static server for local dev that disables caching so edits show on reload."""
import http.server
import socketserver

PORT = 5190


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"nyaung-studio dev server on http://localhost:{PORT}")
    httpd.serve_forever()
