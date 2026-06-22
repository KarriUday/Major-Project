"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { Server } = require("socket.io");
require("dotenv").config();

const PORT = Number(process.env.PORT) || 3001;
const DATA_DIR = path.join(__dirname, "data");
const MAIL_LOG_FILE = path.join(DATA_DIR, "mail-log.json");
const NOTIF_FILE = path.join(DATA_DIR, "notifications.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw);
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

let transporter = null;
let mailFrom = process.env.MAIL_FROM || "Project Tracking <noreply@college.local>";
let smtpMode = "unconfigured"; // configured | ethereal | console
let etherealPreviewUrl = null;

async function initTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
    smtpMode = "configured";
    mailFrom = process.env.MAIL_FROM || `Project Tracking <${user}>`;
    await transporter.verify().catch((err) => {
      console.warn("[mail] SMTP verify failed:", err.message);
    });
    console.log("[mail] Using configured SMTP:", host);
    return;
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    smtpMode = "ethereal";
    mailFrom = `Project Tracking <${testAccount.user}>`;
    console.log("[mail] Demo mode: Ethereal test SMTP");
    console.log("[mail] Ethereal login:", testAccount.user);
    console.log("[mail] View sent mail at https://ethereal.email/login");
  } catch (err) {
    console.warn("[mail] Ethereal setup failed, using console-only mode:", err.message);
    transporter = {
      sendMail: async (opts) => {
        console.log("\n--- MAIL (console demo) ---");
        console.log("To:", opts.to);
        console.log("Subject:", opts.subject);
        console.log("Text:", (opts.text || "").slice(0, 500));
        console.log("--- end ---\n");
        return { messageId: "console-" + Date.now(), accepted: [].concat(opts.to) };
      },
    };
    smtpMode = "console";
    mailFrom = "Project Tracking <demo@local>";
  }
}

function loadMailLog() {
  return readJson(MAIL_LOG_FILE, []);
}

function saveMailLog(entries) {
  writeJson(MAIL_LOG_FILE, entries.slice(0, 500));
}

function loadNotifications() {
  return readJson(NOTIF_FILE, []);
}

function saveNotifications(list) {
  writeJson(NOTIF_FILE, list.slice(0, 2000));
}

function pushNotification(io, notif) {
  const list = loadNotifications();
  list.unshift(notif);
  saveNotifications(list);
  const room = "email:" + normalizeEmail(notif.toEmail);
  io.to(room).emit("mail:received", notif);
  io.emit("mail:broadcast", {
    id: notif.id,
    cycle: notif.cycle,
    subject: notif.subject,
    toEmail: notif.toEmail,
    status: notif.status,
    createdAt: notif.createdAt,
  });
}

async function sendOneEmail({ to, subject, text, html }) {
  const info = await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
    html: html || undefined,
  });
  let previewUrl = null;
  if (smtpMode === "ethereal" && nodemailer.getTestMessageUrl) {
    previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) etherealPreviewUrl = previewUrl;
  }
  return { messageId: info.messageId, previewUrl };
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: nowIso() });
});

app.get("/api/mail/config", (_req, res) => {
  res.json({
    ok: true,
    smtpMode,
    from: mailFrom,
    etherealPreviewUrl: smtpMode === "ethereal" ? etherealPreviewUrl : null,
    hint:
      smtpMode === "configured"
        ? "Real SMTP is active."
        : smtpMode === "ethereal"
          ? "Demo SMTP (Ethereal). Check server console for preview links."
          : "Console-only demo (no outbound SMTP). Real-time notifications still work.",
  });
});

app.get("/api/mail/history", (req, res) => {
  const cycle = req.query.cycle;
  let log = loadMailLog();
  if (cycle) log = log.filter((e) => e.cycle === cycle);
  res.json({ ok: true, history: log.slice(0, 100) });
});

app.get("/api/notifications", (req, res) => {
  const email = normalizeEmail(req.query.email);
  const cycle = req.query.cycle;
  if (!email) {
    return res.status(400).json({ ok: false, error: "email query required" });
  }
  let list = loadNotifications().filter((n) => normalizeEmail(n.toEmail) === email);
  if (cycle) list = list.filter((n) => n.cycle === cycle);
  res.json({ ok: true, notifications: list.slice(0, 50) });
});

app.post("/api/mail/send", async (req, res) => {
  try {
    const {
      cycle,
      subject,
      body,
      recipients,
      senderName,
      senderRole,
      reminderId,
      html,
    } = req.body || {};

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ ok: false, error: "subject is required" });
    }
    if (!body || !String(body).trim()) {
      return res.status(400).json({ ok: false, error: "body is required" });
    }
    if (!Array.isArray(recipients) || !recipients.length) {
      return res.status(400).json({ ok: false, error: "recipients array is required" });
    }

    const batchId = "batch-" + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);
    const results = [];
    const io = req.app.get("io");

    for (const raw of recipients) {
      const toEmail = normalizeEmail(raw.email || raw);
      if (!toEmail || !toEmail.includes("@")) {
        results.push({
          email: raw.email || raw,
          status: "failed",
          error: "Invalid email",
        });
        continue;
      }

      const displayName = raw.fullName || raw.name || toEmail;
      const textBody =
        String(body) +
        (senderName ? `\n\n— ${senderName}${senderRole ? ` (${senderRole})` : ""}` : "");

      const notif = {
        id: "ntf-" + Date.now().toString(36) + Math.random().toString(16).slice(2, 8),
        batchId,
        cycle: cycle || "unknown",
        toEmail,
        toName: displayName,
        usn: raw.usn || null,
        subject: String(subject).trim(),
        body: String(body).trim(),
        senderName: senderName || "Faculty",
        senderRole: senderRole || "faculty",
        reminderId: reminderId || null,
        status: "sending",
        createdAt: nowIso(),
        deliveredAt: null,
        messageId: null,
        previewUrl: null,
        error: null,
      };

      try {
        const sent = await sendOneEmail({
          to: toEmail,
          subject: notif.subject,
          text: textBody,
          html,
        });
        notif.status = "delivered";
        notif.deliveredAt = nowIso();
        notif.messageId = sent.messageId;
        notif.previewUrl = sent.previewUrl;
        results.push({
          email: toEmail,
          name: displayName,
          status: "delivered",
          messageId: sent.messageId,
          previewUrl: sent.previewUrl,
        });
      } catch (err) {
        notif.status = "failed";
        notif.error = err.message || "Send failed";
        results.push({
          email: toEmail,
          name: displayName,
          status: "failed",
          error: notif.error,
        });
      }

      pushNotification(io, notif);
    }

    const delivered = results.filter((r) => r.status === "delivered").length;
    const failed = results.length - delivered;

    const logEntry = {
      id: batchId,
      cycle: cycle || "unknown",
      subject: String(subject).trim(),
      bodyPreview: String(body).trim().slice(0, 200),
      senderName: senderName || "Faculty",
      senderRole: senderRole || "faculty",
      recipientCount: results.length,
      delivered,
      failed,
      results,
      createdAt: nowIso(),
      smtpMode,
    };
    const log = loadMailLog();
    log.unshift(logEntry);
    saveMailLog(log);

    res.json({
      ok: true,
      batchId,
      delivered,
      failed,
      results,
      smtpMode,
      etherealHint:
        smtpMode === "ethereal"
          ? "Open https://ethereal.email and log in with the credentials printed in the server console to view sent emails."
          : null,
    });
  } catch (err) {
    console.error("[mail] send error:", err);
    res.status(500).json({ ok: false, error: err.message || "Internal error" });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
});
app.set("io", io);

io.on("connection", (socket) => {
  socket.on("subscribe", (payload) => {
    const email = normalizeEmail(payload?.email);
    if (!email) return;
    const room = "email:" + email;
    socket.join(room);
    socket.data.subscribedEmail = email;
    socket.emit("subscribed", { email, room });
  });

  socket.on("unsubscribe", () => {
    const email = socket.data.subscribedEmail;
    if (email) socket.leave("email:" + email);
    socket.data.subscribedEmail = null;
  });
});

async function main() {
  ensureDataDir();
  await initTransporter();
  server.listen(PORT, () => {
    console.log(`[mail] Server running at http://localhost:${PORT}`);
    console.log(`[mail] Open index.html and ensure MAIL_API points to this URL`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
