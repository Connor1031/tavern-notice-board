"""A small, file-backed message API using only Python's standard library."""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlsplit


MESSAGE_LOG = Path(__file__).with_name("messages.jsonl")


class MessageHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # Apply CORS to every response
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def respond(self, status, body="", content_type="text/plain; charset=utf-8"):
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def is_messages_route(self):
        if urlsplit(self.path).path == "/messages":
            return True
        self.respond(404, "Not Found: this path does not exist. Use /messages.\n")
        return False

    def do_OPTIONS(self):
        if self.is_messages_route():
            self.send_response(204)
            self.end_headers()

    def do_GET(self):
        if not self.is_messages_route():
            return
        try:
            with MESSAGE_LOG.open(encoding="utf-8") as log:
                messages = [json.loads(line) for line in log if line.strip()]
        except FileNotFoundError:
            messages = []
        except (OSError, ValueError):
            self.respond(500, "Could not read the message log.\n")
            return
        self.respond(200, json.dumps(messages), "application/json")

    def do_POST(self):
        if not self.is_messages_route():
            return
        if self.headers.get_content_type() != "application/json":
            self.respond(415, "Send the message with Content-Type: application/json.\n")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0:
                raise ValueError("Missing request body")
            notice = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeError):
            self.respond(400, "The request body must contain valid UTF-8 JSON.\n")
            return

        # Accept a json string
        message = notice.get("message") if isinstance(notice, dict) else notice
        if not isinstance(message, str) or not message.strip():
            self.respond(400, "Provide a nonempty JSON string or an object with a message string.\n")
            return
        try:
            with MESSAGE_LOG.open("a", encoding="utf-8") as log:
                log.write(json.dumps(notice) + "\n")
        except OSError:
            self.respond(500, "Could not save the message.\n")
            return
        self.respond(201)


if __name__ == "__main__":
    with HTTPServer(("localhost", 5000), MessageHandler) as server:
        print("Message API running at http://localhost:5000/messages", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
