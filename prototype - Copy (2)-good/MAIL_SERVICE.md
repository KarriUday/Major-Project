# Mail Service — Real Gmail delivery

Teachers send email that arrives in the student's **Gmail inbox** (e.g. `1by23cs098@bmsit.in`).

**Setup guide:** see **[GMAIL_SETUP.md](GMAIL_SETUP.md)**

## Start everything

**Double-click `START_APP.bat`** → **http://localhost:3001/** → **Mail Center** → **Connect Gmail** (App Password required).

## Manual start

```powershell
cd server
python mail_server.py
```

Then open **http://localhost:3001/** (not the raw `index.html` file).

## Demo

1. **Faculty** → **Mail Center** → **Send email now**
2. **Student** → **Notifications** → pick your email → message appears live

## Real SMTP

Copy `server/.env.example` to `server/.env`, set Gmail/college SMTP, restart the server.

## API

| Method | Path |
|--------|------|
| GET | `/api/health` |
| GET | `/api/mail/config` |
| POST | `/api/mail/send` |
| GET | `/api/mail/history?cycle=` |
| GET | `/api/notifications?email=&cycle=` |
| GET | `/api/events?email=` (SSE live stream) |
