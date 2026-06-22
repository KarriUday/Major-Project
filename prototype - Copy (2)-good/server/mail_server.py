"""
Project Tracking System — Mail service (Python).
Serves the prototype UI + REST API + real-time SSE notifications.
Run: python mail_server.py
"""

from __future__ import annotations

import json
import os
import queue
import smtplib
import threading
import time
import uuid
from datetime import datetime, timezone
from email.mime.text import MIMEText
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
MAIL_LOG = DATA_DIR / "mail-log.json"
NOTIF_FILE = DATA_DIR / "notifications.json"
ENV_FILE = ROOT / ".env"
INDEX_HTML = ROOT.parent / "index.html"
PORT = int(os.environ.get("PORT", "3001"))

# email -> list of Queue for SSE
_sse_subscribers: dict[str, list[queue.Queue]] = {}
_lock = threading.Lock()

app = Flask(__name__)
CORS(app)


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat()


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def load_env_file() -> None:
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        os.environ[key] = val


def save_env_file(values: dict[str, str]) -> None:
    lines = [
        "# Gmail / Google Workspace SMTP (local only — do not commit this file)",
        f"SMTP_HOST={values.get('SMTP_HOST', 'smtp.gmail.com')}",
        f"SMTP_PORT={values.get('SMTP_PORT', '587')}",
        f"SMTP_SECURE={values.get('SMTP_SECURE', 'false')}",
        f"SMTP_USER={values['SMTP_USER']}",
        f"SMTP_PASS={values['SMTP_PASS']}",
        f"MAIL_FROM={values.get('MAIL_FROM', values['SMTP_USER'])}",
        "",
    ]
    ENV_FILE.write_text("\n".join(lines), encoding="utf-8")
    load_env_file()


def mask_email(email: str) -> str:
    email = normalize_email(email)
    if "@" not in email:
        return ""
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        shown = local[0] + "***"
    else:
        shown = local[0] + "***" + local[-1]
    return f"{shown}@{domain}"


def read_json(path: Path, default):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        pass
    return default


def write_json(path: Path, data) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def smtp_settings():
    host = os.environ.get("SMTP_HOST", "").strip()
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASS", "").strip()
    port = int(os.environ.get("SMTP_PORT", "587"))
    secure = os.environ.get("SMTP_SECURE", "false").lower() == "true"
    mail_from = os.environ.get("MAIL_FROM", "").strip() or (
        f"Project Tracking <{user}>" if user else "Project Tracking <noreply@college.local>"
    )
    if host and user and password:
        return {
            "mode": "configured",
            "host": host,
            "port": port,
            "secure": secure,
            "user": user,
            "password": password,
            "from": mail_from,
        }
    return {"mode": "demo", "from": "Project Tracking <demo@college.local>"}


def _safe_log(*parts: str) -> None:
    line = " ".join(str(p) for p in parts)
    try:
        print(line)
    except UnicodeEncodeError:
        print(line.encode("ascii", errors="replace").decode("ascii"))


def send_smtp(to: str, subject: str, body: str, cfg: dict) -> dict:
    if cfg["mode"] == "demo":
        _safe_log("\n--- MAIL (demo mode) ---")
        _safe_log("To:", to)
        _safe_log("Subject:", subject)
        _safe_log("Body:", body[:500])
        _safe_log("--- end ---\n")
        return {"messageId": f"demo-{int(time.time() * 1000)}", "previewUrl": None}

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    # Gmail requires From to match the authenticated account
    msg["From"] = cfg["user"]
    msg["To"] = to
    if cfg.get("from") and cfg["from"] != cfg["user"]:
        msg["Reply-To"] = cfg["from"]

    if cfg["secure"]:
        server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=30)
    else:
        server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=30)
        server.starttls()
    try:
        server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["user"], [to], msg.as_string())
        return {"messageId": f"smtp-{uuid.uuid4().hex[:12]}", "previewUrl": None}
    finally:
        try:
            server.quit()
        except Exception:
            pass


def verify_smtp_login(cfg: dict) -> None:
    if cfg["mode"] != "configured":
        raise ValueError("SMTP not configured")
    if cfg["secure"]:
        server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=30)
    else:
        server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=30)
        server.starttls()
    try:
        server.login(cfg["user"], cfg["password"])
    finally:
        try:
            server.quit()
        except Exception:
            pass


def push_sse(email: str, payload: dict) -> None:
    key = normalize_email(email)
    with _lock:
        subs = list(_sse_subscribers.get(key, []))
    for q in subs:
        try:
            q.put_nowait(payload)
        except queue.Full:
            pass


def broadcast_notification(notif: dict) -> None:
    push_sse(notif["toEmail"], {"type": "mail:received", **notif})


@app.route("/")
def serve_index():
    if INDEX_HTML.exists():
        return send_from_directory(INDEX_HTML.parent, "index.html")
    return "index.html not found", 404


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "time": now_iso()})


@app.get("/api/mail/config")
def mail_config():
    cfg = smtp_settings()
    configured = cfg["mode"] == "configured"
    hint = (
        "Gmail SMTP active — emails go to student Gmail inboxes."
        if configured
        else "Gmail not connected. Add App Password in Mail Center to send real emails."
    )
    return jsonify(
        {
            "ok": True,
            "smtpMode": cfg["mode"],
            "realEmailEnabled": configured,
            "from": cfg["from"],
            "smtpUser": mask_email(cfg["user"]) if configured else "",
            "etherealPreviewUrl": None,
            "hint": hint,
        }
    )


@app.post("/api/mail/smtp-config")
def save_smtp_config():
    data = request.get_json(force=True, silent=True) or {}
    user = (data.get("smtpUser") or data.get("email") or "").strip()
    password = (data.get("smtpPass") or data.get("appPassword") or "").strip()
    if not user or "@" not in user:
        return jsonify({"ok": False, "error": "Valid Gmail address required"}), 400
    if not password or len(password.replace(" ", "")) < 8:
        return jsonify({"ok": False, "error": "Gmail App Password required (16 characters)"}), 400

    host = (data.get("smtpHost") or "smtp.gmail.com").strip()
    port = str(data.get("smtpPort") or "587")
    secure = "true" if str(data.get("smtpSecure", "false")).lower() == "true" else "false"
    mail_from = (data.get("mailFrom") or user).strip()

    save_env_file(
        {
            "SMTP_HOST": host,
            "SMTP_PORT": port,
            "SMTP_SECURE": secure,
            "SMTP_USER": user,
            "SMTP_PASS": password.replace(" ", ""),
            "MAIL_FROM": mail_from,
        }
    )

    try:
        verify_smtp_login(smtp_settings())
    except Exception as exc:
        err = str(exc)
        if "535" in err or "Username and Password not accepted" in err:
            err = (
                "Gmail rejected login. Use an App Password (not your normal password): "
                "https://myaccount.google.com/apppasswords"
            )
        return jsonify({"ok": False, "error": err}), 400

    cfg = smtp_settings()
    return jsonify(
        {
            "ok": True,
            "smtpMode": cfg["mode"],
            "realEmailEnabled": True,
            "smtpUser": mask_email(cfg["user"]),
            "hint": "Gmail connected. Emails will arrive in student Gmail inboxes.",
        }
    )


@app.post("/api/mail/smtp-test")
def smtp_test_send():
    cfg = smtp_settings()
    if cfg["mode"] != "configured":
        return jsonify(
            {
                "ok": False,
                "error": "Connect Gmail first (App Password required).",
            }
        ), 400

    data = request.get_json(force=True, silent=True) or {}
    to = normalize_email(data.get("to") or "1by23cs098@bmsit.in")
    subject = (data.get("subject") or "Project Tracking — Gmail test").strip()
    body = (data.get("body") or (
        "Hello,\n\nIf you see this in your Gmail inbox, real email delivery is working.\n\n"
        "— Project Tracking System"
    )).strip()

    try:
        sent = send_smtp(to, subject, body, cfg)
        return jsonify(
            {
                "ok": True,
                "delivered": 1,
                "to": to,
                "messageId": sent["messageId"],
                "hint": f"Check Gmail inbox for {to} (and Spam/Promotions).",
            }
        )
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


@app.get("/api/mail/history")
def mail_history():
    cycle = request.args.get("cycle")
    log = read_json(MAIL_LOG, [])
    if cycle:
        log = [e for e in log if e.get("cycle") == cycle]
    return jsonify({"ok": True, "history": log[:100]})


@app.get("/api/notifications")
def notifications():
    email = normalize_email(request.args.get("email", ""))
    cycle = request.args.get("cycle")
    if not email:
        return jsonify({"ok": False, "error": "email query required"}), 400
    items = read_json(NOTIF_FILE, [])
    items = [n for n in items if normalize_email(n.get("toEmail")) == email]
    if cycle:
        items = [n for n in items if n.get("cycle") == cycle]
    return jsonify({"ok": True, "notifications": items[:50]})


@app.get("/api/events")
def sse_events():
    email = normalize_email(request.args.get("email", ""))
    if not email:

        def empty():
            yield "data: {\"type\":\"error\",\"message\":\"email required\"}\n\n"

        return Response(empty(), mimetype="text/event-stream")

    def stream():
        q: queue.Queue = queue.Queue(maxsize=64)
        with _lock:
            _sse_subscribers.setdefault(email, []).append(q)
        try:
            yield f"data: {json.dumps({'type': 'connected', 'email': email})}\n\n"
            while True:
                try:
                    payload = q.get(timeout=25)
                    yield f"data: {json.dumps(payload)}\n\n"
                except queue.Empty:
                    yield f"data: {json.dumps({'type': 'ping'})}\n\n"
        finally:
            with _lock:
                lst = _sse_subscribers.get(email, [])
                if q in lst:
                    lst.remove(q)

    return Response(
        stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/mail/send")
def mail_send():
    data = request.get_json(force=True, silent=True) or {}
    subject = (data.get("subject") or "").strip()
    body = (data.get("body") or "").strip()
    recipients = data.get("recipients") or []
    cycle = data.get("cycle") or "unknown"
    sender_name = data.get("senderName") or "Faculty"
    sender_role = data.get("senderRole") or "faculty"
    reminder_id = data.get("reminderId")

    if not subject:
        return jsonify({"ok": False, "error": "subject is required"}), 400
    if not body:
        return jsonify({"ok": False, "error": "body is required"}), 400
    if not recipients:
        return jsonify({"ok": False, "error": "recipients array is required"}), 400

    cfg = smtp_settings()
    if cfg["mode"] != "configured":
        return jsonify(
            {
                "ok": False,
                "error": (
                    "Real Gmail not configured. Open Mail Center → Connect Gmail "
                    "(use App Password from https://myaccount.google.com/apppasswords)."
                ),
            }
        ), 400

    batch_id = f"batch-{uuid.uuid4().hex[:10]}"
    results = []
    notifs = read_json(NOTIF_FILE, [])

    for raw in recipients:
        if isinstance(raw, str):
            to_email = normalize_email(raw)
            display = to_email
            usn = None
        else:
            to_email = normalize_email(raw.get("email") or "")
            display = raw.get("fullName") or raw.get("name") or to_email
            usn = raw.get("usn")

        if not to_email or "@" not in to_email:
            results.append({"email": raw, "status": "failed", "error": "Invalid email"})
            continue

        text_body = body + f"\n\n— {sender_name} ({sender_role})"
        notif = {
            "id": f"ntf-{uuid.uuid4().hex[:10]}",
            "batchId": batch_id,
            "cycle": cycle,
            "toEmail": to_email,
            "toName": display,
            "usn": usn,
            "subject": subject,
            "body": body,
            "senderName": sender_name,
            "senderRole": sender_role,
            "reminderId": reminder_id,
            "status": "sending",
            "createdAt": now_iso(),
            "deliveredAt": None,
            "messageId": None,
            "previewUrl": None,
            "error": None,
        }

        try:
            sent = send_smtp(to_email, subject, text_body, cfg)
            notif["status"] = "delivered"
            notif["deliveredAt"] = now_iso()
            notif["messageId"] = sent["messageId"]
            notif["previewUrl"] = sent.get("previewUrl")
            results.append(
                {
                    "email": to_email,
                    "name": display,
                    "status": "delivered",
                    "messageId": sent["messageId"],
                }
            )
        except Exception as exc:
            notif["status"] = "failed"
            notif["error"] = str(exc)
            results.append(
                {"email": to_email, "name": display, "status": "failed", "error": str(exc)}
            )

        notifs.insert(0, notif)
        write_json(NOTIF_FILE, notifs[:2000])
        broadcast_notification(notif)

    delivered = sum(1 for r in results if r.get("status") == "delivered")
    failed = len(results) - delivered
    log_entry = {
        "id": batch_id,
        "cycle": cycle,
        "subject": subject,
        "bodyPreview": body[:200],
        "senderName": sender_name,
        "senderRole": sender_role,
        "recipientCount": len(results),
        "delivered": delivered,
        "failed": failed,
        "results": results,
        "createdAt": now_iso(),
        "smtpMode": cfg["mode"],
    }
    log = read_json(MAIL_LOG, [])
    log.insert(0, log_entry)
    write_json(MAIL_LOG, log[:500])

    return jsonify(
        {
            "ok": True,
            "batchId": batch_id,
            "delivered": delivered,
            "failed": failed,
            "results": results,
            "smtpMode": cfg["mode"],
            "etherealHint": None,
            "gmailHint": "Students should check Gmail inbox and Spam folder.",
        }
    )


def main():
    load_env_file()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    cfg = smtp_settings()
    print(f"[mail] Python mail server on http://localhost:{PORT}")
    print(f"[mail] Open http://localhost:{PORT}/ in your browser")
    print(f"[mail] SMTP mode: {cfg['mode']}")
    if cfg["mode"] == "demo":
        print("[mail] Tip: copy .env.example to .env for real SMTP")
    app.run(host="0.0.0.0", port=PORT, threaded=True, debug=False)


if __name__ == "__main__":
    main()
